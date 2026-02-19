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
  const [majorState, setMajorState] = useState<{ program_type?: string; selected_track?: string; selected_major?: string; status?: string; profile_major_id?: string; profile_major_track?: string; current_year?: string; current_semester?: string } | null>(null);
  const [eligibility, setEligibility] = useState<any | null>(null);
  const [startLoading, setStartLoading] = useState(false);
  const [gpa, setGpa] = useState<number | null>(null);
  const [currentCredits, setCurrentCredits] = useState<number | null>(null);
  type DegreeAuditResponse = {
    core_credits: { earned: number; required: number };
    elective_credits: { earned: number; required: number };
    major_specific: { earned: number; required: number };
    progress_bars?: Array<{ label: string; percentage: number; completed: number; total: number }>;
  };
  const [degreeAudit, setDegreeAudit] = useState<DegreeAuditResponse | null>(null);
  const [recent, setRecent] = useState<Array<{ title: string; sub?: string; when: Date; icon: string; color: string }>>([]);
  const [maxCredits, setMaxCredits] = useState<number | null>(null);

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
        console.log("Dashboard Summary API Response:", sum);
        if (sum && typeof sum.gpa === "number") {
          console.log("Setting GPA to:", sum.gpa);
          setGpa(sum.gpa);
        } else {
          console.log("Invalid GPA response:", sum);
          setGpa(null);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch dashboard summary:", err);
        setGpa(null);
      });
    api.studentDegreeAudit()
      .then((audit) => setDegreeAudit(audit))
      .catch(() => setDegreeAudit(null));
    api.currentStudentCourses()
      .then((resp) => {
        if (resp && typeof resp.total_credits === "number") setCurrentCredits(resp.total_credits);
      })
      .catch(() => {});
    api.studentEnrollmentSettingCurrent()
      .then((setting) => {
        if (setting && typeof setting.max_credits === "number") {
          setMaxCredits(setting.max_credits);
          try { localStorage.setItem("max_credits", String(setting.max_credits)); } catch {}
        } else {
          const cached = Number(localStorage.getItem("max_credits") || "");
          if (!Number.isNaN(cached) && cached > 0) setMaxCredits(cached);
        }
      })
      .catch(() => {
        const cached = Number(localStorage.getItem("max_credits") || "");
        if (!Number.isNaN(cached) && cached > 0) setMaxCredits(cached);
      });
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
    <div className="flex h-screen overflow-hidden bg-white dark:bg-slate-950 font-poppins relative">
      {/* Toast Container */}
      <div className="fixed top-24 right-8 z-50 flex flex-col gap-4 max-w-sm w-full">
        {alerts.map((alert) => (
          <div 
            key={alert._id} 
            className="flex items-start gap-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 px-6 py-5 shadow-xl border border-amber-100 dark:border-amber-900/30 transition-all animate-in slide-in-from-right-10 duration-500"
          >
            <span className="material-icons-outlined text-amber-500 mt-0.5">warning</span>
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-900 dark:text-amber-200 leading-relaxed">
                {alert.message}
              </p>
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-500/70 mt-3">
                {new Date(alert.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </p>
            </div>
            <button 
              onClick={() => handleDismissAlert(alert._id)}
              className="text-amber-400 hover:text-amber-600 transition-colors p-1"
            >
              <span className="material-icons-outlined text-sm">close</span>
            </button>
          </div>
        ))}
      </div>

      <Sidebar user={user} onLogout={onLogout} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title={`Dashboard Overview`} user={user} />
        <main className="flex-1 overflow-y-auto p-8 lg:p-12 relative animate-in fade-in duration-700 slide-in-from-bottom-4 scrollbar-hide">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-8">
            <div className="min-w-0 space-y-2">
              <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">Welcome back, {user.name.split(' ')[0]}!</h2>
              <p className="text-lg font-medium text-slate-400 dark:text-slate-500">Your academic trajectory is looking healthy. Here's the briefing.</p>
            </div>
            <div className="w-full md:w-auto bg-slate-50/50 dark:bg-slate-900/50 px-6 py-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-3 shrink-0">
              <span className="material-icons-round text-teal-600 text-base">calendar_today</span>
              <span className="text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">Fall '24 • Week 08</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between transition-all hover:shadow-xl hover:-translate-y-1 group relative overflow-hidden">
              <div className="absolute top-0 right-0 h-24 w-24 bg-emerald-500/5 rounded-bl-full transform translate-x-4 -translate-y-4 transition-transform group-hover:scale-110" />
              <div className="flex justify-between items-start mb-8 relative z-10">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Enrollment Status</p>
                  <h3 className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">Active</h3>
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/50">
                  <span className="material-icons-round text-2xl">verified</span>
                </div>
              </div>
              <div className="relative z-10">
                <div className="w-full bg-slate-50 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-700"
                    style={{
                      width: (() => {
                        const cached = Number(localStorage.getItem("max_credits") || "");
                        const fallback = !Number.isNaN(cached) && cached > 0 ? cached : 24;
                        const maxC = (maxCredits ?? fallback);
                        const cur = currentCredits ?? 0;
                        const pct = maxC > 0 ? Math.max(0, Math.min(100, (cur / maxC) * 100)) : 0;
                        return `${pct}%`;
                      })(),
                    }}
                  />
                </div>
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 mt-4 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                  Full-time Matrix • {currentCredits !== null ? `${currentCredits} Credits` : "- Credits"}
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between transition-all hover:shadow-xl hover:-translate-y-1 group relative overflow-hidden">
              <div className="absolute top-0 right-0 h-24 w-24 bg-blue-500/5 rounded-bl-full transform translate-x-4 -translate-y-4 transition-transform group-hover:scale-110" />
              <div className="flex justify-between items-start mb-8 relative z-10">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Academic Index</p>
                  <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{gpa !== null ? gpa.toFixed(2) : "—"} <span className="text-lg text-slate-300 dark:text-slate-600 font-bold ml-1">/ 4.0</span></h3>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/50">
                  <span className="material-icons-round text-2xl">analytics</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-emerald-500 text-[10px] font-black uppercase tracking-widest relative z-10">
                <span className="material-icons-round text-sm">trending_up</span>
                <span>Optimizing Performance</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between group cursor-pointer transition-all hover:shadow-xl hover:-translate-y-1 sm:col-span-2 lg:col-span-1 relative overflow-hidden">
               <div className="absolute top-0 right-0 h-24 w-24 bg-indigo-500/5 rounded-bl-full transform translate-x-4 -translate-y-4 transition-transform group-hover:scale-110" />
               <div className="flex justify-between items-start mb-8 relative z-10">
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
                    <div className="mt-2 text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded-md inline-block border border-indigo-100 dark:border-indigo-800">
                      {majorState.status}
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
                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/50">
                  <span className="material-icons-round text-2xl">alt_route</span>
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

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-8">
              <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex-1 transition-all hover:shadow-md">
                <div className="px-10 py-8 border-b border-slate-50 dark:border-slate-800 flex items-center gap-4 bg-slate-50/30 dark:bg-slate-950/20">
                  <div className="h-10 w-10 rounded-2xl bg-white dark:bg-slate-900 flex items-center justify-center border border-slate-100 dark:border-slate-800 shadow-sm">
                    <span className="material-icons-round text-teal-600 text-lg">auto_graph</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Institutional Audit</h2>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-0.5">Degree Completion Progress</p>
                  </div>
                </div>
                <div className="p-10 lg:p-12">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                    <div className="flex items-center justify-center relative">
                      <div className="relative w-48 h-48 md:w-56 md:h-56 transform transition-transform duration-1000 hover:scale-105">
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
                    <div className="space-y-8">
                      {(degreeAudit?.progress_bars
                        ? degreeAudit.progress_bars.map(pb => ({
                            label: pb.label === 'Core' ? 'Core Requirements'
                              : pb.label === 'Elective' ? 'Electives'
                              : pb.label === 'Major' ? 'Major'
                              : 'Overall',
                            earned: pb.completed,
                            required: pb.total,
                            percent: pb.percentage,
                            color: pb.label === 'Overall' ? 'bg-indigo-500' : (pb.label === 'Core' ? 'bg-primary' : pb.label === 'Major' ? 'bg-primary' : 'bg-green-500'),
                          }))
                        : [
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
                          ]
                      ).map((item: any, i: number) => (
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
                                  const pct = typeof item.percent === 'number'
                                    ? item.percent
                                    : (item.required > 0 ? Math.min(100, Math.max(0, (item.earned / item.required) * 100)) : 0);
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
            </div>

            <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-8">
              <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col flex-1 min-h-[500px] overflow-hidden transition-all hover:shadow-md">
                <div className="px-10 py-8 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/30 dark:bg-slate-950/20">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-2xl bg-white dark:bg-slate-900 flex items-center justify-center border border-slate-100 dark:border-slate-800 shadow-sm text-teal-600">
                      <span className="material-icons-round text-lg">history</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Sync History</h3>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-0.5">Recent Ledger Activity</p>
                    </div>
                  </div>
                  <a className="text-[9px] font-black uppercase tracking-widest text-teal-600 hover:text-teal-700 pb-0.5 border-b-2 border-teal-600/10 transition-colors" href="#">Archive</a>
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
          <footer className="mt-20 text-center space-y-4 pb-12">
            <div className="h-px w-20 bg-slate-100 dark:bg-slate-800 mx-auto" />
            <p className="text-[10px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-[0.4em]">
              Institutional Administrative Framework • 2024
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
};

export default StudentDashboard;
