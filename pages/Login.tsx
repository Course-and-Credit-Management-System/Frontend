import React, { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";

import ForgotPassword from "./ForgotPassword"; // must be the modal component version (Props: onClose)
import { Role, User } from "../types";
import { api } from "../lib/api";

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ modal open/close via query param so login stays behind it
  const params = new URLSearchParams(location.search);
  const showForgot = params.get("forgot") === "1";

  const openForgot = () => navigate("/login?forgot=1", { replace: true });
  const closeForgot = () => navigate("/login", { replace: true });

  const [role, setRole] = useState<Role>("student");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleRoleChange = (newRole: Role) => {
    setRole(newRole);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    if (!cleanUsername || !cleanPassword) {
      setError("Please enter username and password.");
      return;
    }

    setLoading(true);

    try {
      const data = await api.login({
        username: cleanUsername,
        password: cleanPassword,
        role,
      });

      const userFromBackend = data?.user as User | undefined;
      if (!userFromBackend) {
        throw new Error("Login succeeded but no user returned.");
      }

      // ✅ store must_reset_password locally too
      const mustReset = !!data?.must_reset_password;

      // IMPORTANT: attach it to the user so App.tsx can guard routes
      const userWithFlag: User = { ...userFromBackend, must_reset_password: mustReset };

      sessionStorage.setItem("role", userWithFlag.role);
      sessionStorage.setItem("user", JSON.stringify(userWithFlag));
      sessionStorage.setItem("must_reset_password", String(mustReset));
      if (typeof data?.access_token === "string" && data.access_token.length > 0) {
        localStorage.setItem("access_token", data.access_token);
        // Also set cookie for backend compatibility
        document.cookie = `access_token=${data.access_token}; path=/; max-age=86400; SameSite=Lax`;
      }

      onLogin(userWithFlag);

      // ✅ force reset immediately
      if (mustReset) {
        navigate("/reset-password", { replace: true });
      }
    } catch (err: any) {
      setError(err?.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="bg-white dark:bg-slate-950 min-h-screen flex flex-col font-poppins transition-colors duration-500 relative overflow-hidden">
        <header className="w-full flex items-center justify-between whitespace-nowrap border-b border-slate-100 dark:border-slate-800 px-8 lg:px-24 py-6 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md z-50">
          <div className="flex items-center gap-4 text-teal-600">
            <div className="h-10 w-10 rounded-2xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center text-teal-600 dark:text-teal-400">
              <svg fill="currentColor" className="w-6 h-6" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path d="M44 4H30.6666V17.3334H17.3334V30.6666H4V44H44V4Z"></path>
              </svg>
            </div>
            <h2 className="text-slate-900 dark:text-white text-2xl font-black tracking-tight">UniPortal</h2>
          </div>
          <div className="flex flex-1 justify-end gap-8 items-center">
            <div className="hidden md:flex items-center gap-8">
              <a
                className="text-slate-400 dark:text-slate-500 text-xs font-black uppercase tracking-widest hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                href="#"
              >
                Help Desk
              </a>
              <a
                className="text-slate-400 dark:text-slate-500 text-xs font-black uppercase tracking-widest hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                href="#"
              >
                System Status
              </a>
            </div>
            <button
              type="button"
              className="px-6 py-2.5 rounded-2xl bg-slate-900 dark:bg-teal-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 dark:hover:bg-teal-700 transition-all shadow-lg active:scale-95"
            >
              Contact IT
            </button>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-8 z-10">
          <div className="max-w-[520px] w-full flex flex-col gap-10 animate-in fade-in duration-1000 slide-in-from-bottom-8">
            <div className="bg-white dark:bg-slate-900 shadow-2xl rounded-[48px] border border-slate-100 dark:border-slate-800 p-12 relative overflow-hidden transition-all hover:shadow-teal-500/5">
              <div className="absolute top-0 right-0 h-32 w-32 bg-teal-500/5 rounded-bl-full pointer-events-none" />
              
              <div className="flex flex-col items-center mb-12">
                <div className="h-16 w-16 rounded-[24px] bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-300 dark:text-slate-700 mb-6 border border-slate-100 dark:border-slate-800 shadow-inner">
                  <span className="material-symbols-outlined text-4xl">security</span>
                </div>
                <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Protocol Access</h1>
                <p className="text-sm font-medium text-slate-400 dark:text-slate-500">Secure entry to institutional resources</p>
              </div>

              <div className="p-1.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center mb-10 shadow-inner">
                <button
                  type="button"
                  onClick={() => handleRoleChange("student")}
                  className={`flex-1 flex items-center justify-center rounded-xl py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
                    role === "student"
                      ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xl ring-1 ring-slate-100 dark:ring-slate-700"
                      : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  }`}
                >
                  Student Identity
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleChange("admin")}
                  className={`flex-1 flex items-center justify-center rounded-xl py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
                    role === "admin"
                      ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xl ring-1 ring-slate-100 dark:ring-slate-700"
                      : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  }`}
                >
                  Administrative
                </button>
              </div>

              {error && (
                <div className="mb-8 p-4 rounded-2xl bg-rose-50 text-rose-700 text-xs font-bold border border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-900/40 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                  <span className="material-symbols-outlined text-lg">error_outline</span>
                  {error}
                </div>
              )}

              <form className="space-y-8" onSubmit={handleSubmit}>
                <div className="space-y-3 group">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-teal-600">Institutional ID</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-teal-500 transition-colors">fingerprint</span>
                    <input
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full rounded-[24px] border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 pl-14 pr-6 py-4 text-base font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500/50 transition-all placeholder:text-slate-300"
                      placeholder={role === "admin" ? "ADM-xxxx" : "TNT-xxxx"}
                      type="text"
                      autoComplete="username"
                    />
                  </div>
                </div>

                <div className="space-y-3 group">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-teal-600">Authorization Key</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-teal-500 transition-colors">key</span>
                    <input
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-[24px] border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 pl-14 pr-14 py-4 text-base font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500/50 transition-all placeholder:text-slate-300"
                      placeholder="••••••••"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-teal-600 transition-colors"
                    >
                      <span className="material-symbols-outlined text-xl">
                        {showPassword ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between py-2">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                      <input
                        className="sr-only"
                        type="checkbox"
                      />
                      <div className="w-10 h-5 bg-slate-100 dark:bg-slate-800 rounded-full transition-colors group-hover:bg-slate-200 dark:group-hover:bg-slate-700" />
                      <div className="absolute left-1 top-1 w-3 h-3 bg-white dark:bg-slate-400 rounded-full transition-transform" />
                    </div>
                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest group-hover:text-slate-600 transition-colors">Persist Session</span>
                  </label>

                  <button
                    type="button"
                    onClick={openForgot}
                    className="text-[10px] font-black text-teal-600 uppercase tracking-widest hover:text-teal-700 transition-colors pb-0.5 border-b-2 border-teal-600/10"
                  >
                    Reset Credentials
                  </button>
                </div>
                

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-slate-900 dark:bg-teal-600 text-white text-xs font-black uppercase tracking-[0.2em] py-5 rounded-[24px] shadow-2xl hover:bg-slate-800 dark:hover:bg-teal-700 active:scale-[0.98] transition-all flex items-center justify-center gap-4 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Authenticating
                    </>
                  ) : (
                    <>
                      Authorize Session
                      <span className="material-icons-outlined text-lg">east</span>
                    </>
                  )}
                </button>
              </form>

              <div className="mt-12 pt-10 border-t border-slate-50 dark:border-slate-800 text-center space-y-6">
                <div className="flex items-center justify-center gap-3 text-slate-300 dark:text-slate-600 text-[9px] font-black uppercase tracking-[0.3em]">
                  <span className="material-symbols-outlined text-sm">verified_user</span>
                  256-BIT ENCRYPTION ACTIVE
                </div>
                <p className="text-slate-400 dark:text-slate-500 text-xs leading-relaxed font-medium max-w-xs mx-auto">
                  Encountering access issues? Visit our{" "}
                  <a className="text-teal-600 font-bold hover:underline" href="#">
                    Support Nexus
                  </a>{" "}
                  for protocol assistance.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-center items-center gap-8 text-slate-400 dark:text-slate-600 text-[10px] font-black uppercase tracking-[0.3em]">
              <a className="hover:text-teal-600 transition-colors" href="#">
                Privacy
              </a>
              <span className="hidden sm:block size-1 bg-slate-200 dark:bg-slate-800 rounded-full"></span>
              <a className="hover:text-teal-600 transition-colors" href="#">
                Governance
              </a>
              <span className="hidden sm:block size-1 bg-slate-200 dark:bg-slate-800 rounded-full"></span>
              <button className="flex items-center gap-2 hover:text-teal-600 transition-colors">
                <span className="material-symbols-outlined text-base">language</span>
                ENG (US)
              </button>
            </div>
          </div>
        </main>

        {/* Global UI Decoration */}
        <div className="fixed top-0 right-0 -z-0 w-[600px] h-[600px] bg-teal-500/[0.03] dark:bg-teal-500/[0.02] rounded-full blur-[120px] pointer-events-none translate-x-1/2 -translate-y-1/2" />
        <div className="fixed bottom-0 left-0 -z-0 w-[500px] h-[500px] bg-indigo-500/[0.03] dark:bg-indigo-500/[0.02] rounded-full blur-[100px] pointer-events-none -translate-x-1/2 translate-y-1/2" />
      </div>

      {/* ✅ Forgot Password modal on top of login page */}
      {showForgot && <ForgotPassword onClose={closeForgot} />}
    </>
  );
};

export default Login;
