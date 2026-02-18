import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { User } from '../types';
import { api } from '../lib/api';

type Audit = {
  core_credits: { earned: number; required: number };
  elective_credits: { earned: number; required: number };
  major_specific: { earned: number; required: number };
  progress_bars?: Array<{ label: string; percentage: number; completed: number; total: number }>;
};

interface Props {
  user: User;
  onLogout: () => void;
}

const StudentDegreeAudit: React.FC<Props> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [audit, setAudit] = useState<Audit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.studentDegreeAudit();
        if (!alive) return;
        setAudit(data);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message || 'Failed to load degree audit');
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const totals = useMemo(() => {
    const req =
      (audit?.core_credits.required ?? 0) +
      (audit?.elective_credits.required ?? 0) +
      (audit?.major_specific.required ?? 0);
    const earn =
      (audit?.core_credits.earned ?? 0) +
      (audit?.elective_credits.earned ?? 0) +
      (audit?.major_specific.earned ?? 0);
    const pct = req > 0 ? Math.min(100, Math.max(0, Math.round((earn / req) * 100))) : 0;
    return { req, earn, pct };
  }, [audit]);

  return (
    <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark font-sans">
      <Sidebar user={user} onLogout={onLogout} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title="Degree Audit" user={user} />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-sm text-gray-500 hover:text-primary mb-6 transition-colors"
          >
            <span className="material-icons-outlined text-sm mr-1">arrow_back</span>
            Back to Dashboard
          </button>

          {loading ? (
            <div className="text-sm text-gray-500 dark:text-gray-400">Loading degree audit...</div>
          ) : error ? (
            <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
                <div className="text-xs font-bold uppercase text-gray-400 mb-2">Core Requirements</div>
                <div className="flex items-baseline justify-between mb-2">
                  <div className="text-2xl font-bold text-gray-800 dark:text-white">
                    {Math.round(audit!.core_credits.earned)} / {Math.round(audit!.core_credits.required)}
                  </div>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${audit!.core_credits.required > 0 ? Math.min(100, (audit!.core_credits.earned / audit!.core_credits.required) * 100) : 0}%`,
                    }}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
                <div className="text-xs font-bold uppercase text-gray-400 mb-2">Major Electives</div>
                <div className="flex items-baseline justify-between mb-2">
                  <div className="text-2xl font-bold text-gray-800 dark:text-white">
                    {Math.round(audit!.elective_credits.earned)} / {Math.round(audit!.elective_credits.required)}
                  </div>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${audit!.elective_credits.required > 0 ? Math.min(100, (audit!.elective_credits.earned / audit!.elective_credits.required) * 100) : 0}%`,
                    }}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
                <div className="text-xs font-bold uppercase text-gray-400 mb-2">General Education</div>
                <div className="flex items-baseline justify-between mb-2">
                  <div className="text-2xl font-bold text-gray-800 dark:text-white">
                    {Math.round(audit!.major_specific.earned)} / {Math.round(audit!.major_specific.required)}
                  </div>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${audit!.major_specific.required > 0 ? Math.min(100, (audit!.major_specific.earned / audit!.major_specific.required) * 100) : 0}%`,
                    }}
                  />
                </div>
              </div>

              <div className="lg:col-span-3 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
                <div className="flex items-center gap-4">
                  <div className="relative w-28 h-28">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 112 112">
                      <circle className="text-gray-100 dark:text-gray-800" cx="56" cy="56" fill="transparent" r="50" stroke="currentColor" strokeWidth="8" />
                      <circle
                        className="text-primary"
                        cx="56"
                        cy="56"
                        fill="transparent"
                        r="50"
                        stroke="currentColor"
                        strokeDasharray="314"
                        strokeDashoffset={314 - 3.14 * totals.pct}
                        strokeLinecap="round"
                        strokeWidth="8"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xl font-bold text-gray-800 dark:text-white">{totals.pct}%</span>
                      <span className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">Complete</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Total Progress</div>
                    <div className="text-2xl font-bold text-gray-800 dark:text-white">
                      {Math.round(totals.earn)} / {Math.round(totals.req)} credits
                    </div>
                  </div>
                </div>
                {audit?.progress_bars && audit.progress_bars.length > 0 && (
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {audit.progress_bars.map((pb, idx) => (
                      <div key={idx}>
                        <div className="flex justify-between text-xs md:text-sm mb-1.5">
                          <span className="font-bold text-gray-600 dark:text-gray-400">
                            {pb.label === 'Core' ? 'Core (courses)' :
                             pb.label === 'Elective' ? 'Elective (courses)' :
                             pb.label === 'Major' ? 'Major (courses)' : 'Overall (courses)'}
                          </span>
                          <span className="font-bold text-gray-900 dark:text-white">
                            {pb.completed}/{pb.total}
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                          <div
                            className={`${pb.label === 'Overall' ? 'bg-indigo-500' : 'bg-primary'} h-2 rounded-full transition-all duration-500`}
                            style={{ width: `${Math.max(0, Math.min(100, pb.percentage))}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default StudentDegreeAudit;
