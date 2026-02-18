import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { User } from "../types";
import { api } from "../lib/api";

type MajorMeta = { code: string; title: string; desc: string; rec: string };

const ALL_MAJORS: MajorMeta[] = [
  { code: "SE", title: "Software Engineering", desc: "Software design, development, and quality.", rec: "Enjoy building robust apps" },
  { code: "KE", title: "Knowledge Engineering", desc: "Knowledge systems, AI reasoning.", rec: "Interested in AI knowledge bases" },
  { code: "BIS", title: "Business Information Systems", desc: "IT solutions for business processes.", rec: "Blend of tech and business" },
  { code: "CSec", title: "Cyber Security", desc: "Protect systems and data.", rec: "Defensive and security mindset" },
  { code: "HPC", title: "High Performance Computing", desc: "Compute-intensive systems.", rec: "Performance and parallelism" },
  { code: "CN", title: "Computer Networks", desc: "Network design and operations.", rec: "Networking and infrastructure" },
  { code: "ES", title: "Embedded Systems", desc: "Hardware-software integration.", rec: "Low-level systems interest" },
];

const majorsForTrack = (track: "CS" | "CT"): MajorMeta[] => {
  if (track === "CS") return ALL_MAJORS.filter(m => ["SE","KE","BIS","CSec"].includes(m.code));
  return ALL_MAJORS.filter(m => ["CN","HPC","ES"].includes(m.code));
};

