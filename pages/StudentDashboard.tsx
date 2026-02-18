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
  const [majorState, setMajorState] = useState<{ program_type?: string; selected_track?: string; selected_major?: string; status?: string } | null>(null);
  const [eligibility, setEligibility] = useState<any | null>(null);
  const [startLoading, setStartLoading] = useState(false);
  const [gpa, setGpa] = useState<number | null>(null);
  const [currentCredits, setCurrentCredits] = useState<number | null>(null);

  useEffect(() => {
    // Fetch alerts on mount
    api.studentAlerts()
      .then((data) => {
        if (Array.isArray(data)) setAlerts(data);
      })
      .catch((err) => console.error("Failed to fetch alerts", err));
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
              <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">Welcome back, {user.name.split(' ')[0]}! 👋</h2>
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
                  <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000 w-full" />
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
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Priority Path</p>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight line-clamp-1">
                    {isEarlyYears ? "Major Selection" : (majorState?.selected_major ? majorState.selected_major : "Major Selection")}
                  </h3>
                  {majorState?.status && !majorState.selected_major && (
                    <div className="mt-2 text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded-md inline-block border border-indigo-100 dark:border-indigo-800">
                      {majorState.status}
                    </div>
                  )}
                </div>
                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/50">
                  <span className="material-icons-round text-2xl">alt_route</span>
                </div>
              </div>
              
              <div className="relative z-10">
                {isEarlyYears || !majorState?.selected_major ? (
                  <button onClick={startMajorProcess} disabled={startLoading} className="w-full py-3.5 rounded-2xl bg-slate-900 dark:bg-teal-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-slate-800 dark:hover:bg-teal-700 transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                    Execute Process <span className="material-icons-round text-sm">east</span>
                  </button>
                ) : (
                  <div className="flex flex-col gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{majorState.program_type}</p>
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-300 italic">{majorState.selected_track ? `Specialization Track: ${majorState.selected_track}` : "General Curriculum"}</p>
                    </div>
                    <button onClick={() => navigate("/student/major/select")} className="text-[10px] font-black uppercase tracking-widest text-teal-600 hover:text-teal-700 transition-colors flex items-center gap-1 group/btn">
                      Modify Trajectory <span className="material-icons-round text-sm transform group-hover/btn:translate-x-1 transition-transform">east</span>
                    </button>
                  </div>
                )}
              </div>
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
                           <circle className="text-slate-50 dark:text-slate-800" cx="56" cy="56" fill="transparent" r="50" stroke="currentColor" strokeWidth="6" />
                           <circle className="text-teal-500 drop-shadow-[0_0_8px_rgba(20,184,166,0.3)]" cx="56" cy="56" fill="transparent" r="50" stroke="currentColor" strokeDasharray="314" strokeDashoffset="78.5" strokeLinecap="round" strokeWidth="6" />
                         </svg>
                         <div className="absolute inset-0 flex flex-col items-center justify-center">
                           <span className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter tabular-nums">75%</span>
                           <span className="text-[9px] uppercase font-black text-slate-400 tracking-[0.3em] mt-1">Global Mastery</span>
                         </div>
                      </div>
                    </div>
                    <div className="space-y-8">
                      {[
                        { label: 'Core Requirements', progress: '24/30', width: '80%', color: 'bg-slate-900 dark:bg-teal-600' },
                        { label: 'Major Specialization', progress: '12/18', width: '66%', color: 'bg-slate-900 dark:bg-teal-600' },
                        { label: 'General Electives', progress: '45/45', width: '100%', color: 'bg-emerald-500' }
                      ].map((item, i) => (
                        <div key={i} className="group">
                          <div className="flex justify-between items-end mb-3">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-teal-600 transition-colors">{item.label}</span>
                            <span className="text-sm font-black text-slate-900 dark:text-white tabular-nums">{item.progress} <span className="text-[10px] text-slate-300 dark:text-slate-600 ml-1 tracking-tighter">UNITS</span></span>
                          </div>
                          <div className="w-full bg-slate-50 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div className={`${item.color} h-full rounded-full transition-all duration-1000 ease-out`} style={{ width: item.width }}></div>
                          </div>
                        </div>
                      ))}
                      <button className="w-full mt-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-teal-600 border border-teal-100 dark:border-teal-900/50 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-2xl transition-all shadow-sm active:scale-[0.98]">
                        Full Transcript Report
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
                <div className="divide-y divide-slate-50 dark:divide-slate-800/50 overflow-y-auto max-h-[600px] scrollbar-hide">
                  {[
                    { title: 'Performance Log', sub: 'Calculus II • Midterm Protocol', time: '2 hours ago', icon: 'grade', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
                    { title: 'Global Broadcast', sub: 'Main Library 24/7 Access Policy', time: 'Yesterday', icon: 'campaign', color: 'bg-teal-50 text-teal-600 border-teal-100' },
                    { title: 'Session Lock', sub: 'Spring 2025 Priority Enrollment', time: '3 days ago', icon: 'event_available', color: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
                    { title: 'Ledger Update', sub: 'Machine Learning Protocol #04', time: '4 days ago', icon: 'assignment', color: 'bg-amber-50 text-amber-600 border-amber-100' }
                  ].map((act, i) => (
                    <div key={i} className="p-8 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-all flex gap-6 items-start group">
                      <div className={`${act.color} dark:bg-opacity-10 rounded-2xl h-12 w-12 flex items-center justify-center shrink-0 border transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110 shadow-sm`}>
                        <span className="material-icons-round text-xl">{act.icon}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between items-start mb-1">
                          <p className="text-sm font-black text-slate-900 dark:text-slate-200 tracking-tight">{act.title}</p>
                          <p className="text-[9px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-tighter tabular-nums">{act.time}</p>
                        </div>
                        <p className="text-xs font-medium text-slate-400 dark:text-slate-500 truncate leading-relaxed">{act.sub}</p>
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
