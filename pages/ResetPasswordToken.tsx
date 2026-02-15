import React, { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api";

const ResetPasswordToken: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setError("Invalid or missing reset token. Please request a new password reset link.");
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const pwd = newPassword.trim();
    const confirm = confirmPassword.trim();

    if (!pwd || !confirm) {
      setError("Please fill in all fields.");
      return;
    }

    if (pwd.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (pwd !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await api.resetPasswordWithToken({ token, new_password: pwd });
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || "Failed to reset password. The link may have expired.");
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
          <h2 className="text-[#0d1a1c] dark:text-white text-xl font-bold tracking-tight">UniPortal</h2>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6 z-10">
        <div className="max-w-[480px] w-full flex flex-col gap-6">
          <div className="bg-white dark:bg-[#162a2d] shadow-xl rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800">
            <div className="h-32 bg-primary/10 relative flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent"></div>
              <div className="relative z-10 flex flex-col items-center">
                <span className="material-symbols-outlined text-primary text-5xl mb-2">lock_reset</span>
                <h1 className="text-[#0d1a1c] dark:text-white text-2xl font-bold">Set New Password</h1>
              </div>
            </div>

            <div className="p-8">
              {success ? (
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="material-symbols-outlined text-green-600 text-3xl">check_circle</span>
                  </div>
                  <h3 className="text-lg font-semibold text-[#0d1a1c] dark:text-white mb-2">Password Reset Successful!</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
                    Your password has been changed successfully. You can now log in with your new password.
                  </p>
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-2 bg-primary text-white font-bold py-3 px-6 rounded-lg hover:bg-opacity-90 transition-all"
                  >
                    <span className="material-symbols-outlined">login</span>
                    Go to Login
                  </Link>
                </div>
              ) : !token ? (
                <div className="text-center">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="material-symbols-outlined text-red-600 text-3xl">error</span>
                  </div>
                  <h3 className="text-lg font-semibold text-[#0d1a1c] dark:text-white mb-2">Invalid Link</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
                    This password reset link is invalid or has expired. Please request a new one.
                  </p>
                  <Link
                    to="/forgot-password"
                    className="inline-flex items-center gap-2 bg-primary text-white font-bold py-3 px-6 rounded-lg hover:bg-opacity-90 transition-all"
                  >
                    <span className="material-symbols-outlined">mail</span>
                    Request New Link
                  </Link>
                </div>
              ) : (
                <>
                  <p className="text-gray-600 dark:text-gray-400 text-sm text-center mb-6">
                    Enter your new password below. Make sure it's at least 8 characters long.
                  </p>

                  {error && (
                    <div className="mb-4 p-2 bg-red-100 text-red-700 text-xs rounded text-center">
                      {error}
                    </div>
                  )}

                  <form className="space-y-5" onSubmit={handleSubmit}>
                    <div className="flex flex-col gap-2">
                      <label className="text-[#0d1a1c] dark:text-gray-200 text-sm font-semibold flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg">key</span>
                        New Password
                      </label>
                      <input
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0d1a1c] text-[#0d1a1c] dark:text-white h-12 px-4 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-gray-400"
                        placeholder="Enter new password (min 8 characters)"
                        type="password"
                        autoComplete="new-password"
                        autoFocus
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-[#0d1a1c] dark:text-gray-200 text-sm font-semibold flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg">verified</span>
                        Confirm New Password
                      </label>
                      <input
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
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
                      {loading ? "Resetting..." : "Reset Password"}
                      <span className="material-symbols-outlined">check</span>
                    </button>
                  </form>

                  <div className="mt-6 text-center">
                    <Link
                      to="/login"
                      className="inline-flex items-center gap-2 text-primary font-semibold hover:underline text-sm"
                    >
                      <span className="material-symbols-outlined text-lg">arrow_back</span>
                      Back to Login
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex justify-center items-center gap-6 text-gray-500 dark:text-gray-400 text-xs font-medium">
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">encrypted</span>
              Secure Connection
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

