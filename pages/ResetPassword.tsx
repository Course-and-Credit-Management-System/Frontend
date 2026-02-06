import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { User } from "../types";

type Props = {
  user: User;
  onPasswordReset: (updatedUser: User) => void;
};

const ResetPassword: React.FC<Props> = ({ user, onPasswordReset }) => {
  const navigate = useNavigate();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const o = oldPassword.trim();
    const n = newPassword.trim();
    const c = confirm.trim();

    if (!o || !n || !c) {
      setError("Please fill all fields.");
      return;
    }
    if (n !== c) {
      setError("New password and confirmation do not match.");
      return;
    }

    try {
      setLoading(true);
      await api.resetPassword({ old_password: o, new_password: n });

      const me = await api.me();
      onPasswordReset(me);

      navigate(me.role === "admin" ? "/admin/dashboard" : "/student/dashboard", {
        replace: true,
      });
    } catch (err: any) {
      setError(err?.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen flex flex-col font-display transition-colors duration-300 relative overflow-hidden">
      <header className="w-full flex items-center justify-between whitespace-nowrap border-b border-gray-200 dark:border-gray-800 px-6 lg:px-20 py-4 bg-white dark:bg-[#162a2d]">
        <div className="flex items-center gap-3 text-primary">
          <div className="size-8">
            <svg fill="currentColor" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path d="M44 4H30.6666V17.3334H17.3334V30.6666H4V44H44V4Z"></path>
            </svg>
          </div>
          <h2 className="text-[#0d1a1c] dark:text-white text-xl font-bold tracking-tight">
            UniPortal
          </h2>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6 z-10">
        <div className="max-w-[480px] w-full flex flex-col gap-6">
          <div className="bg-white dark:bg-[#162a2d] shadow-xl rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800">
            <div className="h-32 bg-primary/10 relative flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent"></div>
              <div className="relative z-10 flex flex-col items-center">
                <span className="material-symbols-outlined text-primary text-5xl mb-2">
                  lock_reset
                </span>
                <h1 className="text-[#0d1a1c] dark:text-white text-2xl font-bold">
                  Reset Password
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Hi {user.name}, you must reset your password to continue.
                </p>
              </div>
            </div>

            <div className="p-8">
              {error && (
                <div className="mb-4 p-2 bg-red-100 text-red-700 text-xs rounded text-center">
                  {error}
                </div>
              )}

              <form className="space-y-5" onSubmit={submit}>
                <div className="flex flex-col gap-2">
                  <label className="text-[#0d1a1c] dark:text-gray-200 text-sm font-semibold flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg">lock</span>
                    Current Password
                  </label>
                  <input
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0d1a1c] text-[#0d1a1c] dark:text-white h-12 px-4 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-gray-400"
                    placeholder="Enter current password"
                    type="password"
                    autoComplete="current-password"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[#0d1a1c] dark:text-gray-200 text-sm font-semibold flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg">key</span>
                    New Password
                  </label>
                  <input
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0d1a1c] text-[#0d1a1c] dark:text-white h-12 px-4 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-gray-400"
                    placeholder="Enter new password"
                    type="password"
                    autoComplete="new-password"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[#0d1a1c] dark:text-gray-200 text-sm font-semibold flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg">verified</span>
                    Confirm New Password
                  </label>
                  <input
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0d1a1c] text-[#0d1a1c] dark:text-white h-12 px-4 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-gray-400"
                    placeholder="Confirm new password"
                    type="password"
                    autoComplete="new-password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary text-white font-bold py-3.5 rounded-lg shadow-lg shadow-primary/20 hover:bg-opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? "Updating..." : "Update Password"}
                  <span className="material-symbols-outlined">check</span>
                </button>
              </form>
            </div>
          </div>

          <div className="flex justify-center items-center gap-6 text-gray-500 dark:text-gray-400 text-xs font-medium">
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">encrypted</span>
              Cookie-based secure session
            </span>
          </div>
        </div>
      </main>

      <div className="fixed top-0 right-0 -z-0 w-1/3 h-1/3 bg-primary/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="fixed bottom-0 left-0 -z-0 w-1/4 h-1/4 bg-primary/5 rounded-full blur-[100px] pointer-events-none"></div>
    </div>
  );
};

export default ResetPassword;
