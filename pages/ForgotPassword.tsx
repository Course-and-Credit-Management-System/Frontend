import React, { useState, type FormEvent } from "react";
import { api } from "../lib/api";

type Props = {
  onClose: () => void;
};

const ForgotPassword: React.FC<Props> = ({ onClose }) => {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const cleaned = email.trim().toLowerCase();

    try {
      await api.forgotPassword(cleaned);
      setSent(true);
    } catch {
      // Always show success for security (avoid user enumeration)
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-[#162a2d] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">lock_reset</span>
              </div>
              <div>
                <h2 className="text-[#0d1a1c] dark:text-white font-bold text-lg">
                  Forgot Password
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  We’ll email you a reset link.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="text-gray-500 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition"
              aria-label="Close"
              type="button"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-6">
            {sent ? (
              <div className="text-center">
                <h3 className="text-[#0d1a1c] dark:text-white font-bold text-xl">
                  Check your email
                </h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  If the account exists, a reset link has been sent.
                </p>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  (It may take a few seconds. Check spam if needed.)
                </p>

                <button
                  onClick={onClose}
                  className="mt-6 w-full bg-primary text-white font-bold py-3 rounded-lg shadow-lg shadow-primary/20 hover:bg-opacity-90 active:scale-[0.98] transition-all"
                  type="button"
                >
                  Back to login
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[#0d1a1c] dark:text-gray-200 text-sm font-semibold">
                    University email
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. miles.d@uni.edu"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0d1a1c] text-[#0d1a1c] dark:text-white h-12 px-4 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-gray-400"
                  />
                </div>

                <button
                  disabled={loading}
                  className="w-full bg-primary text-white font-bold py-3.5 rounded-lg shadow-lg shadow-primary/20 hover:bg-opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  type="submit"
                >
                  {loading ? "Sending..." : "Send reset link"}
                  <span className="material-symbols-outlined">send</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-3 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition"
                >
                  Back
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ForgotPassword;
