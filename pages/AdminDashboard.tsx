import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { User } from '../types';
import { api } from '../lib/api';

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

type AdminStatisticsResponse = {
  totalStudents: number;
  graduatedCount: number;
  retakeRequirement: number;
  averageGPA: number;
};

type AdminMajorDistributionItem = {
  major: string;
  count: number;
};

type AdminPendingActionsResponse = {
  majorChanges: { count: number };
  creditOverloads: { count: number };
  scheduleConflicts: { count: number };
  mustResetPassword?: { count: number };
  mustResetPasswordCount?: number; // fallback if backend returns this key
};

const AdminDashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const [hoveredMajor, setHoveredMajor] = useState<string | null>(null);

  const [stats, setStats] = useState<AdminStatisticsResponse | null>(null);
  const [majors, setMajors] = useState<AdminMajorDistributionItem[]>([]);
  const [pending, setPending] = useState<AdminPendingActionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const [s, m, p] = await Promise.all([
          api.adminStatistics(),
          api.adminMajorDistribution(),
          api.adminPendingActions(),
        ]);

        if (!alive) return;
        setStats(s);
        setMajors(m ?? []);
        setPending(p);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message || 'Failed to load dashboard data');
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const majorStats = useMemo(() => {
    const colorPool = [
      'bg-blue-500',
      'bg-indigo-500',
      'bg-emerald-500',
      'bg-amber-500',
      'bg-cyan-500',
      'bg-rose-500',
      'bg-fuchsia-500',
    ];

    return (majors || []).map((item, idx) => {
      const code =
        item.major
          ?.split(' ')
          .filter(Boolean)
          .map((w) => w[0])
          .join('')
          .slice(0, 3)
          .toUpperCase() || `M${idx + 1}`;

      return {
        code,
        name: item.major,
        count: item.count,
        color: colorPool[idx % colorPool.length],
      };
    });
  }, [majors]);

  const maxCount = Math.max(1, ...majorStats.map((m) => m.count));

  const pendingMajorChanges = pending?.majorChanges?.count ?? 0;
  const pendingCreditOverloads = pending?.creditOverloads?.count ?? 0;
  const pendingScheduleConflicts = pending?.scheduleConflicts?.count ?? 0;

  return (
    <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark">
      <Sidebar user={user} onLogout={onLogout} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title="Data Management Overview" user={user} />
        <main className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
              {error}
            </div>
          )}

          <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="group relative overflow-hidden rounded-xl bg-surface-light p-6 shadow-sm transition-all hover:shadow-md dark:bg-surface-dark">
              <div className="absolute right-0 top-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-teal-50 transition-all group-hover:scale-110 dark:bg-teal-900/10"></div>
              <div className="relative z-10 flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Manual Student Entry</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Register individual student profiles directly.
                  </p>
                </div>
                <div className="rounded-lg bg-teal-100 p-3 text-primary dark:bg-teal-900/30">
                  <span className="material-icons-outlined">person_add</span>
                </div>
              </div>
              <div className="relative z-10 mt-6">
                <button className="inline-flex items-center text-sm font-medium text-primary hover:text-primary-hover">
                  Open Form <span className="material-icons-outlined ml-1 text-sm">arrow_forward</span>
                </button>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-xl bg-surface-light p-6 shadow-sm transition-all hover:shadow-md dark:bg-surface-dark">
              <div className="absolute right-0 top-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-emerald-50 transition-all group-hover:scale-110 dark:bg-emerald-900/10"></div>
              <div className="relative z-10 flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Excel Bulk Upload</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Import student lists or exam results from CSV/XLS.
                  </p>
                </div>
                <div className="rounded-lg bg-emerald-100 p-3 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                  <span className="material-icons-outlined">upload_file</span>
                </div>
              </div>
              <div className="relative z-10 mt-6">
                <button className="inline-flex items-center text-sm font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400">
                  Upload File <span className="material-icons-outlined ml-1 text-sm">arrow_forward</span>
                </button>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-xl bg-surface-light p-6 shadow-sm transition-all hover:shadow-md dark:bg-surface-dark">
              <div className="absolute right-0 top-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-purple-50 transition-all group-hover:scale-110 dark:bg-purple-900/10"></div>
              <div className="relative z-10 flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Manage Results</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Review, grade, and publish semester results.
                  </p>
                </div>
                <div className="rounded-lg bg-purple-100 p-3 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                  <span className="material-icons-outlined">grading</span>
                </div>
              </div>
              <div className="relative z-10 mt-6">
                <button className="inline-flex items-center text-sm font-medium text-purple-600 hover:text-purple-700 dark:text-purple-400">
                  View Grades <span className="material-icons-outlined ml-1 text-sm">arrow_forward</span>
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="rounded-xl bg-surface-light shadow-sm dark:bg-surface-dark lg:col-span-8 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-bold text-lg text-gray-800 dark:text-white">Student Statistics Overview</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Distribution by status and major{stats ? ` • Avg GPA: ${stats.averageGPA}` : ''}
                  </p>
                </div>
                <button className="text-sm text-primary hover:underline flex items-center gap-1">
                  <span className="material-icons-outlined text-sm">download</span> Report
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30 p-5 rounded-xl flex items-center gap-5 transition-transform hover:scale-[1.01]">
                  <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600 dark:text-green-400 shadow-sm">
                    <span className="material-icons-outlined text-2xl">school</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Graduated</p>
                    <h3 className="text-3xl font-bold text-gray-800 dark:text-white">
                      {loading ? '—' : (stats?.graduatedCount ?? 0).toLocaleString()}
                    </h3>
                    <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1 mt-1">
                      <span className="material-icons-outlined text-xs">trending_up</span> +12% this year
                    </p>
                  </div>
                </div>

                <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 p-5 rounded-xl flex items-center gap-5 transition-transform hover:scale-[1.01]">
                  <div className="p-4 bg-orange-100 dark:bg-orange-900/30 rounded-full text-orange-600 dark:text-orange-400 shadow-sm">
                    <span className="material-icons-outlined text-2xl">history_edu</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Retake Required</p>
                    <h3 className="text-3xl font-bold text-gray-800 dark:text-white">
                      {loading ? '—' : (stats?.retakeRequirement ?? 0).toLocaleString()}
                    </h3>
                    <p className="text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1 mt-1">
                      <span className="material-icons-outlined text-xs">warning</span> Action needed
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800/30 rounded-xl p-6 border border-gray-100 dark:border-gray-700">
                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-6 uppercase tracking-wider">
                  Students by Major
                </h4>

                <div className="w-full h-64 flex items-end justify-between gap-2 sm:gap-4 relative z-0">
                  {/* Y-Axis Grid Lines */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none z-[-1]">
                    {[0, 25, 50, 75, 100].map((tick, i) => (
                      <div
                        key={i}
                        className="w-full border-b border-gray-200 dark:border-gray-700 h-0 border-dashed opacity-50 relative"
                      >
                        <span className="absolute -top-2.5 left-0 text-[10px] text-gray-400">
                          {Math.round((1 - i / 4) * maxCount)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {majorStats.map((item) => {
                    const heightPercent = Math.max(10, (item.count / maxCount) * 100); // Min height 10% for visibility
                    return (
                      <div
                        key={item.code}
                        className="flex-1 flex flex-col items-center group relative h-full justify-end"
                        onMouseEnter={() => setHoveredMajor(item.code)}
                        onMouseLeave={() => setHoveredMajor(null)}
                      >
                        {/* Tooltip */}
                        <div
                          className={`absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded px-2.5 py-1.5 transition-all z-20 whitespace-nowrap shadow-lg pointer-events-none transform ${
                            hoveredMajor === item.code ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                          }`}
                        >
                          <div className="font-bold">{item.name}</div>
                          <div>{item.count} Students</div>
                          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full border-4 border-transparent border-t-gray-900"></div>
                        </div>

                        <div
                          className={`w-full max-w-[40px] sm:max-w-[50px] rounded-t-lg transition-all duration-300 relative ${item.color} ${
                            hoveredMajor === item.code ? 'opacity-100 scale-y-105' : 'opacity-85'
                          }`}
                          style={{ height: `${heightPercent}%` }}
                        ></div>
                        <span className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 mt-3 font-bold truncate w-full text-center">
                          {item.code}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-6 lg:col-span-4">
              <div className="rounded-xl bg-surface-light p-6 shadow-sm dark:bg-surface-dark">
                <h3 className="mb-4 font-semibold text-gray-800 dark:text-white">Enrollment Period</h3>
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Fall Semester 2024</span>
                  <span className="rounded bg-green-100 px-2 py-1 text-xs font-bold uppercase text-green-800 dark:bg-green-900/30 dark:text-green-400">
                    Active
                  </span>
                </div>
                <div className="relative pt-1">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-xs font-semibold text-primary">Progress</div>
                    <div className="text-right text-xs font-semibold text-primary">85%</div>
                  </div>
                  <div className="flex h-2 overflow-hidden rounded bg-cyan-100 dark:bg-slate-700">
                    <div className="flex flex-col justify-center bg-primary transition-all duration-500" style={{ width: '85%' }}></div>
                  </div>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">12 days remaining until enrollment closes.</p>
                </div>
              </div>

              <div className="flex-1 rounded-xl bg-surface-light p-6 shadow-sm dark:bg-surface-dark">
                <h3 className="mb-4 font-semibold text-gray-800 dark:text-white">Pending Approvals</h3>
                <div className="space-y-4">
                  {[
                    {
                      title: 'Major Changes',
                      time: loading ? 'loading…' : 'now',
                      desc: `${pendingMajorChanges} students requested major changes requiring dean approval.`,
                      icon: 'warning',
                      iconColor: 'text-orange-500',
                    },
                    {
                      title: 'Credit Overload',
                      time: loading ? 'loading…' : 'now',
                      desc: `${pendingCreditOverloads} students applied for extra credits this semester.`,
                      icon: 'school',
                      iconColor: 'text-cyan-600',
                    },
                    {
                      title: 'Schedule Conflicts',
                      time: loading ? 'loading…' : 'now',
                      desc: `${pendingScheduleConflicts} enrollment conflicts need review.`,
                      icon: 'error_outline',
                      iconColor: 'text-rose-500',
                    },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="flex items-start rounded-lg border border-border-light bg-gray-50 p-3 dark:border-border-dark dark:bg-slate-800/50"
                    >
                      <span className={`material-icons-outlined mt-0.5 ${item.iconColor}`}>{item.icon}</span>
                      <div className="ml-3 w-full">
                        <div className="flex justify-between">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white">{item.title}</h4>
                          <span className="text-xs text-gray-500">{item.time}</span>
                        </div>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{item.desc}</p>
                        <div className="mt-2 flex gap-2">
                          <button className="text-xs font-medium text-primary hover:text-primary-hover">Review</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <footer className="mt-8 border-t border-border-light pt-6 text-center text-xs text-gray-400 dark:border-border-dark">
            © 2024 University Course Management System. All rights reserved.
          </footer>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
