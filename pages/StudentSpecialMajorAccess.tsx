import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
  if (track === "CS") return ALL_MAJORS.filter((m) => ["SE", "KE", "BIS", "CSec"].includes(m.code));
  return ALL_MAJORS.filter((m) => ["CN", "HPC", "ES"].includes(m.code));
};

const StudentSpecialMajorAccess: React.FC<{ user: User; onLogout: () => void }> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const flowState = (location.state || {}) as {
    old_student_flow?: boolean;
    pending_track?: "CS" | "CT" | null;
    pending_major?: string | null;
    return_to?: string;
  };
  const isOldStudentFlow = !!flowState.old_student_flow;
  const pendingTrack = flowState.pending_track || null;
  const pendingMajor = (flowState.pending_major || "").trim();
  const returnTo = flowState.return_to || "/student/enrollment";
  const [programType, setProgramType] = useState<"4-year" | "5-year">("4-year");
  const [track, setTrack] = useState<"CS" | "CT" | null>(null);
  const [selectedMajor, setSelectedMajor] = useState<string>("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [eligible, setEligible] = useState<boolean>(false);
  const [majors, setMajors] = useState<MajorMeta[]>([]);

  useEffect(() => {
    let cancelled = false;
    const boot = async () => {
      try {
        const elig = await api.specialMajorEligibility();
        if (cancelled) return;
        setProgramType((elig.program_type as "4-year" | "5-year") || "4-year");
        if (!elig.eligible) {
          if (isOldStudentFlow && elig.already_selected) {
            navigate(returnTo, { replace: true });
            return;
          }
          try {
            await api.specialMajorPopulateFromProfile();
          } catch {}
          navigate("/student/special-major/error", {
            replace: true,
            state: { message: elig.reason || "Not eligible for Special Major Access", already: !!elig.already_selected },
          });
          return;
        }
        setEligible(true);
        const toMajorList = (codes: string[]): MajorMeta[] =>
          codes.map((c) => {
            const m = ALL_MAJORS.find((x) => x.code === c);
            if (m) return m;
            return { code: c, title: c, desc: "Major option", rec: "" };
          });

        let opts = await api.specialMajorOptions();
        let effTrack = (opts.track as "CS" | "CT" | null) || null;
        let codes: string[] = (opts.majors as string[]) || [];

        if (isOldStudentFlow && pendingTrack && !effTrack) {
          try {
            await api.specialMajorSelectTrack({ track: pendingTrack });
            opts = await api.specialMajorOptions();
            effTrack = (opts.track as "CS" | "CT" | null) || pendingTrack;
            codes = (opts.majors as string[]) || [];
          } catch {}
        }

        setTrack(effTrack);
        const list = toMajorList(codes);
        setMajors(list);

        if (isOldStudentFlow && pendingMajor) {
          if (list.some((m) => m.code === pendingMajor)) {
            try {
              await api.specialMajorSelect({ major: pendingMajor });
              navigate(returnTo, { replace: true });
              return;
            } catch {}
          }
        }
      } catch (e: any) {
        setError(e?.message || "Failed to initialize");
      }
    };
    boot();
    return () => {
      cancelled = true;
    };
  }, []);

  const options: MajorMeta[] = useMemo(() => {
    if (!eligible) return [];
    if (majors.length > 0) return majors;
    if (programType === "4-year") return ALL_MAJORS;
    if (!track) return [];
    return majorsForTrack(track);
  }, [eligible, programType, track, majors]);

  const select = async (code: string) => {
    setError("");
    setLoading(true);
    try {
      await api.specialMajorSelect({ major: code });
      setSelectedMajor(code);
      alert("Special Major selected and permanently locked.");
      navigate(isOldStudentFlow ? returnTo : "/student/dashboard", { replace: true });
    } catch (e: any) {
      setError(e?.message || "Failed to select");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark">
      <Sidebar user={user} onLogout={onLogout} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title="Special Major Access" user={user} />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-bold text-[#0d1a1c] dark:text-white">{isOldStudentFlow ? "Select Track/Major" : "Select a Special Major"}</h1>
              <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary">{programType}</span>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
              This access allows one-time selection of a major per your program rules. Once selected, it is locked permanently.
            </p>
            {error && <div className="text-sm text-red-600 mb-3">{error}</div>}
            {!eligible ? (
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-6 text-sm text-gray-700 dark:text-gray-300">
                Initializing eligibility...
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {options.map((m) => (
                  <div
                    key={m.code}
                    className="bg-white dark:bg-[#162a2d] rounded-2xl p-5 shadow-sm border border-teal-300 dark:border-teal-700/60"
                  >
                    <div className="flex items-center gap-2">
                      <span className="material-icons-outlined text-teal-600 dark:text-teal-400">workspace_premium</span>
                      <h3 className="text-lg font-bold text-[#0d1a1c] dark:text-white">{`${m.code} (${m.title})`}</h3>
                    </div>
                    <div className="mt-3">
                      <p className="text-sm text-gray-700 dark:text-gray-300">{m.desc}</p>
                    </div>
                    <button
                      disabled={loading}
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

export default StudentSpecialMajorAccess;
