import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { api } from "../lib/api";
import { User } from "../types";

const StudentProgressCurrent: React.FC<{ user: User; onLogout: () => void }> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [programType, setProgramType] = useState<"4-year" | "5-year">("4-year");
  const [ruleNote, setRuleNote] = useState<string>("4-year program (2024-2025 and later)");
  const [currentYear, setCurrentYear] = useState("");
  const [currentSemester, setCurrentSemester] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const location = useLocation();
  useEffect(() => {
    const st: any = location.state;
    if (st?.program_type) {
      const pt = st.program_type === "5-year" ? "5-year" : "4-year";
      setProgramType(pt);
      const rn = st.program_rule_note || (pt === "5-year" ? "5-year program (before 2024-2025)" : "4-year program (2024-2025 and later)");
      setRuleNote(rn);
      return;
    }
  }, [location.state]);

  useEffect(() => {
    api.studentProgressGet()
      .then((doc) => {
        let pt = (doc?.program_type as string) || "";
        if (!pt && user?.student_profile) {
          const sp = user.student_profile || {};
          const s = String(sp.program_duration || sp.program_type || sp.program || sp.current_year || "").toLowerCase();
          if (s.includes("5") || s.includes("five") || s.includes("old")) pt = "5-year";
          else if (s.includes("4") || s.includes("four") || s.includes("new")) pt = "4-year";
        }
        if (!pt) pt = "4-year";
        setProgramType(pt === "5-year" ? "5-year" : "4-year");
        const rn =
          (doc?.program_rule_note as string) ||
          (pt === "5-year" ? "5-year program (before 2024-2025)" : "4-year program (2024-2025 and later)");
        setRuleNote(rn);
        setCurrentYear(doc?.current_year || "");
        setCurrentSemester(doc?.current_semester || "");
      })
      .catch(() => {
        // Fallback entirely from user on error
        const sp = (user?.student_profile || {}) as any;
        const s = String(sp.program_duration || sp.program_type || sp.program || sp.current_year || "").toLowerCase();
        const pt = s.includes("5") || s.includes("five") || s.includes("old") ? "5-year" : "4-year";
        setProgramType(pt);
        setRuleNote(pt === "5-year" ? "5-year program (before 2024-2025)" : "4-year program (2024-2025 and later)");
      });
  }, []);

  const yearOptions = useMemo(() => {
    const base = ["First Year", "Second Year", "Third Year", "Fourth Year"];
    return programType === "5-year" ? [...base, "Fifth Year"] : base;
  }, [programType]);

  const semesterOptions = ["First Semester", "Second Semester"];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!currentYear || !currentSemester) {
      setError("Please select current study year and semester");
      return;
    }
    setLoading(true);
    try {
      const resp: any = await api.studentProgressSaveCurrent({ current_year: currentYear, current_semester: currentSemester });
      const yr = (currentYear || "").toLowerCase();
      const yearNum = yr.includes("first") ? 1 : yr.includes("second") ? 2 : yr.includes("third") ? 3 : yr.includes("fourth") ? 4 : yr.includes("fifth") ? 5 : 0;
      if (yearNum <= 2) {
        navigate("/student/major/locked", { replace: true });
        return;
      }
      const effectiveProgram = (resp?.program_type || programType);
      if (effectiveProgram === "4-year") {
        navigate("/student/major/select", { replace: true });
      } else {
        if (yearNum === 3) {
          navigate("/student/major/track", { replace: true });
        } else {
          navigate("/student/major/select", { replace: true });
        }
      }
    } catch (err: any) {
      setError(err?.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark">
      <Sidebar user={user} onLogout={onLogout} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title="Major Selection Progress" user={user} />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="max-w-xl mx-auto bg-white dark:bg-[#162a2d] rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h1 className="text-xl font-bold text-[#0d1a1c] dark:text-white mb-4">Step 2: Current Year & Semester</h1>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">Program: {ruleNote}</p>
            {error && <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>}
            <form onSubmit={submit} className="space-y-4">
              <div className="text-sm">
                <div className="font-semibold text-[#0d1a1c] dark:text-gray-200 mb-1">Current Study Year</div>
                <select
                  value={currentYear}
                  onChange={(e) => setCurrentYear(e.target.value)}
                  className="w-full h-11 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-[#0d1a1c] text-[#0d1a1c] dark:text-white"
                >
                  <option value="">Select year</option>
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div className="text-sm">
                <div className="font-semibold text-[#0d1a1c] dark:text-gray-200 mb-1">Current Semester</div>
                <select
                  value={currentSemester}
                  onChange={(e) => setCurrentSemester(e.target.value)}
                  className="w-full h-11 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-[#0d1a1c] text-[#0d1a1c] dark:text-white"
                >
                  <option value="">Select semester</option>
                  {semesterOptions.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <button disabled={loading} className="w-full h-11 rounded-lg bg-primary text-white font-bold hover:bg-opacity-90 transition">
                {loading ? "Saving..." : "Confirm Selection"}
              </button>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
};

export default StudentProgressCurrent;
