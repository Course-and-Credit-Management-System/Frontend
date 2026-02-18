import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { User } from "../types";

const StudentSpecialMajorError: React.FC<{ user: User; onLogout: () => void }> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation() as any;
  const msg: string = location?.state?.message || "You are not eligible for Special Major Access at this time.";
  const already: boolean = !!location?.state?.already;

  return (
    <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark">
      <Sidebar user={user} onLogout={onLogout} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title="Special Major Access" user={user} />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="max-w-3xl mx-auto">
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
              <div className="flex items-center gap-2">
                <span className="material-icons-round">error</span>
                <h2 className="text-lg font-bold">Access Denied</h2>
              </div>
              <p className="mt-2">{msg}</p>
              {already && <p className="mt-1">A major is already recorded for your profile.</p>}
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => navigate("/student/dashboard", { replace: true })}
                  className="px-3 py-2 text-xs font-bold text-primary border border-primary/20 hover:bg-primary/5 rounded-xl uppercase tracking-wide"
                >
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

export default StudentSpecialMajorError;
