// pages/StudentMessages.tsx
import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import { api } from "../lib/api";
import { User } from "../types";
import Header from "../components/Header";
import { useTranslation } from 'react-i18next';

type Props = {
  user: User;
  onLogout: () => void;
};

type StudentMessage = {
  _id: string;
  sender_id: string;
  receiver_id: string;
  subject: string;
  body: string;
  category?: string;
  attachments?: string[];
  sent_at?: string;
  is_read?: boolean;
};

const fmt = (iso?: string) => {
  if (!iso) return "-";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
};

export default function StudentMessages({ user, onLogout }: Props) {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<StudentMessage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const selected = useMemo(
    () => messages.find((m) => m._id === selectedId) || null,
    [messages, selectedId]
  );

  const unreadCount = useMemo(() => messages.filter((m) => !m.is_read).length, [messages]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return messages;
    return messages.filter((m) => {
      return (
        (m.subject || "").toLowerCase().includes(s) ||
        (m.body || "").toLowerCase().includes(s) ||
        (m.category || "").toLowerCase().includes(s) ||
        (m.sender_id || "").toLowerCase().includes(s)
      );
    });
  }, [messages, q]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = (await api.studentMessages()) as StudentMessage[];
      const arr = Array.isArray(data) ? data : [];
      setMessages(arr);

      if (arr.length) {
        setSelectedId((prev) => prev ?? arr[0]._id);
      } else {
        setSelectedId(null);
      }
    } catch (e: any) {
      setError(e?.message || t("Failed to load messages"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markRead = async (id: string, is_read: boolean) => {
    setBusyId(id);
    setError(null);

    // optimistic
    setMessages((prev) => prev.map((m) => (m._id === id ? { ...m, is_read } : m)));

    try {
      await api.studentMarkMessageRead(id, is_read);
    } catch (e: any) {
      // rollback
      setMessages((prev) => prev.map((m) => (m._id === id ? { ...m, is_read: !is_read } : m)));
      setError(e?.message || t("Failed to update read status"));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex min-h-screen bg-white dark:bg-slate-950 font-poppins">
      <Sidebar user={user} onLogout={onLogout} />

      <div className="flex-1 flex flex-col overflow-hidden relative">
        <Header user={user} onLogout={onLogout} /> 
        <main className="flex-1 p-4 sm:p-6 lg:p-10 xl:p-12 scrollbar-hide animate-in fade-in duration-1000 slide-in-from-bottom-4 overflow-y-auto">
          {/* Header */}
          <div className="flex flex-col gap-6 lg:gap-8 xl:flex-row xl:items-end xl:justify-between mb-8 lg:mb-10">
            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">{t("Messages")}</h1>
              <p className="text-sm sm:text-base lg:text-lg font-medium text-slate-400 dark:text-slate-500">
                {unreadCount > 0 ? t("{{count}} unread items", { count: unreadCount }) : t("All caught up")} • {t("Critical communications from administration")}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center w-full xl:w-auto">
              <div className="group flex items-center gap-3 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl px-4 sm:px-6 py-3 sm:py-4 shadow-sm focus-within:ring-4 focus-within:ring-teal-500/10 focus-within:border-teal-500/50 transition-all w-full sm:min-w-[320px] xl:min-w-[380px]">
                <span className="material-icons-outlined text-slate-300 group-focus-within:text-teal-500 transition-colors">search</span>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={t("Filter dispatches...")}
                  className="w-full outline-none bg-transparent text-sm sm:text-base font-medium text-slate-900 dark:text-white placeholder:text-slate-300"
                />
              </div>

              <button
                onClick={load}
                disabled={loading}
                className={`h-12 sm:h-14 px-6 sm:px-8 rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-[0.2em] text-white shadow-xl transition-all flex items-center justify-center gap-3 active:scale-95 w-full sm:w-auto ${
                  loading ? "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none" : "bg-slate-900 dark:bg-teal-600 hover:bg-slate-800 dark:hover:bg-teal-700 shadow-slate-500/10"
                }`}
              >
                {loading ? (
                  <div className="h-4 w-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span className="material-icons-outlined text-lg">sync</span>
                )}
                <span>{loading ? t("Syncing...") : t("Sync Inbox")}</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-10 p-5 rounded-2xl bg-rose-50 text-rose-700 text-sm font-bold border border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-900/40 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
              <span className="material-icons-outlined">error_outline</span>
              {error}
            </div>
          )}

          <section className="overflow-hidden rounded-[32px] lg:rounded-[42px] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-[0_28px_80px_-32px_rgba(15,23,42,0.28)]">
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/40 px-5 py-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-500 text-white shadow-lg shadow-teal-500/20">
                  <span className="material-icons-outlined text-[22px]">forum</span>
                </div>
                <div className="min-w-0">
                  <div className="truncate text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">{t("Dispatch Feed")}</div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
                    {t("{{count}} threads", { count: filtered.length })} • {t("{{count}} unread", { count: unreadCount })}
                  </div>
                </div>
              </div>

              <div className="hidden sm:flex items-center gap-2 rounded-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 px-3 py-2 shadow-sm">
                <span className="material-icons-outlined text-sm text-teal-500">lock_clock</span>
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                  {t("Live Inbox")}
                </span>
              </div>
            </div>

            <div className="grid min-h-[620px] xl:grid-cols-[360px_1fr] 2xl:grid-cols-[390px_1fr]">
              <div className={`${selected ? "hidden xl:flex" : "flex"} min-h-[620px] flex-col border-r border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/30`}>
                <div className="border-b border-slate-100 dark:border-slate-800 px-4 py-4 sm:px-5">
                  <div className="flex items-center gap-3 rounded-[24px] border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 shadow-sm">
                    <span className="material-icons-outlined text-slate-300">search</span>
                    <input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder={t("Search messages")}
                      className="w-full bg-transparent text-sm font-semibold text-slate-900 dark:text-white outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
                    />
                    <button
                      onClick={load}
                      disabled={loading}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 disabled:opacity-40 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                      aria-label={t("Refresh messages")}
                    >
                      <span className={`material-icons-outlined text-[18px] ${loading ? "animate-spin" : ""}`}>sync</span>
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto scrollbar-hide px-2 py-2">
                  {filtered.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
                      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[28px] bg-white text-slate-300 shadow-inner dark:bg-slate-900 dark:text-slate-700">
                        <span className="material-icons-outlined text-3xl">inbox</span>
                      </div>
                      <p className="text-sm font-black uppercase tracking-[0.3em] text-slate-300 dark:text-slate-600">{t("No Messages")}</p>
                      <p className="mt-2 text-sm font-medium text-slate-400 dark:text-slate-500">{t("Nothing matches your current search.")}</p>
                    </div>
                  ) : (
                    filtered.map((m) => {
                      const active = m._id === selectedId;
                      const unread = !m.is_read;

                      return (
                        <button
                          key={m._id}
                          onClick={() => setSelectedId(m._id)}
                          className={`mb-2 flex w-full items-start gap-3 rounded-[24px] px-3 py-3 text-left transition-all ${
                            active
                              ? "bg-white shadow-[0_18px_40px_-28px_rgba(20,184,166,0.75)] ring-1 ring-teal-500/15 dark:bg-slate-900"
                              : "hover:bg-white/80 dark:hover:bg-slate-900/80"
                          }`}
                        >
                          <div className={`mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl font-black text-white shadow-sm ${
                            active ? "bg-teal-500" : "bg-slate-900 dark:bg-slate-700"
                          }`}>
                            {(m.sender_id || "A").charAt(0).toUpperCase()}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="mb-1 flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className={`truncate text-sm font-black tracking-tight ${active ? "text-slate-900 dark:text-white" : "text-slate-800 dark:text-slate-100"}`}>
                                  {m.subject || t("Untitled Protocol")}
                                </p>
                                <p className="truncate text-xs font-semibold text-slate-400 dark:text-slate-500">
                                  {m.sender_id || t("System Administrator")}
                                </p>
                              </div>
                              <div className="shrink-0 text-[10px] font-black uppercase tracking-widest text-slate-300 dark:text-slate-600">
                                {fmt(m.sent_at).split(",")[0]}
                              </div>
                            </div>

                            <p className="line-clamp-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                              {m.body || t("No content available.")}
                            </p>

                            <div className="mt-3 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <span className="rounded-full bg-slate-200/70 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                  {m.category || t("General")}
                                </span>
                                {unread && <span className="h-2.5 w-2.5 rounded-full bg-teal-500 shadow-[0_0_10px_rgba(20,184,166,0.55)]" />}
                              </div>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void markRead(m._id, !m.is_read);
                                }}
                                disabled={busyId === m._id}
                                className="rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 transition hover:bg-slate-100 hover:text-teal-600 disabled:opacity-40 dark:hover:bg-slate-800"
                              >
                                {m.is_read ? t("Unread") : t("Read")}
                              </button>
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              <div className={`${selected ? "flex" : "hidden xl:flex"} min-h-[620px] flex-col bg-[radial-gradient(circle_at_top_right,_rgba(20,184,166,0.08),_transparent_35%),linear-gradient(180deg,_rgba(248,250,252,0.9),_rgba(255,255,255,1))] dark:bg-[radial-gradient(circle_at_top_right,_rgba(20,184,166,0.12),_transparent_30%),linear-gradient(180deg,_rgba(15,23,42,0.92),_rgba(2,6,23,1))]`}>
                {!selected ? (
                  <div className="flex h-full flex-col items-center justify-center px-8 text-center">
                    <div className="mb-5 flex h-24 w-24 items-center justify-center rounded-[32px] bg-white text-slate-300 shadow-inner dark:bg-slate-900 dark:text-slate-700">
                      <span className="material-icons-outlined text-5xl">mark_email_read</span>
                    </div>
                    <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">{t("Choose a conversation")}</h3>
                    <p className="mt-2 max-w-md text-sm font-medium text-slate-400 dark:text-slate-500">
                      {t("Pick any dispatch from the list and we’ll open it in this chat-style view.")}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-4 border-b border-slate-100/80 dark:border-slate-800 px-5 py-4 sm:px-6 lg:px-8">
                      <div className="flex min-w-0 items-center gap-3">
                        <button
                          onClick={() => setSelectedId(null)}
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm transition hover:text-teal-600 xl:hidden dark:bg-slate-900 dark:text-slate-300"
                          aria-label={t("Back to message list")}
                        >
                          <span className="material-icons-outlined">arrow_back</span>
                        </button>
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-500 font-black text-white shadow-lg shadow-teal-500/20">
                          {(selected.sender_id || "A").charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black tracking-tight text-slate-900 dark:text-white">
                            {selected.sender_id || t("System Administrator")}
                          </p>
                          <p className="truncate text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                            {selected.category || t("General Dispatch")}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => void markRead(selected._id, !selected.is_read)}
                        disabled={busyId === selected._id}
                        className={`rounded-full px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.22em] transition active:scale-95 ${
                          selected.is_read
                            ? "bg-white text-slate-600 shadow-sm hover:text-teal-600 dark:bg-slate-900 dark:text-slate-300"
                            : "bg-teal-500 text-white shadow-lg shadow-teal-500/20 hover:bg-teal-600"
                        }`}
                      >
                        {selected.is_read ? t("Mark Unread") : t("Acknowledge")}
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto scrollbar-hide px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
                      <div className="mx-auto flex max-w-4xl flex-col gap-5">
                        <div className="self-center rounded-full bg-white/90 px-4 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 shadow-sm dark:bg-slate-900/90 dark:text-slate-500">
                          {fmt(selected.sent_at)}
                        </div>

                        <div className="w-full">
                          <div className="mb-3 flex items-start justify-between gap-4">
                            <div>
                              <p className="text-xs font-black uppercase tracking-[0.22em] text-teal-600 dark:text-teal-400">
                                {selected.category || t("General Dispatch")}
                              </p>
                              <h2 className="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                                {selected.subject || t("Untitled Protocol")}
                              </h2>
                            </div>
                            {!selected.is_read && (
                              <span className="mt-1 rounded-full bg-teal-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">
                                {t("New")}
                              </span>
                            )}
                          </div>

                          <div className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-300 dark:text-slate-600">{t("Origin Source")}</p>
                              <p className="mt-1 font-bold text-slate-700 dark:text-slate-300">{selected.sender_id || t("System Administrator")}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-300 dark:text-slate-600">{t("Status")}</p>
                              <p className="mt-1 font-bold text-slate-700 dark:text-slate-300">
                                {selected.is_read ? t("Reviewed") : t("Awaiting attention")}
                              </p>
                            </div>
                          </div>

                          <div className="whitespace-pre-wrap text-[15px] leading-8 text-slate-600 dark:text-slate-300">
                            {selected.body || t("End of transmission.")}
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}