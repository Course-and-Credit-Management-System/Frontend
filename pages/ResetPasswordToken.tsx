import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";

function getTokenFromHash() {
  // HashRouter: window.location.hash = "#/reset-password-token?token=XYZ"
  const hash = window.location.hash || "";
  const q = hash.split("?")[1] || "";
  const params = new URLSearchParams(q);
  return params.get("token");
}

const ResetPasswordToken: React.FC = () => {
  const navigate = useNavigate();

  const token = useMemo(() => getTokenFromHash(), []);

  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);

  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Invalid or missing reset token.");
      return;
    }

    const p = pw.trim();
    const c = confirm.trim();

    if (p.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    // bcrypt max is 72 BYTES (not chars)
    if (new TextEncoder().encode(p).length > 72) {
      setError("Password is too long. Please use 72 bytes or fewer.");
      return;
    }

    if (p !== c) {
      setError("Password and confirmation do not match.");
      return;
    }

    setLoading(true);
    try {
      await api.resetPasswordWithToken({ token, new_password: p });
      setDone(true);
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
        <div className="max-w-[520px] w-full flex flex-col gap-6">
          <div className="bg-white dark:bg-[#162a2d] shadow-xl rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800">
            <div className="h-28 bg-primary/10 relative flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent"></div>
              <div className="relative z-10 flex flex-col items-center">
                <span className="material-symbols-outlined text-primary text-5xl mb-1">
                  lock_reset
                </span>
                <h1 className="text-[#0d1a1c] dark:text-white text-2xl font-bold">
                  Reset Password
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Enter a new password to continue.
                </p>
              </div>
            </div>

            <div className="p-8">
              {done ? (
                <div className="text-center">
                  <h2 className="text-[#0d1a1c] dark:text-white text-xl font-bold">
                    Password updated 🎉
                  </h2>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
                    You can now log in with your new password.
                  </p>

                  <button
                    type="button"
                    onClick={() => navigate("/login", { replace: true })}
                    className="mt-6 w-full bg-primary text-white font-bold py-3 rounded-lg shadow-lg shadow-primary/20 hover:bg-opacity-90 active:scale-[0.98] transition-all"
                  >
                    Go to login
                  </button>
                </div>
              ) : (
                <>
                  {error && (
                    <div className="mb-4 p-2 bg-red-100 text-red-700 text-xs rounded text-center">
                      {error}
                    </div>
                  )}

                  <form className="space-y-5" onSubmit={submit}>
                    <div className="flex flex-col gap-2">
                      <label className="text-[#0d1a1c] dark:text-gray-200 text-sm font-semibold flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg">key</span>
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          value={pw}
                          onChange={(e) => setPw(e.target.value)}
                          className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0d1a1c] text-[#0d1a1c] dark:text-white h-12 px-4 pr-12 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-gray-400"
                          placeholder="New password (min 8 chars)"
                          type={show ? "text" : "password"}
                          autoComplete="new-password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShow((s) => !s)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary transition-colors"
                          aria-label={show ? "Hide password" : "Show password"}
                        >
                          <span className="material-symbols-outlined text-xl">
                            {show ? "visibility_off" : "visibility"}
                          </span>
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Tip: keep it under 72 bytes (bcrypt limit).
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-[#0d1a1c] dark:text-gray-200 text-sm font-semibold flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg">verified</span>
                        Confirm Password
                      </label>
                      <input
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0d1a1c] text-[#0d1a1c] dark:text-white h-12 px-4 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-gray-400"
                        placeholder="Confirm new password"
                        type={show ? "text" : "password"}
                        autoComplete="new-password"
                        required
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

                    <button
                      type="button"
                      onClick={() => navigate("/login", { replace: true })}
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0d1a1c] text-[#0d1a1c] dark:text-white font-semibold py-3 hover:border-primary/40 transition-all"
                    >
                      Back to login
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>

          <div className="flex justify-center items-center gap-6 text-gray-500 dark:text-gray-400 text-xs font-medium">
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">encrypted</span>
              Secure password reset link
            </span>
          </div>
        </div>
      </main>

      <div className="fixed top-0 right-0 -z-0 w-1/3 h-1/3 bg-primary/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="fixed bottom-0 left-0 -z-0 w-1/4 h-1/4 bg-primary/5 rounded-full blur-[100px] pointer-events-none"></div>
    </div>
  );
};

export default ResetPasswordToken;
