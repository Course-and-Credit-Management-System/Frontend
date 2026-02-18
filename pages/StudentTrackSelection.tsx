import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { User } from "../types";
import { api } from "../lib/api";

const TrackCard: React.FC<{ code: "CS" | "CT"; title: string; desc: string; onSelect: () => void; disabled?: boolean }> = ({ code, title, desc, onSelect, disabled }) => (
  <div className={`group rounded-[32px] p-10 border transition-all relative overflow-hidden flex flex-col ${disabled ? "opacity-40 cursor-not-allowed grayscale bg-slate-50 dark:bg-slate-900 border-slate-100" : "hover:shadow-2xl hover:-translate-y-1 bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm"}`}>
    <div className="absolute top-0 right-0 h-24 w-24 bg-teal-500/[0.03] rounded-bl-full transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-700" />
    
    <div className="flex items-start justify-between mb-8 relative z-10">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-2xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center text-teal-600 dark:text-teal-400 border border-teal-100 dark:border-teal-800/50 group-hover:scale-110 transition-transform duration-500">
          <span className="material-icons-outlined text-2xl">architecture</span>
        </div>
        <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight group-hover:text-teal-600 transition-colors">{title}</h3>
      </div>
      <span className="px-3 py-1 rounded-lg bg-slate-50 dark:bg-slate-950 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 border border-slate-100 dark:border-slate-800 shadow-sm">{code}</span>
    </div>

    <div className="space-y-2 flex-1 relative z-10 mb-10">
      <div className="text-[9px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.3em] mb-2">Track Trajectory</div>
      <p className="text-base font-medium text-slate-500 dark:text-slate-400 leading-relaxed italic">"{desc}"</p>
    </div>

    <button
      disabled={disabled}
      onClick={onSelect}
      className={`w-full py-4 rounded-[20px] text-[10px] font-black uppercase tracking-[0.2em] transition-all active:scale-[0.98] shadow-lg relative z-10 ${
        disabled 
          ? "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none" 
          : "bg-slate-900 dark:bg-teal-600 text-white shadow-slate-500/10 hover:bg-slate-800 dark:hover:bg-teal-700 active:shadow-none"
      }`}
    >
      {disabled ? "PROTOCOL RESTRICTED" : "INITIATE TRACK"}
    </button>
  </div>
);

const StudentTrackSelection: React.FC<{ user: User; onLogout: () => void }> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [eligibility, setEligibility] = useState<any | null>(null);

  useEffect(() => {
    api.studentMajorState().then((st) => {
      if (st?.program_type !== "5-year") {
        navigate("/student/major/select", { replace: true });
      }
    }).catch(() => {});
    api.studentMajorEligibility().then((el) => {
      setEligibility(el);
      if (!el?.can_select_track) {
        setError(el?.reason || "Track selection not allowed");
      }
    }).catch(() => {});
  }, []);

  const choose = async (track: "CS" | "CT") => {
    setError("");
    setLoading(true);
    try {
      await api.studentSelectTrack({ track });
      navigate("/student/major/select", { replace: true });
    } catch (e: any) {
      setError(e?.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-slate-950 font-poppins">
      <Sidebar user={user} onLogout={onLogout} />
      <div className="flex flex-1 flex-col overflow-hidden relative">
        <Header title="Institutional Pathway" user={user} />
        <main className="flex-1 overflow-y-auto p-10 lg:p-16 scrollbar-hide animate-in fade-in duration-1000 slide-in-from-bottom-4">
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="rounded-[40px] p-10 bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-md relative overflow-hidden">
              <div className="absolute top-0 right-0 h-40 w-40 bg-teal-500/[0.02] rounded-bl-full pointer-events-none" />
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-8 relative z-10">
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-white dark:bg-slate-950 flex items-center justify-center border border-slate-100 dark:border-slate-800 shadow-sm text-teal-600">
                      <span className="material-icons-outlined text-2xl">route</span>
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">Bifurcation Protocol</h1>
                  </div>
                  <p className="text-lg font-medium text-slate-400 dark:text-slate-500 max-w-2xl leading-relaxed">
                    Select your primary academic vector. This decision determines the specialization matrix available in your terminal years.
                  </p>
                </div>
                {eligibility?.program_type && (
                  <div className="px-4 py-1.5 rounded-full bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 text-[10px] font-black uppercase tracking-[0.2em] border border-teal-100 dark:border-teal-800 shadow-sm shrink-0">
                    {eligibility.program_type} Framework
                  </div>
                )}
              </div>
              
              {eligibility && !eligibility.can_select_track && (
                <div className="mt-10 rounded-[24px] border border-amber-100 bg-amber-50/50 p-6 text-sm font-bold text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-300 flex items-center gap-4 animate-in slide-in-from-top-2 duration-500 relative z-10">
                  <span className="material-icons-outlined text-amber-500">lock_clock</span>
                  <p>Trajectory selection is currently restricted: <span className="opacity-70 font-medium ml-1">{eligibility.reason || "Interval closed."}</span></p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <TrackCard code="CS" title="Computer Science (CS)" desc="Advanced algorithmic architecture, high-order reasoning systems, and complex software engineering." onSelect={() => choose("CS")} disabled={!!(eligibility && !eligibility.can_select_track)} />
              <TrackCard code="CT" title="Computer Technology (CT)" desc="Network synchronization, hardware-level optimization, embedded protocols, and global infrastructure." onSelect={() => choose("CT")} disabled={!!(eligibility && !eligibility.can_select_track)} />
            </div>

            <div className="rounded-[32px] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm transition-all hover:shadow-md">
              <div className="flex items-start gap-5">
                <div className="h-10 w-10 rounded-2xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center text-teal-600 dark:text-teal-400 border border-teal-100 dark:border-teal-800/50 shrink-0">
                  <span className="material-icons-outlined text-xl">info</span>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Operational Guideline</p>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                    For 5-year curriculum participants, track selection initiates in the <span className="text-slate-900 dark:text-white font-black">Third Year</span>. The specific specialization matrix unlocks in the <span className="text-slate-900 dark:text-white font-black">Fourth Year, First Semester</span> interval.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Global UI Decoration */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-teal-500/[0.02] rounded-full blur-[120px] pointer-events-none -translate-y-1/2 translate-x-1/2 -z-10" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-500/[0.02] rounded-full blur-[100px] pointer-events-none translate-y-1/2 -translate-x-1/2 -z-10" />
      </div>
    </div>
  );
};

export default StudentTrackSelection;
