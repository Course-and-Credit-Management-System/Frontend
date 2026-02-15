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
          <div className="flex flex-1 justify-end gap-6 items-center">
            <div className="hidden md:flex items-center gap-6">
              <a
                className="text-[#0d1a1c] dark:text-gray-300 text-sm font-medium hover:text-primary transition-colors"
                href="#"
              >
                Help Desk
              </a>
              <a
                className="text-[#0d1a1c] dark:text-gray-300 text-sm font-medium hover:text-primary transition-colors"
                href="#"
              >
                Technical Support
              </a>
            </div>
            <button
              type="button"
              className="flex min-w-[100px] items-center justify-center rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold hover:bg-opacity-90 transition-all"
            >
              Contact IT
            </button>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-6 z-10">
          <div className="max-w-[480px] w-full flex flex-col gap-6">
            <div className="bg-white dark:bg-[#162a2d] shadow-xl rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800">
              <div className="h-32 bg-primary/10 relative flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent"></div>
                <div className="relative z-10 flex flex-col items-center">
                  <span className="material-symbols-outlined text-primary text-5xl mb-2">school</span>
                  <h1 className="text-[#0d1a1c] dark:text-white text-2xl font-bold">Welcome Back</h1>
                </div>
              </div>

              <div className="p-8">
                <div className="flex h-11 items-center justify-center rounded-lg bg-gray-100 dark:bg-[#0d1a1c] p-1 mb-8">
                  <button
                    type="button"
                    onClick={() => handleRoleChange("student")}
                    className={`flex grow items-center justify-center rounded-lg px-2 text-sm font-semibold transition-all h-full ${
                      role === "student"
                        ? "bg-white dark:bg-primary text-primary dark:text-white shadow-sm"
                        : "text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    Student
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRoleChange("admin")}
                    className={`flex grow items-center justify-center rounded-lg px-2 text-sm font-semibold transition-all h-full ${
                      role === "admin"
                        ? "bg-white dark:bg-primary text-primary dark:text-white shadow-sm"
                        : "text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    Staff/Admin
                  </button>
                </div>

                {error && (
                  <div className="mb-4 p-2 bg-red-100 text-red-700 text-xs rounded text-center">
                    {error}
                  </div>
                )}

                <form className="space-y-5" onSubmit={handleSubmit}>
                  <div className="flex flex-col gap-2">
                    <label className="text-[#0d1a1c] dark:text-gray-200 text-sm font-semibold flex items-center gap-2">
                      <span className="material-symbols-outlined text-lg">person</span>
                      University Email or ID
                    </label>
                    <input
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0d1a1c] text-[#0d1a1c] dark:text-white h-12 px-4 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-gray-400"
                      placeholder={`e.g. ${
                        role === "admin" ? "ADM-001 or admin@uni.edu" : "TNT-8801 or student@uni.edu"
                      }`}
                      type="text"
                      autoComplete="username"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[#0d1a1c] dark:text-gray-200 text-sm font-semibold flex items-center gap-2">
                      <span className="material-symbols-outlined text-lg">lock</span>
                      Password
                    </label>
                    <div className="relative">
                      <input
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0d1a1c] text-[#0d1a1c] dark:text-white h-12 px-4 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-gray-400"
                        placeholder="••••••••"
                        type="password"
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary transition-colors"
                      >
                        <span className="material-symbols-outlined text-xl">visibility</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm py-2">
                    <label className="flex items-center gap-2 cursor-pointer text-gray-600 dark:text-gray-400">
                      <input
                        className="rounded border-gray-300 dark:border-gray-700 text-primary focus:ring-primary size-4 cursor-pointer"
                        type="checkbox"
                      />
                      Remember me
                    </label>

                    {/* ✅ open modal instead of navigating away */}
                    <button
                      type="button"
                      onClick={openForgot}
                      className="text-primary font-semibold hover:underline decoration-2 underline-offset-4"
                    >
                      Forgot Password?
                    </button>
                  </div>
                <div className="flex items-center justify-between text-sm py-2">
                  <label className="flex items-center gap-2 cursor-pointer text-gray-600 dark:text-gray-400">
                    <input className="rounded border-gray-300 dark:border-gray-700 text-primary focus:ring-primary size-4 cursor-pointer" type="checkbox" />
                    Remember me
                  </label>
                  <Link className="text-primary font-semibold hover:underline decoration-2 underline-offset-4" to="/forgot-password">
                    Forgot Password?
                  </Link>
                </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary text-white font-bold py-3.5 rounded-lg shadow-lg shadow-primary/20 hover:bg-opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loading ? "Signing in..." : "Sign In to Portal"}
                    <span className="material-symbols-outlined">login</span>
                  </button>
                </form>

                <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 text-center">
                  <div className="flex items-center justify-center gap-2 text-gray-400 text-xs mb-4">
                    <span className="material-symbols-outlined text-sm">encrypted</span>
                    Secure 256-bit SSL Encrypted Connection
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs">
                    Having trouble? Visit our{" "}
                    <a className="text-primary hover:underline" href="#">
                      Knowledge Base
                    </a>{" "}
                    or contact the system administrator.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-center items-center gap-6 text-gray-500 dark:text-gray-400 text-xs font-medium">
              <a className="hover:text-primary transition-colors" href="#">
                Privacy Policy
              </a>
              <span className="size-1 bg-gray-300 dark:bg-gray-700 rounded-full"></span>
              <a className="hover:text-primary transition-colors" href="#">
                Terms of Service
              </a>
              <span className="size-1 bg-gray-300 dark:bg-gray-700 rounded-full"></span>
              <button className="flex items-center gap-1 hover:text-primary transition-colors">
                <span className="material-symbols-outlined text-sm">language</span>
                English (US)
              </button>
            </div>
          </div>
        </main>

        <div className="fixed top-0 right-0 -z-0 w-1/3 h-1/3 bg-primary/5 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="fixed bottom-0 left-0 -z-0 w-1/4 h-1/4 bg-primary/5 rounded-full blur-[100px] pointer-events-none"></div>
      </div>

      {/* ✅ Forgot Password modal on top of login page */}
      {showForgot && <ForgotPassword onClose={closeForgot} />}
    </>
  );
};

export default Login;
