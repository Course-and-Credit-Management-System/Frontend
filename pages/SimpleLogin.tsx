import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { http } from "../lib/axios";

const SimpleLogin: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const em = email.trim();
    const pw = password.trim();
    if (!em || !pw) {
      setError("Enter email and password");
      return;
    }
    setLoading(true);
    try {
      const res = await http.post("/login", { email: em, password: pw });
      const token = res.data?.access_token;
      if (typeof token === "string" && token.length > 0) {
        localStorage.setItem("access_token", token);
        navigate("/student/dashboard", { replace: true });
      } else {
        setError("Unexpected response");
      }
    } catch (err: any) {
      setError(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0d1a1c]">
      <form onSubmit={submit} className="w-full max-w-sm bg-white dark:bg-[#162a2d] rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-lg">
        <h1 className="text-xl font-bold text-[#0d1a1c] dark:text-white mb-4">Sign In</h1>
        {error && <div className="mb-3 text-sm text-red-600">{error}</div>}
        <label className="text-sm font-semibold text-[#0d1a1c] dark:text-gray-200">Email</label>
        <input className="w-full h-11 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-[#0d1a1c] text-[#0d1a1c] dark:text-white mb-3" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <label className="text-sm font-semibold text-[#0d1a1c] dark:text-gray-200">Password</label>
        <input className="w-full h-11 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-[#0d1a1c] text-[#0d1a1c] dark:text-white mb-4" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button disabled={loading} className="w-full h-11 rounded-lg bg-primary text-white font-bold hover:bg-opacity-90 transition">
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </div>
  );
};

export default SimpleLogin;
