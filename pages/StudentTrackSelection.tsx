import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { User } from "../types";
import { api } from "../lib/api";

const TrackCard: React.FC<{ code: "CS" | "CT"; title: string; desc: string; onSelect: () => void; disabled?: boolean }> = ({ code, title, desc, onSelect, disabled }) => (
  <div className={`rounded-2xl p-5 border shadow-sm transition-all ${disabled ? "opacity-60 cursor-not-allowed" : "hover:shadow-md hover:-translate-y-0.5"} bg-white dark:bg-[#162a2d] border-teal-300 dark:border-teal-700/60`}>
    <div className="flex items-center gap-2">
      <span className="material-icons-outlined text-teal-600 dark:text-teal-400">school</span>
      <h3 className="text-lg font-bold text-[#0d1a1c] dark:text-white">{title}</h3>
      <span className="ml-auto text-[11px] px-2 py-1 rounded-full bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">{code}</span>
    </div>
    <div className="mt-3">
      <div className="text-[12px] font-semibold text-gray-600 dark:text-gray-300">Overview</div>
      <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{desc}</p>
    </div>
    <button
      disabled={disabled}
      onClick={onSelect}
      className={`mt-4 inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold ${disabled ? "bg-gray-200 text-gray-500 dark:bg-gray-800 dark:text-gray-400" : "border border-teal-400 text-teal-700 hover:bg-teal-50 dark:text-teal-300"}`}
    >
      Choose Track
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
    <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark">
      <Sidebar user={user} onLogout={onLogout} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title="Track Selection" user={user} />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="rounded-2xl p-6 bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-[#0f2326] dark:to-[#0c1a1c] border border-teal-200 dark:border-teal-800/40">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="material-icons-outlined text-teal-600 dark:text-teal-400">route</span>
                    <h1 className="text-2xl font-bold text-[#0d1a1c] dark:text-white">Choose Your Track</h1>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">Select CS or CT to proceed to major selection based on your program rules.</p>
                </div>
                {eligibility?.program_type && (
                  <span className="text-xs px-2 py-1 rounded-full bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">{eligibility.program_type}</span>
                )}
              </div>
              {eligibility && !eligibility.can_select_track && (
                <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800 dark:border-yellow-900/40 dark:bg-yellow-900/20 dark:text-yellow-200">
                  Track selection is currently locked. {eligibility.reason || ""}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TrackCard code="CS" title="Computer Science (CS)" desc="Software, AI, systems, and security." onSelect={() => choose("CS")} disabled={!!(eligibility && !eligibility.can_select_track)} />
              <TrackCard code="CT" title="Computer Technology (CT)" desc="Networks, hardware, embedded, and infrastructure." onSelect={() => choose("CT")} disabled={!!(eligibility && !eligibility.can_select_track)} />
            </div>

            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-surface-light dark:bg-surface-dark p-5">
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 text-sm">
                <span className="material-icons-outlined text-teal-600 dark:text-teal-400">info</span>
                <span>For 5-year students, select your track in Third Year. Majors become available in Fourth Year, First Semester.</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default StudentTrackSelection;
