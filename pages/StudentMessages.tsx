// pages/StudentMessages.tsx
import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import { api } from "../lib/api";
import { User } from "../types";

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
    <div className="flex min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* ✅ Sidebar stays */}
      <Sidebar user={user} onLogout={onLogout} />

      {/* ✅ Main content */}
      <div className="flex-1 flex flex-col">
        <main className="flex-1 p-6">
          {/* Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Messages</h1>
              <p className="text-sm text-slate-500 dark:text-slate-300 mt-1">
                {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"} · Messages sent by admins
              </p>
            </div>

            <div className="flex gap-3 items-center">
              <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 shadow-sm min-w-[320px]">
                <span className="text-slate-400">🔎</span>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search messages..."
                  className="w-full outline-none bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400"
                />
              </div>

              <button
                onClick={load}
                disabled={loading}
                className={`rounded-xl px-4 py-2 font-bold text-white shadow-sm ${
                  loading ? "bg-teal-500/60 cursor-not-allowed" : "bg-teal-700 hover:bg-teal-800"
                }`}
              >
                {loading ? "Loading..." : "Refresh"}
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 px-4 py-3 font-semibold">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-4 items-start">
            {/* Left: list */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="font-extrabold text-slate-900 dark:text-white">Inbox</div>
                <div className="text-xs text-slate-500 dark:text-slate-300">
                  Showing {filtered.length}/{messages.length}
                </div>
              </div>

              <div className="max-h-[72vh] overflow-auto">
                {filtered.length === 0 ? (
                  <div className="p-4 text-slate-500 dark:text-slate-300">No messages.</div>
                ) : (
                  filtered.map((m) => {
                    const active = m._id === selectedId;
                    const unread = !m.is_read;

                    return (
                      <button
                        key={m._id}
                        onClick={() => setSelectedId(m._id)}
                        className={`w-full text-left p-4 border-b border-slate-100 dark:border-slate-700 transition ${
                          active ? "bg-teal-50 dark:bg-teal-950/30" : "bg-transparent hover:bg-slate-50 dark:hover:bg-slate-900/40"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2">
                            {unread && (
                              <span
                                className="inline-block w-2.5 h-2.5 rounded-full bg-teal-700"
                                title="Unread"
                              />
                            )}
                            <div className={`text-slate-900 dark:text-white ${unread ? "font-extrabold" : "font-bold"}`}>
                              {m.subject || "(No subject)"}
                            </div>
                          </div>
                          <div className="text-xs text-slate-400 whitespace-nowrap">{fmt(m.sent_at)}</div>
                        </div>

                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-100">
                            {m.category || "General"}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-300">
                            From: <span className="font-semibold">{m.sender_id || "-"}</span>
                          </span>
                        </div>

                        <div className="mt-2 text-sm text-slate-600 dark:text-slate-200">
                          {(m.body || "").slice(0, 110)}
                          {(m.body || "").length > 110 ? "…" : ""}
                        </div>

                        <div className="mt-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              void markRead(m._id, !m.is_read);
                            }}
                            disabled={busyId === m._id}
                            className={`text-xs font-extrabold rounded-xl px-3 py-2 border ${
                              busyId === m._id
                                ? "opacity-60 cursor-not-allowed"
                                : "hover:bg-slate-50 dark:hover:bg-slate-900/40"
                            } border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white bg-white dark:bg-slate-800`}
                          >
                            {m.is_read ? "Mark unread" : "Mark read"}
                          </button>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right: viewer */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm p-5 min-h-[320px]">
              {!selected ? (
                <div className="text-slate-500 dark:text-slate-300">
                  Select a message from the left to view it.
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
                        {selected.subject || "(No subject)"}
                      </div>

                      <div className="mt-2 text-sm text-slate-500 dark:text-slate-300">
                        <span className="font-bold text-slate-700 dark:text-slate-100">
                          {selected.category || "General"}
                        </span>
                        <span className="mx-2 text-slate-300">•</span>
                        From{" "}
                        <span className="font-bold text-slate-700 dark:text-slate-100">
                          {selected.sender_id || "-"}
                        </span>
                        <span className="mx-2 text-slate-300">•</span>
                        {fmt(selected.sent_at)}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => void markRead(selected._id, true)}
                        disabled={busyId === selected._id || !!selected.is_read}
                        className={`rounded-xl px-4 py-2 font-extrabold text-white ${
                          busyId === selected._id || selected.is_read
                            ? "bg-slate-300 dark:bg-slate-700 cursor-not-allowed"
                            : "bg-teal-700 hover:bg-teal-800"
                        }`}
                      >
                        Mark read
                      </button>

                      <button
                        onClick={() => void markRead(selected._id, false)}
                        disabled={busyId === selected._id || !selected.is_read}
                        className={`rounded-xl px-4 py-2 font-extrabold border ${
                          busyId === selected._id || !selected.is_read
                            ? "opacity-60 cursor-not-allowed"
                            : "hover:bg-slate-50 dark:hover:bg-slate-900/40"
                        } border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white bg-white dark:bg-slate-800`}
                      >
                        Mark unread
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 border-t border-slate-200 dark:border-slate-700 pt-5 whitespace-pre-wrap leading-7 text-slate-900 dark:text-white">
                    {selected.body || ""}
                  </div>

                  {!!selected.attachments?.length && (
                    <div className="mt-6">
                      <div className="font-extrabold text-slate-900 dark:text-white mb-2">Attachments</div>
                      <div className="flex flex-wrap gap-2">
                        {selected.attachments.map((a, idx) => (
                          <span
                            key={`${a}-${idx}`}
                            className="text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-100"
                          >
                            {a}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
