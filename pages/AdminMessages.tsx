import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { User } from "../types";
import { api } from "../lib/api";

type Msg = {
  _id: string;
  sender_id: string;
  receiver_id: string;
  subject: string;
  body: string;
  sent_at?: string;
  is_read: boolean;
  category?: string;
  attachments?: string[];
};

interface Props {
  user: User;
  onLogout: () => void;
}

const CATEGORIES = ["General", "Warning", "Advisor Note", "Enrollment Issue"];

function safeDate(iso?: string) {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatLocal(iso?: string) {
  const d = safeDate(iso);
  if (!d) return "—";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function formatUtc(iso?: string) {
  const d = safeDate(iso);
  if (!d) return "—";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  });
}

export default function AdminMessages({ user, onLogout }: Props) {
  const [items, setItems] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // compose
  const [receiverId, setReceiverId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("General");
  const [sending, setSending] = useState(false);

  // UI controls
  const [query, setQuery] = useState("");
  const [readFilter, setReadFilter] = useState<"All" | "Read" | "Unread">("All");
  const [catFilter, setCatFilter] = useState<string>("All");
  const [sortDir, setSortDir] = useState<"Newest" | "Oldest">("Newest");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.adminMessages();
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load messages");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = [...items];

    if (readFilter !== "All") {
      list = list.filter((m) => (readFilter === "Read" ? m.is_read : !m.is_read));
    }

    if (catFilter !== "All") {
      list = list.filter((m) => (m.category ?? "General") === catFilter);
    }

    if (q) {
      list = list.filter((m) => {
        const hay = `${m._id} ${m.sender_id} ${m.receiver_id} ${m.subject} ${m.body} ${m.category ?? ""}`.toLowerCase();
        return hay.includes(q);
      });
    }

    list.sort((a, b) => {
      const da = a.sent_at ?? "";
      const db = b.sent_at ?? "";
      const cmp = db.localeCompare(da);
      return sortDir === "Newest" ? cmp : -cmp;
    });

    return list;
  }, [items, query, readFilter, catFilter, sortDir]);

  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!receiverId.trim() || !subject.trim() || !body.trim()) {
      setError("Receiver ID, subject, and body are required.");
      return;
    }

    setSending(true);
    try {
      await api.adminCreateMessage({
        receiver_id: receiverId.trim(),
        subject: subject.trim(),
        body: body.trim(),
        category: category || "General",
      });

      setReceiverId("");
      setSubject("");
      setBody("");
      setCategory("General");

      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  }

  async function toggleRead(m: Msg) {
    setError(null);
    try {
      await api.adminMarkMessageRead(m._id, !m.is_read);
      setItems((prev) => prev.map((x) => (x._id === m._id ? { ...x, is_read: !x.is_read } : x)));
    } catch (e: any) {
      setError(e?.message || "Failed to update read status");
    }
  }

  async function onDelete(id: string) {
    const ok = window.confirm("Delete this message?");
    if (!ok) return;
    setError(null);
    try {
      await api.adminDeleteMessage(id);
      setItems((prev) => prev.filter((x) => x._id !== id));
    } catch (e: any) {
      setError(e?.message || "Failed to delete message");
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark font-poppins">
      <Sidebar user={user} onLogout={onLogout} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title="Messages" user={user} />

        <main className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
              {error}
            </div>
          )}

          {/* Compose */}
          <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
            <h3 className="font-bold text-gray-800 dark:text-white mb-4">Send Message</h3>

            <form onSubmit={onSend} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Receiver ID</label>
                <input
                  className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm text-gray-800 dark:text-white"
                  value={receiverId}
                  onChange={(e) => setReceiverId(e.target.value)}
                  placeholder="e.g., TNT-8801"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Category</label>
                <select
                  className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm text-gray-800 dark:text-white"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="lg:col-span-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Subject</label>
                <input
                  className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm text-gray-800 dark:text-white"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g., Probation Warning"
                />
              </div>

              <div className="lg:col-span-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Body</label>
                <textarea
                  className="mt-1 w-full min-h-[120px] rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm text-gray-800 dark:text-white"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write your message..."
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={sending}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
                >
                  {sending ? "Sending..." : "Send"}
                </button>
              </div>
            </form>
          </div>

          {/* Controls */}
          <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
              <input
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm text-gray-800 dark:text-white"
                placeholder="Search messages..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />

              <select
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm text-gray-800 dark:text-white"
                value={readFilter}
                onChange={(e) => setReadFilter(e.target.value as any)}
              >
                <option value="All">All</option>
                <option value="Unread">Unread</option>
                <option value="Read">Read</option>
              </select>

              <select
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm text-gray-800 dark:text-white"
                value={catFilter}
                onChange={(e) => setCatFilter(e.target.value)}
              >
                <option value="All">All Categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <select
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm text-gray-800 dark:text-white"
                value={sortDir}
                onChange={(e) => setSortDir(e.target.value as any)}
              >
                <option value="Newest">Newest</option>
                <option value="Oldest">Oldest</option>
              </select>
            </div>
          </div>

          {/* List */}
          <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-800 dark:text-white">Messages</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Showing {filtered.length} of {items.length}
                </p>
              </div>
              <button
                onClick={load}
                className="text-sm font-bold text-primary hover:opacity-80"
                disabled={loading}
              >
                {loading ? "Loading..." : "Refresh"}
              </button>
            </div>

            {loading ? (
              <div className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">Loading messages...</div>
            ) : filtered.length === 0 ? (
              <div className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">No messages match filters.</div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {filtered.map((m) => (
                  <div key={m._id} className="px-6 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center flex-wrap gap-2 mb-2">
                          <span className="text-xs font-bold px-2 py-1 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                            {m.category ?? "General"}
                          </span>

                          <span className={`text-xs font-bold px-2 py-1 rounded ${m.is_read ? "bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-gray-200" : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"}`}>
                            {m.is_read ? "Read" : "Unread"}
                          </span>

                          {m.sent_at && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              • {formatLocal(m.sent_at)} <span className="text-gray-400">({formatUtc(m.sent_at)})</span>
                            </span>
                          )}
                        </div>

                        <h4 className="font-bold text-gray-800 dark:text-white break-words">{m.subject}</h4>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 break-words">{m.body}</p>

                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex flex-wrap gap-2">
                          <span>
                            From: <span className="font-mono">{m.sender_id}</span>
                          </span>
                          <span>•</span>
                          <span>
                            To: <span className="font-mono">{m.receiver_id}</span>
                          </span>
                          <span>•</span>
                          <span>
                            ID: <span className="font-mono">{m._id}</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 shrink-0">
                        <button
                          onClick={() => toggleRead(m)}
                          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:opacity-90 dark:border-gray-700 dark:bg-slate-800 dark:text-gray-200"
                        >
                          Mark {m.is_read ? "Unread" : "Read"}
                        </button>

                        <button
                          onClick={() => onDelete(m._id)}
                          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:opacity-90 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
