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
    <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark">
      <Sidebar user={user} onLogout={onLogout} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title="Major Selection" user={user} />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-bold text-[#0d1a1c] dark:text-white">Select Your Major</h1>
              <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary">{programType}</span>
            </div>
            {error && <div className="text-sm text-red-600 mb-3">{error}</div>}
            {eligibility && eligibility.major_locked && (
              <div className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded p-3 mb-3">
                Major selection locked: {eligibility.reason || "Not available"}
              </div>
            )}
            {eligibility && eligibility.current_year_num && eligibility.current_year_num <= 2 && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3 mb-3">
                First and second year students cannot choose major. The major page is locked.
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {options.map((m) => (
                  <div
                    key={m.code}
                    className="bg-white dark:bg-[#162a2d] rounded-2xl p-5 shadow-sm border border-teal-300 dark:border-teal-700/60"
                  >
                    <div className="flex items-center gap-2">
                      <span className="material-icons-outlined text-teal-600 dark:text-teal-400">school</span>
                      <h3 className="text-lg font-bold text-[#0d1a1c] dark:text-white">{`${m.code} (${m.title})`}</h3>
                    </div>
                    <div className="mt-3">
                      <div className="text-[12px] font-semibold text-gray-600 dark:text-gray-300">Definition</div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{m.desc}</p>
                    </div>
                    <div className="mt-3">
                      <div className="text-[12px] font-semibold text-gray-600 dark:text-gray-300">Suitable For</div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{m.rec}</p>
                    </div>
                    <button
                      disabled={loading || (eligibility && (!eligibility.can_select_major || (eligibility.current_year_num && eligibility.current_year_num <= 2)))}
                      onClick={() => select(m.code)}
                      className={`mt-4 inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold ${
                        selectedMajor === m.code
                          ? "bg-teal-600 text-white"
                          : "border border-teal-400 text-teal-700 hover:bg-teal-50 dark:text-teal-300"
                      } disabled:opacity-60`}
                    >
                      {selectedMajor === m.code ? "Selected" : "Select"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default StudentMajorSelection;
