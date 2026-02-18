import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { User, StudentAlert } from '../types';
import { api } from '../lib/api';
import { useNavigate } from 'react-router-dom';

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

const StudentDashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const [alerts, setAlerts] = useState<StudentAlert[]>([]);
  const [majorState, setMajorState] = useState<{ program_type?: string; selected_track?: string; selected_major?: string; status?: string; profile_major_id?: string; profile_major_track?: string } | null>(null);
  const [eligibility, setEligibility] = useState<any | null>(null);
  const [startLoading, setStartLoading] = useState(false);
  const [gpa, setGpa] = useState<number | null>(null);
  const [currentCredits, setCurrentCredits] = useState<number | null>(null);
  const [degreeAudit, setDegreeAudit] = useState<null | {
    core_credits: { earned: number; required: number };
    elective_credits: { earned: number; required: number };
    major_specific: { earned: number; required: number };
  }>(null);
  const [recent, setRecent] = useState<Array<{ title: string; sub?: string; when: Date; icon: string; color: string }>>([]);

  useEffect(() => {
    // Fetch alerts on mount
    api.studentAlerts()
      .then((data) => {
        if (Array.isArray(data)) setAlerts(data);
      })
      .catch((err) => console.error("Failed to fetch alerts", err));
    api.studentAnnouncements()
      .then((anns) => {
        try {
          const annItems = (anns || []).slice(0, 10).map((a: any) => ({
            title: a.title || "Announcement",
            sub: (a.content || "").slice(0, 80),
            when: new Date(a.date_posted || a.created_at || Date.now()),
            icon: "campaign",
            color: "bg-teal-100 text-teal-600",
          }));
          const alertItems = (Array.isArray(alerts) ? alerts : []).slice(0, 10).map((al: any) => ({
            title: "New Alert",
            sub: al.message || "",
            when: new Date(al.created_at || Date.now()),
            icon: "notifications",
            color: "bg-amber-100 text-amber-600",
          }));
          const merged = [...annItems, ...alertItems].sort((a, b) => b.when.getTime() - a.when.getTime()).slice(0, 10);
          setRecent(merged);
        } catch {
          setRecent([]);
        }
      })
      .catch(() => setRecent([]));
    api.studentMajorState()
      .then((st) => setMajorState(st))
      .catch(() => setMajorState(null));
    api.studentMajorEligibility()
      .then((el) => setEligibility(el))
      .catch(() => setEligibility(null));
    api.studentDashboardSummary()
      .then((sum) => {
        if (sum && typeof sum.gpa === "number") setGpa(sum.gpa);
      })
      .catch(() => {});
    api.studentDegreeAudit()
      .then((audit) => setDegreeAudit(audit))
      .catch(() => setDegreeAudit(null));
    api.currentStudentCourses()
      .then((resp) => {
        if (resp && typeof resp.total_credits === "number") setCurrentCredits(resp.total_credits);
      })
      .catch(() => {});
  }, []); 

  const handleDismissAlert = async (id: string) => {
    try {
      await api.studentDeleteAlert(id);
      setAlerts((prev) => prev.filter((a) => a._id !== id));
    } catch (err) {
      console.error("Failed to dismiss alert", err);
    }
  };

  const navigate = useNavigate();
  const startMajorProcess = async () => {
    setStartLoading(true);
    try {
      navigate("/student/progress/current");
    } finally {
      setStartLoading(false);
    }
  };
  const isEarlyYears = (eligibility?.current_year_num ?? 99) <= 2;
  const isLockedPhase =
    eligibility?.program_type === "5-year" &&
    ((eligibility?.current_year_num === 4 && eligibility?.current_semester_num === 2) ||
      eligibility?.current_year_num === 5);
  return (
    <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark font-poppins relative">
      {/* Toast Container */}
      <div className="fixed top-24 right-6 z-50 flex flex-col gap-3 max-w-sm w-full">
        {alerts.map((alert) => (
          <div 
            key={alert._id} 
            className="flex items-start gap-3 rounded-lg bg-[#fff4e5] px-5 py-4 shadow-[0_4px_12px_rgba(0,0,0,0.1)] border-l-4 border-[#ffc20e] transition-all animate-in slide-in-from-right duration-300"
          >
            <span className="material-icons-outlined text-[#ffc20e] mt-0.5">warning</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-[#333333] leading-relaxed">
                {alert.message}
              </p>
              <p className="text-xs text-[#666666] mt-2 opacity-80">
                {new Date(alert.created_at).toLocaleDateString()}
              </p>
            </div>
            <button 
              onClick={() => handleDismissAlert(alert._id)}
              className="text-[#666666] hover:text-[#333333] transition-colors p-1 -mr-2 -mt-2"
            >
              <span className="material-icons-outlined text-sm">close</span>
            </button>
          </div>
        ))}
      </div>

      <Sidebar user={user} onLogout={onLogout} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title={`Welcome back, ${user.name}! 👋`} user={user} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 relative">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-6">
            <div className="min-w-0">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white truncate">Welcome back, {user.name}! 👋</h2>
              <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm md:text-base">Here's your academic progress overview for today.</p>
            </div>
            <div className="w-full sm:w-auto bg-surface-light dark:bg-surface-dark px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-2 shrink-0">
              <span className="material-icons-round text-primary text-sm">calendar_today</span>
              <span className="text-xs md:text-sm font-bold text-gray-700 dark:text-gray-200">Fall Semester 2024 - Week 8</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8">
            <div className="bg-surface-light dark:bg-surface-dark p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Enrollment Status</p>
                  <h3 className="text-xl md:text-2xl font-bold mt-1 text-green-600 dark:text-green-400">Active</h3>
                </div>
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400">
                  <span className="material-icons-round text-xl">check_circle</span>
                </div>
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 mt-2">
                <div className="bg-green-500 h-1.5 rounded-full" style={{ width: '100%' }}></div>
              </div>
              <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 mt-2 uppercase">Full-time • {currentCredits !== null ? `${currentCredits} Credits` : "- Credits"}</p>
            </div>

            <div className="bg-surface-light dark:bg-surface-dark p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Current GPA</p>
                  <h3 className="text-xl md:text-2xl font-bold mt-1 text-gray-800 dark:text-white">{gpa !== null ? gpa.toFixed(2) : "-"}</h3>
                </div>
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-500">
                  <span className="material-icons-round text-xl">analytics</span>
                </div>
              </div>
              <div className="flex items-center gap-1 text-green-500 text-xs font-bold mt-2">
                <span className="material-icons-round text-sm">trending_up</span>
                <span>+0.2 from last term</span>
              </div>
            </div>

            <div className="bg-surface-light dark:bg-surface-dark p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-between group cursor-pointer hover:border-primary transition-all hover:shadow-md sm:col-span-2 lg:col-span-1">
               <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Next Step</p>
                  <h3 className="text-xl font-bold mt-1 text-gray-800 dark:text-white">
                    Major Selection
                    {majorState?.program_type === "5-year" &&
                     majorState?.current_year === "Fourth Year" &&
                     majorState?.current_semester === "First Semester" &&
                     (majorState?.selected_major || majorState?.profile_major_id) ? (
                      <span className="ml-2 text-sm font-bold text-gray-800 dark:text-white">
                        Major: {majorState?.selected_major || majorState?.profile_major_id}
                      </span>
                    ) : null}
                  </h3>
                  {majorState?.program_type === "5-year" &&
                   majorState?.current_year === "Fourth Year" &&
                   majorState?.current_semester === "First Semester" ? (
                    <div className="text-[11px] font-semibold text-gray-600 dark:text-gray-300 mt-1">
                      Major Track: {majorState?.selected_track || majorState?.profile_major_track || "-"}
                    </div>
                  ) : null}
                  {majorState?.status && !majorState.selected_major && (
                    <div className="mt-1 text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                      Status: {majorState.status}
                    </div>
                  )}
                  {majorState?.program_type === "5-year" &&
                   majorState?.current_year === "Fourth Year" &&
                   majorState?.current_semester === "First Semester" &&
                   majorState?.selected_major ? (
                    <div className="text-xl font-bold mt-1 text-gray-800 dark:text-white">
                      Major: {majorState?.selected_major}
                    </div>
                  ) : null}
                </div>
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-500">
                  <span className="material-icons-round text-xl">alt_route</span>
                </div>
              </div>
              {(() => {
                if (isEarlyYears) {
                  return (
                    <div className="flex items-center justify-between">
                      <button onClick={startMajorProcess} disabled={startLoading} className="text-xs font-bold text-primary flex items-center gap-1 group-hover:underline uppercase tracking-wide disabled:opacity-60">
                        Start Process <span className="material-icons-round text-sm">arrow_forward</span>
                      </button>
                      {eligibility && eligibility.reason && (
                        <span className="text-[11px] text-gray-500 dark:text-gray-400 ml-3">{eligibility.reason}</span>
                      )}
                      {eligibility && !eligibility.can_select_major &&
                       !(majorState?.program_type === "5-year" &&
                         majorState?.current_year === "Fourth Year" &&
                         majorState?.current_semester === "First Semester") && (
                        <span className="text-[11px] text-gray-600 dark:text-gray-300 ml-3 font-bold">
                          Recorded: Track {majorState?.selected_track || majorState?.profile_major_track || "-"} • Major {majorState?.selected_major || majorState?.profile_major_id || "-"}
                        </span>
                      )}
                    </div>
                  );
                }
                if (!majorState?.selected_major) {
                  if (isLockedPhase) {
                    return (
                      <div className="text-xs text-gray-600 dark:text-gray-300">
                        <div className="flex items-center justify-between mb-2">
                          <div className="inline-flex items-center gap-2">
                            <span className="material-icons-round text-purple-500">lock</span>
                            <span className="text-[11px] font-bold">Major selection not available</span>
                          </div>
                          <button onClick={startMajorProcess} disabled={startLoading} className="text-xs font-semibold text-primary flex items-center gap-1 hover:underline disabled:opacity-60">
                            Start Process <span className="material-icons-round text-sm">arrow_forward</span>
                          </button>
                        </div>
                        <div className="mt-1">
                          <span className="font-bold">Selected Major:</span> {majorState?.selected_major || majorState?.profile_major_id || "-"}
                        </div>
                        <div className="mt-1">
                          <span className="font-bold">Major Track:</span> {majorState?.selected_track || majorState?.profile_major_track || "-"}
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div className="flex items-center justify-between">
                      <button onClick={startMajorProcess} disabled={startLoading} className="text-xs font-semibold text-primary flex items-center gap-1 group-hover:underline disabled:opacity-60">
                        Start Process <span className="material-icons-round text-sm">arrow_forward</span>
                      </button>
                      {eligibility && eligibility.reason && (
                        <span className="text-[11px] text-gray-500 dark:text-gray-400 ml-3">{eligibility.reason}</span>
                      )}
                      {eligibility && !eligibility.can_select_major &&
                       !(majorState?.program_type === "5-year" &&
                         majorState?.current_year === "Fourth Year" &&
                         majorState?.current_semester === "First Semester") &&
                       !isLockedPhase && (
                        <span className="text-[11px] text-gray-600 dark:text-gray-300 ml-3 font-bold">
                          Recorded: Track {majorState?.selected_track || majorState?.profile_major_track || "-"} • Major {majorState?.selected_major || majorState?.profile_major_id || "-"}
                        </span>
                      )}
                    </div>
                  );
                }
                return (
                  <div className="text-xs text-gray-600 dark:text-gray-300">
                    <span className="font-semibold">{majorState?.program_type}</span>
                    {(majorState?.program_type === "5-year" ||
                      (majorState?.program_type === "4-year" &&
                        !(majorState?.current_year === "Third Year" && majorState?.current_semester === "First Semester"))
                    ) ? (
                      <>
                        {majorState?.selected_track
                          ? ` • Track: ${majorState?.selected_track}`
                          : (majorState?.profile_major_track ? ` • Track: ${majorState?.profile_major_track}` : "")}
                        <div className="mt-1">
                          <span className="font-bold">Major Track:</span> {majorState?.selected_track || majorState?.profile_major_track || "-"}
                        </div>
                      </>
                    ) : null}
                    <div className="mt-1">
                      <span className="font-bold">Selected Major:</span> {majorState?.selected_major || majorState?.profile_major_id || "Not selected yet"}
                    </div>
                    <div className="mt-3 rounded-lg border border-teal-300 bg-teal-50 dark:bg-teal-900/20 p-3">
                      <div className="flex items-center gap-2">
                        <span className="material-icons-outlined text-teal-600 dark:text-teal-400">school</span>
                        <span className="text-sm font-bold text-[#0d1a1c] dark:text-white">
                          {majorState?.selected_major || majorState?.profile_major_id || "Not selected yet"}
                        </span>
                        {majorState?.program_type === "5-year" && (
                          <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border border-teal-400 text-teal-700 dark:text-teal-300">
                            Track: {majorState?.selected_track || majorState?.profile_major_track || "-"}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 flex gap-2">
                      {eligibility?.can_select_major ? (
                        <button onClick={() => navigate("/student/major/select")} className="text-primary font-semibold hover:underline">Change Major</button>
                      ) : null}
                    </div>
                  </div>
                );
              })()}
              {!majorState?.selected_major && majorState?.selected_track && (
                <div className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
                  Current Track: <span className="font-bold">{majorState.selected_track}</span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6">
              <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="p-4 md:p-5 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
                  <span className="material-icons-round text-primary">auto_graph</span>
                  <h2 className="text-lg font-bold text-gray-800 dark:text-white">Degree Progress</h2>
                </div>
                <div className="p-5 md:p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                    <div className="relative flex items-center justify-center">
                      <div className="relative w-32 h-32 md:w-40 md:h-40">
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
                             strokeDashoffset={(function() {
                               const totalReq = (degreeAudit?.core_credits.required ?? 0)
                                 + (degreeAudit?.elective_credits.required ?? 0)
                                 + (degreeAudit?.major_specific.required ?? 0);
                               const totalEarn = (degreeAudit?.core_credits.earned ?? 0)
                                 + (degreeAudit?.elective_credits.earned ?? 0)
                                 + (degreeAudit?.major_specific.earned ?? 0);
                               const pct = totalReq > 0 ? Math.min(100, Math.max(0, Math.round((totalEarn / totalReq) * 100))) : 0;
                               return 314 - (3.14 * pct);
                             })()}
                             strokeLinecap="round"
                             strokeWidth="8"
                           />
                         </svg>
                         <div className="absolute inset-0 flex flex-col items-center justify-center">
                           <span className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">
                             {(function() {
                               const totalReq = (degreeAudit?.core_credits.required ?? 0)
                                 + (degreeAudit?.elective_credits.required ?? 0)
                                 + (degreeAudit?.major_specific.required ?? 0);
                               const totalEarn = (degreeAudit?.core_credits.earned ?? 0)
                                 + (degreeAudit?.elective_credits.earned ?? 0)
                                 + (degreeAudit?.major_specific.earned ?? 0);
                               const pct = totalReq > 0 ? Math.min(100, Math.max(0, Math.round((totalEarn / totalReq) * 100))) : 0;
                               return `${pct}%`;
                             })()}
                           </span>
                           <span className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">Complete</span>
                         </div>
                      </div>
                    </div>
                    <div className="space-y-4 md:space-y-5">
                      {[
                        {
                          label: 'Core Requirements',
                          earned: degreeAudit?.core_credits.earned ?? 0,
                          required: degreeAudit?.core_credits.required ?? 0,
                          color: 'bg-primary',
                        },
                        {
                          label: 'Major Electives',
                          earned: degreeAudit?.elective_credits.earned ?? 0,
                          required: degreeAudit?.elective_credits.required ?? 0,
                          color: 'bg-primary',
                        },
                        {
                          label: 'General Education',
                          earned: degreeAudit?.major_specific.earned ?? 0,
                          required: degreeAudit?.major_specific.required ?? 0,
                          color: 'bg-green-500',
                        },
                      ].map((item, i) => (
                        <div key={i}>
                          <div className="flex justify-between text-xs md:text-sm mb-1.5">
                            <span className="font-bold text-gray-600 dark:text-gray-400">{item.label}</span>
                            <span className="font-bold text-gray-900 dark:text-white">
                              {Math.round(item.earned)}/{Math.round(item.required)}
                            </span>
                          </div>
                          <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                            <div
                              className={`${item.color} h-2 rounded-full transition-all duration-500`}
                              style={{
                                width: (() => {
                                  const pct = item.required > 0 ? Math.min(100, Math.max(0, (item.earned / item.required) * 100)) : 0;
                                  return `${pct}%`;
                                })(),
                              }}
                            ></div>
                          </div>
                        </div>
                      ))}
                      <button
                        onClick={() => navigate("/student/degree-audit")}
                        className="w-full mt-2 py-2.5 text-xs font-bold text-primary border border-primary/20 hover:bg-primary/5 rounded-xl transition-colors uppercase tracking-wide"
                      >
                        View Degree Audit
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="p-4 md:p-5 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
                  <span className="material-icons-round text-primary">workspace_premium</span>
                  <h2 className="text-lg font-bold text-gray-800 dark:text-white">Special Major Access</h2>
                </div>
                <div className="p-5 md:p-6">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Access special major options with faculty approval. Use this entry point
                    to review eligibility and proceed when permitted.
                  </p>
                  <button
                    onClick={() => navigate("/student/special-major/access")}
                    className="mt-4 px-3 py-2 text-xs font-bold text-primary border border-primary/20 hover:bg-primary/5 rounded-xl uppercase tracking-wide"
                  >
                    Start Major Access
                  </button>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-6">
              <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col flex-1 min-h-[400px] overflow-hidden">
                <div className="p-4 md:p-5 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                  <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <span className="material-icons-round text-primary">history</span>
                    Recent Activity
                  </h3>
                  <a className="text-xs text-primary hover:underline font-bold uppercase tracking-wide" href="#">View All</a>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-800 overflow-y-auto max-h-[500px]">
                  {recent.map((act, i) => (
                    <div key={i} className="p-4 md:p-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors flex gap-4 items-start">
                      <div className={`${act.color} dark:bg-opacity-20 rounded-xl h-10 w-10 flex items-center justify-center shrink-0`}>
                        <span className="material-icons-round text-xl">{act.icon}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">{act.title}</p>
                        {act.sub ? <p className="text-xs text-gray-500 dark:text-gray-400 font-medium truncate">{act.sub}</p> : null}
                        <p className="text-[10px] text-gray-400 mt-1 uppercase font-extrabold">{new Date(act.when).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <footer className="mt-12 text-center text-xs text-gray-400 dark:text-gray-600 pb-8">
            © 2024 University Portal System. All rights reserved.
          </footer>
        </main>
      </div>
    </div>
  );
};

export default StudentDashboard;
