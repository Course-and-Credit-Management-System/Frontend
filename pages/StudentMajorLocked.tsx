import React from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { User } from "../types";
import { useNavigate } from "react-router-dom";

const StudentMajorLocked: React.FC<{ user: User; onLogout: () => void }> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  return (
    <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark">
      <Sidebar user={user} onLogout={onLogout} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title="Major Selection" user={user} />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="max-w-3xl mx-auto">
            <div className="rounded-2xl p-6 bg-gradient-to-r from-rose-50 to-pink-50 dark:from-[#241317] dark:to-[#1a0f12] border border-rose-200 dark:border-rose-900/40">
              <div className="flex items-start gap-3">
                <span className="material-icons-outlined text-rose-600 dark:text-rose-300">lock</span>
                <div>
                  <h1 className="text-2xl font-bold text-[#0d1a1c] dark:text-white">Major Selection Locked</h1>
                  <p className="mt-2 text-sm text-rose-800 dark:text-rose-200">
                    Major changes are locked for First and Second Year. Available later per program rules.
                  </p>
                </div>
              </div>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => navigate("/student/progress/current")}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-rose-300 text-rose-800 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-200"
                >
                  <span className="material-icons-outlined text-[18px]">edit_calendar</span>
                  Update Year & Semester
                </button>
                <button
                  onClick={() => navigate("/student/dashboard")}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-opacity-90"
                >
                  <span className="material-icons-outlined text-[18px]">home</span>
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default StudentMajorLocked;