const StudentMajorSelection: React.FC<{ user: User; onLogout: () => void }> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [programType, setProgramType] = useState<"4-year" | "5-year">("4-year");
  const [track, setTrack] = useState<"CS" | "CT" | null>(null);
  const [selectedMajor, setSelectedMajor] = useState<string>("");
  const [profileMajorId, setProfileMajorId] = useState<string>("");
  const [profileMajorTrack, setProfileMajorTrack] = useState<string>("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [eligibility, setEligibility] = useState<any | null>(null);

  useEffect(() => {
    api.studentMajorState()
      .then((st) => {
        const pt = (st?.program_type as string) || "4-year";
        setProgramType(pt === "5-year" ? "5-year" : "4-year");
        setTrack(st?.selected_track || st?.profile_major_track || null);
        setSelectedMajor(st?.selected_major || "");
        setProfileMajorId(st?.profile_major_id || "");
        setProfileMajorTrack(st?.profile_major_track || "");
        if (pt === "5-year") {
          const cy = st?.current_year;
          const cs = st?.current_semester;
          const isFourthFirst = cy === "Fourth Year" && cs === "First Semester";
          if (!isFourthFirst && !st?.selected_track && !st?.profile_major_track) {
            navigate("/student/major/track", { replace: true });
          }
        }
      })
      .catch(() => {});
    api.studentMajorOptions()
      .then((res) => {
        if (res.type === "majors") {
          const list = (res.majors as string[]).map((code) => {
            const m = ALL_MAJORS.find((x) => x.code === code)!;
            return m;
          });
          // overwrite displayed options based on backend allowed list
          if (list.length > 0) {
            // If programType changed after state, recompute next render
          }
        } else if (res.type === "tracks") {
          setError(res.eligibility?.reason || "Select track first");
        }
        setEligibility(res.eligibility || null);
      })
      .catch((e) => setError(e?.message || "Failed to load options"));
  }, []);

  const options: MajorMeta[] = useMemo(() => {
    if (programType === "4-year") return ALL_MAJORS;
    if (!track) return [];
    return majorsForTrack(track);
  }, [programType, track]);

  const select = async (code: string) => {
    setError("");
    setLoading(true);
    try {
      await api.studentSelectMajor({ major: code });
      const st = await api.studentMajorState();
      setSelectedMajor(st?.selected_major || code);
      alert("Major selected and permanently locked. You cannot change it later.");
      navigate("/student/dashboard", { replace: true });
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
        <Header title="Academic Specialization" user={user} />
        <main className="flex-1 overflow-y-auto p-10 lg:p-16 scrollbar-hide animate-in fade-in duration-700 slide-in-from-bottom-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
              <div className="space-y-2">
                <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Select Specialization</h1>
                <p className="text-lg font-medium text-slate-400 dark:text-slate-500">Define your academic trajectory within the {programType} framework.</p>
              </div>
              <div className="px-4 py-1.5 rounded-full bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 text-[10px] font-black uppercase tracking-[0.2em] border border-teal-100 dark:border-teal-800 shadow-sm">
                {programType} Curriculum
              </div>
            </div>

            {error && (
              <div className="mb-10 p-5 rounded-2xl bg-rose-50 text-rose-700 text-sm font-bold border border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-900/40 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                <span className="material-icons-outlined">error_outline</span>
                {error}
              </div>
            )}

            {eligibility && eligibility.major_locked && (
              <div className="mb-10 p-6 rounded-[32px] bg-amber-50/50 border border-amber-100 dark:bg-amber-900/10 dark:border-amber-900/40 text-amber-800 dark:text-amber-200 flex items-start gap-4">
                <span className="material-icons-outlined text-amber-500 mt-0.5">lock_clock</span>
                <div>
                  <p className="font-black uppercase tracking-widest text-[10px] mb-1">State: Synchronized & Locked</p>
                  <p className="text-sm font-medium leading-relaxed">{eligibility.reason || "The selection window has concluded for this academic cycle."}</p>
                </div>
              </div>
            )}

            {eligibility && eligibility.current_year_num && eligibility.current_year_num <= 2 && (
              <div className="mb-10 p-8 rounded-[40px] bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-center flex flex-col items-center">
                <div className="h-16 w-16 rounded-[24px] bg-white dark:bg-slate-950 flex items-center justify-center text-slate-300 dark:text-slate-700 mb-6 border border-slate-100 dark:border-slate-800 shadow-sm">
                  <span className="material-icons-outlined text-3xl">history_edu</span>
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Foundation Phase Active</h3>
                <p className="text-sm font-medium text-slate-400 dark:text-slate-500 max-w-sm mx-auto leading-relaxed">
                  Specialization selection initiates in the 3rd academic year. Complete your core requirements to unlock this protocol.
                </p>
              </div>
            )}

            {eligibility && !eligibility.can_select_major ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
                {eligibility.reason || "Major selection is not available for the current year or semester."}
                {(profileMajorId || selectedMajor || profileMajorTrack || track) && (
                  <div className="mt-3 text-[12px] text-gray-700 dark:text-gray-300 font-bold">
                    Recorded: {programType} • Track: {track || profileMajorTrack || "-"} • Major: {selectedMajor || profileMajorId || "-"}
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {options.map((m) => (
                  <div
                    key={m.code}
                    className="group bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-sm border border-slate-100 dark:border-slate-800 transition-all hover:shadow-2xl hover:-translate-y-1 relative overflow-hidden flex flex-col"
                  >
                    <div className="absolute top-0 right-0 h-24 w-24 bg-teal-500/[0.03] rounded-bl-full transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-700" />
                    
                    <div className="flex items-center gap-4 mb-8 relative z-10">
                      <div className="h-10 w-10 rounded-2xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center text-teal-600 dark:text-teal-400 border border-teal-100 dark:border-teal-800/50">
                        <span className="material-icons-outlined text-xl">school</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{m.code}</p>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight truncate group-hover:text-teal-600 transition-colors">{m.title}</h3>
                      </div>
                    </div>

                    <div className="space-y-6 flex-1 relative z-10">
                      <div className="space-y-2">
                        <div className="text-[9px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.3em]">Institutional Definition</div>
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed italic">"{m.desc}"</p>
                      </div>
                      <div className="space-y-2">
                        <div className="text-[9px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.3em]">Optimal Candidate</div>
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed">{m.rec}</p>
                      </div>
                    </div>

                    <button
                      disabled={loading || (eligibility && (!eligibility.can_select_major || (eligibility.current_year_num && eligibility.current_year_num <= 2)))}
                      onClick={() => select(m.code)}
                      className={`mt-10 w-full py-4 rounded-[20px] text-[10px] font-black uppercase tracking-[0.2em] transition-all active:scale-[0.98] shadow-lg relative z-10 ${
                        selectedMajor === m.code
                          ? "bg-emerald-600 text-white shadow-emerald-500/20"
                          : "bg-slate-900 dark:bg-teal-600 text-white shadow-slate-500/10 hover:bg-slate-800 dark:hover:bg-teal-700"
                      } disabled:opacity-30 disabled:shadow-none`}
                    >
                      {selectedMajor === m.code ? "ACTIVE PROTOCOL" : "INITIATE SELECTION"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>

        {/* Global UI Decoration */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-teal-500/[0.02] rounded-full blur-[120px] pointer-events-none -translate-y-1/2 translate-x-1/2 -z-10" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-500/[0.02] rounded-full blur-[100px] pointer-events-none translate-y-1/2 -translate-x-1/2 -z-10" />
      </div>
    </div>
  );
};

export default StudentMajorSelection;
