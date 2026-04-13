import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { http } from "../lib/axios";

const SimpleLogin: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
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
      setError(t('enterEmailPassword'));
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
        setError(t('unexpectedResponse'));
      }
    } catch (err: any) {
      setError(err?.message || t('loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0d1a1c]">
      <div className="absolute top-4 right-4 z-50">
        <LanguageSwitcher />
      </div>
      <form onSubmit={submit} className="w-full max-w-sm bg-white dark:bg-[#162a2d] rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-lg">
        <h1 className="text-xl font-bold text-[#0d1a1c] dark:text-white mb-4">{t('signIn')}</h1>
        {error && <div className="mb-3 text-sm text-red-600">{error}</div>}
        <label className="text-sm font-semibold text-[#0d1a1c] dark:text-gray-200">{t('email')}</label>
        <input className="w-full h-11 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-[#0d1a1c] text-[#0d1a1c] dark:text-white mb-3" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <label className="text-sm font-semibold text-[#0d1a1c] dark:text-gray-200">{t('password')}</label>
        <input className="w-full h-11 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-[#0d1a1c] text-[#0d1a1c] dark:text-white mb-4" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button disabled={loading} className="w-full h-11 rounded-lg bg-primary text-white font-bold hover:bg-opacity-90 transition">
          {loading ? t('signingIn') : t('signIn')}
        </button>
      </form>
    </div>
  );
};

export default SimpleLogin;
