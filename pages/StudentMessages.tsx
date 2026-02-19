// pages/StudentMessages.tsx
import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import { api } from "../lib/api";
import { User } from "../types";
import Header from "../components/Header";

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
      setError(e?.message || "Failed to load messages");
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
      setError(e?.message || "Failed to update read status");
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
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">Messages</h1>
              <p className="text-sm sm:text-base lg:text-lg font-medium text-slate-400 dark:text-slate-500">
                {unreadCount > 0 ? `${unreadCount} unread items` : "All caught up"} • Critical communications from administration
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center w-full xl:w-auto">
              <div className="group flex items-center gap-3 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl px-4 sm:px-6 py-3 sm:py-4 shadow-sm focus-within:ring-4 focus-within:ring-teal-500/10 focus-within:border-teal-500/50 transition-all w-full sm:min-w-[320px] xl:min-w-[380px]">
                <span className="material-icons-outlined text-slate-300 group-focus-within:text-teal-500 transition-colors">search</span>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Filter dispatches..."
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
                <span>{loading ? "Syncing..." : "Sync Inbox"}</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-10 p-5 rounded-2xl bg-rose-50 text-rose-700 text-sm font-bold border border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-900/40 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
              <span className="material-icons-outlined">error_outline</span>
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] 2xl:grid-cols-[460px_1fr] gap-6 lg:gap-8 xl:gap-10 items-start">
            {/* Left: list */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[28px] lg:rounded-[40px] shadow-sm overflow-hidden transition-all hover:shadow-md">
              <div className="px-5 sm:px-7 lg:px-10 py-5 sm:py-6 lg:py-8 bg-slate-50/30 dark:bg-slate-950/30 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
                <div className="font-black text-lg sm:text-xl text-slate-900 dark:text-white tracking-tight">Dispatch Feed</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 px-3 py-1 rounded-lg">
                  {filtered.length} Items
                </div>
              </div>

              <div className="max-h-[60vh] xl:max-h-[68vh] overflow-y-auto scrollbar-hide divide-y divide-slate-50 dark:divide-slate-800/50">
                {filtered.length === 0 ? (
                  <div className="p-20 text-center space-y-4">
                    <div className="h-16 w-16 rounded-[24px] bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-200 dark:text-slate-800 mx-auto border border-slate-100 dark:border-slate-800 shadow-inner">
                      <span className="material-icons-outlined text-3xl">inbox</span>
                    </div>
                    <p className="text-sm font-black text-slate-300 uppercase tracking-widest">Null Set Discovered</p>
                  </div>
                ) : (
                  filtered.map((m) => {
                    const active = m._id === selectedId;
                    const unread = !m.is_read;

                    return (
                      <button
                        key={m._id}
                        onClick={() => setSelectedId(m._id)}
                        className={`w-full text-left px-5 sm:px-7 lg:px-10 py-5 sm:py-6 lg:py-8 transition-all relative group ${
                          active ? "bg-white dark:bg-slate-800 shadow-inner" : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                        }`}
                      >
                        {active && (
                          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-teal-500 rounded-r-full shadow-[0_0_10px_rgba(20,184,166,0.4)]" />
                        )}
                        <div className="flex items-center justify-between gap-4 mb-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {unread && (
                              <span
                                className="inline-block w-2 h-2 rounded-full bg-teal-500 animate-pulse shadow-[0_0_8px_rgba(20,184,166,0.6)]"
                                title="Unread dispatch"
                              />
                            )}
                            <div className={`text-sm sm:text-base truncate tracking-tight transition-colors ${active ? "text-teal-600 font-black" : unread ? "text-slate-900 dark:text-white font-black" : "text-slate-500 dark:text-slate-400 font-bold"}`}>
                              {m.subject || "Untitled Protocol"}
                            </div>
                          </div>
                          <div className="text-[10px] font-black text-slate-300 dark:text-slate-600 whitespace-nowrap uppercase tracking-tighter tabular-nums">{fmt(m.sent_at).split(',')[0]}</div>
                        </div>

                        <div className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 line-clamp-2 leading-relaxed mb-4 sm:mb-6 font-medium">
                          {m.body || "No content available."}
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-[8px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-md bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-700 shadow-sm">
                              {m.category || "General"}
                            </span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              void markRead(m._id, !m.is_read);
                            }}
                            disabled={busyId === m._id}
                            className={`text-[9px] font-black uppercase tracking-widest rounded-xl px-4 py-2 border transition-all active:scale-95 ${
                              busyId === m._id
                                ? "opacity-30 cursor-not-allowed"
                                : "opacity-0 group-hover:opacity-100 bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-700 text-slate-400 hover:text-teal-600 hover:border-teal-500/30 shadow-sm"
                            }`}
                          >
                            Mark as {m.is_read ? "Unread" : "Read"}
                          </button>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right: viewer */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[28px] lg:rounded-[40px] shadow-sm p-5 sm:p-7 lg:p-10 xl:p-12 min-h-[460px] lg:min-h-[560px] transition-all hover:shadow-md relative overflow-hidden group">
              <div className="absolute top-0 right-0 h-64 w-64 bg-teal-500/[0.01] rounded-bl-full pointer-events-none" />
              {!selected ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in duration-700">
                  <div className="h-24 w-24 rounded-[40px] bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-200 dark:text-slate-800 mx-auto border border-slate-100 dark:border-slate-800 shadow-inner">
                    <span className="material-icons-outlined text-5xl">mail_outline</span>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-black text-slate-300 dark:text-slate-700 uppercase tracking-[0.4em]">Select Communication</h3>
                    <p className="text-sm font-medium text-slate-400">Choose a dispatch from the feed to expand details</p>
                  </div>
                </div>
              ) : (
                <div className="animate-in fade-in duration-500 relative z-10">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 lg:gap-10 mb-8 lg:mb-12 pb-8 lg:pb-10 border-b border-slate-50 dark:border-slate-800">
                    <div className="space-y-6">
                      <div className="inline-block px-4 py-1.5 rounded-full bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 text-[10px] font-black uppercase tracking-[0.3em] border border-teal-100 dark:border-teal-800 shadow-sm">
                        {selected.category || "General Dispatch"}
                      </div>
                      <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight group-hover:text-teal-600 transition-colors">
                        {selected.subject || "Untitled Protocol"}
                      </h2>

                      <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-slate-900 dark:bg-slate-800 flex items-center justify-center font-black text-white text-xs shadow-lg">
                            {(selected.sender_id || "A").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest">Origin Source</p>
                            <span className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                              {selected.sender_id || "System Administrator"}
                            </span>
                          </div>
                        </div>
                        <div className="h-8 w-px bg-slate-100 dark:bg-slate-800 hidden md:block" />
                        <div>
                          <p className="text-[9px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest mb-1">Timestamp</p>
                          <span className="text-sm font-bold text-slate-500 dark:text-slate-400 tabular-nums">{fmt(selected.sent_at)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4 shrink-0 w-full lg:w-auto">
                      <button
                        onClick={() => void markRead(selected._id, !selected.is_read)}
                        disabled={busyId === selected._id}
                        className={`h-12 sm:h-14 px-6 sm:px-8 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95 w-full lg:w-auto ${
                          selected.is_read
                            ? "bg-white dark:bg-slate-800 text-slate-600 dark:text-white border border-slate-100 dark:border-slate-700 hover:bg-slate-50 shadow-sm"
                            : "bg-teal-600 text-white hover:bg-teal-700 shadow-teal-500/20"
                        }`}
                      >
                        {selected.is_read ? "Flag as Unread" : "Acknowledge Recall"}
                      </button>
                    </div>
                  </div>

                  <div className="prose prose-slate dark:prose-invert max-w-none">
                    <div className="whitespace-pre-wrap leading-relaxed text-slate-600 dark:text-slate-300 text-base sm:text-lg font-medium max-w-4xl italic">
                      "{selected.body || "End of transmission."}"
                    </div>
                  </div>

                  {!!selected.attachments?.length && (
                    <div className="mt-20 pt-12 border-t border-slate-50 dark:border-slate-800">
                      <div className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.4em] mb-8 ml-1">Encapsulated Assets</div>
                      <div className="flex flex-wrap gap-4">
                        {selected.attachments.map((a, idx) => (
                          <button
                            key={`${a}-${idx}`}
                            className="group flex items-center gap-4 px-6 py-4 rounded-[24px] border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-900 hover:border-teal-500/30 transition-all shadow-sm active:scale-95"
                          >
                            <span className="material-icons-outlined text-lg opacity-40 group-hover:text-teal-500 group-hover:rotate-12 transition-all">description</span>
                            {a}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Global UI Decoration */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-teal-500/[0.02] rounded-full blur-[120px] pointer-events-none -translate-y-1/2 translate-x-1/2 -z-10" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-500/[0.02] rounded-full blur-[100px] pointer-events-none translate-y-1/2 -translate-x-1/2 -z-10" />
      </div>
    </div>
  );
}
