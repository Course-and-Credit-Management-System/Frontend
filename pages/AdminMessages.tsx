import React, { useEffect, useMemo, useRef, useState } from "react";
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

function formatListDate(iso?: string) {
  const d = safeDate(iso);
  if (!d) return "—";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
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

function previewText(s: string, max = 110) {
  const v = (s || "").replace(/\s+/g, " ").trim();
  if (v.length <= max) return v;
  return v.slice(0, max - 1) + "…";
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
  const [composeOpen, setComposeOpen] = useState(false);

  // inbox UI controls
  const [tab, setTab] = useState<"All" | "Unread">("All");
  const [query, setQuery] = useState("");
  const [catFilter, setCatFilter] = useState<string>("All");
  const [sortDir, setSortDir] = useState<"Newest" | "Oldest">("Newest");

  // selection
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const listTopRef = useRef<HTMLDivElement | null>(null);

  // toast
  const [toast, setToast] = useState<{ type: "success" | "info"; text: string } | null>(null);
  const toastTimerRef = useRef<number | undefined>(undefined);
  type StudentOption = { user_id: string; name: string };
  const [studentOptions, setStudentOptions] = useState<StudentOption[]>([]);

  const [studentIdsLoading, setStudentIdsLoading] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [receiverOpen, setReceiverOpen] = useState(false);

  function showToast(text: string, type: "success" | "info" = "success") {
    setToast({ text, type });
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2500);
  }

  async function load({ keepSelection = true }: { keepSelection?: boolean } = {}) {
    setLoading(true);
    setError(null);
    try {
      const data = await api.adminMessages();
      const next = Array.isArray(data) ? (data as Msg[]) : [];
      setItems(next);

      if (!keepSelection) {
        setSelectedId(null);
      } else {
        // if selection disappeared, clear (we’ll re-select via effect below)
        if (selectedId && !next.some((m) => m._id === selectedId)) {
          setSelectedId(null);
        }
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load messages");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

    useEffect(() => {
    (async () => {
      setStudentIdsLoading(true);
      try {
        const data = await api.adminStudentOptions();
        setStudentOptions(Array.isArray(data) ? data : []);

      } catch (e: any) {
        // don’t hard fail the page, just show error banner
        setError(e?.message || "Failed to load student options");
        setStudentOptions([]);
      } finally {
        setStudentIdsLoading(false);
      }
    })();
  }, []);

  // auto-open compose if user starts typing
  useEffect(() => {
    if ((receiverId || subject || body) && !composeOpen) {
      setComposeOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receiverId, subject, body]);

    const studentMatches = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    const list = studentOptions;

    if (!q) return list.slice(0, 50);

    return list
        .filter((s) => {
        const hay = `${s.user_id} ${s.name}`.toLowerCase();
        return hay.includes(q);
        })
        .slice(0, 50);
    }, [studentOptions, studentSearch]);

  const unreadCount = useMemo(() => items.filter((m) => !m.is_read).length, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = [...items];

    // tab filter
    if (tab === "Unread") list = list.filter((m) => !m.is_read);

    // category filter
    if (catFilter !== "All") {
      list = list.filter((m) => (m.category ?? "General") === catFilter);
    }

    // search
    if (q) {
      list = list.filter((m) => {
        const hay = `${m._id} ${m.sender_id} ${m.receiver_id} ${m.subject} ${m.body} ${m.category ?? ""}`.toLowerCase();
        return hay.includes(q);
      });
    }

    // sort
    list.sort((a, b) => {
      const da = a.sent_at ?? "";
      const db = b.sent_at ?? "";
      const cmp = db.localeCompare(da);
      return sortDir === "Newest" ? cmp : -cmp;
    });

    return list;
  }, [items, tab, query, catFilter, sortDir]);

  // keep selection valid vs filtered list
  useEffect(() => {
    if (filtered.length === 0) {
      setSelectedId(null);
      return;
    }

    if (!selectedId) {
      setSelectedId(filtered[0]._id);
      return;
    }

    if (!filtered.some((m) => m._id === selectedId)) {
      setSelectedId(filtered[0]._id);
    }
  }, [filtered, selectedId]);

  const selected = useMemo(() => {
    if (!selectedId) return null;
    return items.find((m) => m._id === selectedId) ?? null;
  }, [items, selectedId]);

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

      await load({ keepSelection: true });
      listTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

      showToast("Message sent", "success");
      setComposeOpen(false);
        setReceiverOpen(false);
        setStudentSearch("");
    } catch (e: any) {
      setError(e?.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  }

  async function setReadState(messageId: string, nextIsRead: boolean, opts?: { silent?: boolean }) {
    const prev = items.find((m) => m._id === messageId);
    if (!prev) return;

    // optimistic
    setItems((p) => p.map((x) => (x._id === messageId ? { ...x, is_read: nextIsRead } : x)));

    try {
      await api.adminMarkMessageRead(messageId, nextIsRead);
      // don't spam toast for auto-mark-read
      if (!opts?.silent) {
        showToast(nextIsRead ? "Marked as read" : "Marked as unread", "info");
      }
    } catch (e: any) {
      // rollback
      setItems((p) => p.map((x) => (x._id === messageId ? { ...x, is_read: prev.is_read } : x)));
      if (!opts?.silent) setError(e?.message || "Failed to update read status");
    }
  }

  async function openMessage(messageId: string) {
    setSelectedId(messageId);

    const m = items.find((x) => x._id === messageId);
    if (m && !m.is_read) {
      await setReadState(messageId, true, { silent: true });
    }
  }

  async function onDelete(messageId: string) {
    const ok = window.confirm("Delete this message?");
    if (!ok) return;

    setError(null);

    const prevItems = items;

    // optimistic remove
    setItems((p) => p.filter((x) => x._id !== messageId));

    // if deleting selected, selection will re-align via filtered+effect after state updates

    try {
      await api.adminDeleteMessage(messageId);
      showToast("Message deleted", "success");
    } catch (e: any) {
      setItems(prevItems);
      setError(e?.message || "Failed to delete message");
    }
  }

  async function markAllVisibleAsRead() {
    const toMark = filtered.filter((m) => !m.is_read);
    if (toMark.length === 0) {
      showToast("No unread messages in view", "info");
      return;
    }

    const ids = new Set(toMark.map((m) => m._id));

    // optimistic
    setItems((p) => p.map((x) => (ids.has(x._id) ? { ...x, is_read: true } : x)));

    try {
      await Promise.all(toMark.map((m) => api.adminMarkMessageRead(m._id, true)));
      showToast(`Marked ${toMark.length} as read`, "success");
    } catch (e: any) {
      // safest rollback: re-fetch
      await load({ keepSelection: true });
      setError(e?.message || "Failed to mark all as read");
    }
  }

  function onRefresh() {
    load({ keepSelection: true });
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark font-poppins">
      <Sidebar user={user} onLogout={onLogout} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title="Messages" user={user} />

        <main className="flex-1 overflow-hidden p-6 lg:p-8">
          <div className="h-full flex flex-col gap-6">
            {/* Toast */}
            {toast && (
              <div className="fixed right-6 top-6 z-50">
                <div
                  className={[
                    "rounded-lg border px-4 py-3 text-sm font-bold shadow-sm",
                    toast.type === "success"
                      ? "border-green-200 bg-green-50 text-green-700 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-200"
                      : "border-gray-200 bg-white text-gray-800 dark:border-gray-700 dark:bg-slate-900 dark:text-gray-100",
                  ].join(" ")}
                >
                  {toast.text}
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
                {error}
              </div>
            )}

            {/* Compose (collapsible) */}
            <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              <button
                type="button"
                onClick={() => setComposeOpen((v) => !v)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-slate-800/40"
              >
                <div>
                  <div className="font-bold text-gray-800 dark:text-white">Send Message</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {composeOpen ? "Fill the form below" : "Click to compose a new message"}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Unread: <span className="font-bold text-gray-800 dark:text-white">{unreadCount}</span>
                  </div>
                  <div className="text-sm font-bold text-primary">{composeOpen ? "Hide" : "Compose"}</div>
                </div>
              </button>

              {composeOpen && (
                <div className="p-6 border-t border-gray-200 dark:border-gray-700">
                  <form onSubmit={onSend} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Receiver (strict searchable select) */}
                    <div className="relative">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Receiver ID</label>

                    <button
                        type="button"
                        onClick={() => setReceiverOpen((v) => !v)}
                        disabled={studentIdsLoading || studentOptions.length === 0
}
                        className={[
                        "mt-1 w-full rounded-lg border px-3 py-2 text-sm text-left flex items-center justify-between",
                        "border-gray-200 dark:border-gray-700 bg-transparent text-gray-800 dark:text-white",
                        (studentIdsLoading || studentOptions.length === 0
                        ) ? "opacity-60 cursor-not-allowed" : "hover:bg-gray-50 dark:hover:bg-slate-800/40",
                        ].join(" ")}
                    >
                        <span className={receiverId ? "" : "text-gray-400 dark:text-gray-500"}>
                        {receiverId ||
                            (studentIdsLoading ? "Loading students..." : studentOptions.length === 0
                        ? "No students found" : "Select a student (TNT-xxxx)")}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{receiverOpen ? "▲" : "▼"}</span>
                    </button>

                    {receiverOpen && (
                        <div className="absolute z-40 mt-2 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 shadow-lg overflow-hidden">
                        <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                            <input
                            autoFocus
                            value={studentSearch}
                            onChange={(e) => setStudentSearch(e.target.value)}
                            placeholder="Search TNT..."
                            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm text-gray-800 dark:text-white"
                            />
                        </div>

                        <div className="max-h-56 overflow-y-auto">
                            {studentMatches.length === 0 ? (
                            <div className="p-3 text-sm text-gray-500 dark:text-gray-400">No matches.</div>
                            ) : (
                            studentMatches.map((s) => (
                            <button
                                key={s.user_id}
                                type="button"
                                onClick={() => {
                                setReceiverId(s.user_id);
                                setReceiverOpen(false);
                                setStudentSearch("");
                                }}
                                className={[
                                "w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-slate-800/40",
                                s.user_id === receiverId ? "bg-gray-50 dark:bg-slate-800/50 font-bold" : "",
                                ].join(" ")}
                            >
                                <div className="flex items-center justify-between gap-3">
                                <span className="font-mono">{s.user_id}</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{s.name}</span>
                                </div>
                            </button>
                            ))

                            )}
                        </div>
                        </div>
                    )}

                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Only existing student IDs can be selected.
                    </div>
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
                        className="mt-1 w-full min-h-[90px] rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm text-gray-800 dark:text-white"
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        placeholder="Write your message..."
                      />
                    </div>

                    <div className="flex items-end gap-2">
                      <button
                        type="submit"
                        disabled={sending}
                        className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
                      >
                        {sending ? "Sending..." : "Send"}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                        setComposeOpen(false);
                        setReceiverOpen(false);
                        setStudentSearch("");
                        }}
                        className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:opacity-90 dark:border-gray-700 dark:bg-slate-800 dark:text-gray-200"
                      >
                        Close
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>

            {/* Inbox */}
            <div className="flex-1 min-h-0 bg-surface-light dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col">
              {/* Top bar */}
              <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-800 dark:text-white">Inbox</h3>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {filtered.length}/{items.length}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Click a message to preview • Unread messages auto-mark as read when opened
                    </p>

                    {/* Tabs + bulk */}
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setTab("All")}
                        className={[
                          "rounded-lg px-3 py-1 text-sm font-bold border",
                          tab === "All"
                            ? "bg-primary text-white border-primary"
                            : "bg-transparent text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700",
                        ].join(" ")}
                      >
                        All <span className="ml-2 text-xs opacity-80">{items.length}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setTab("Unread")}
                        className={[
                          "rounded-lg px-3 py-1 text-sm font-bold border",
                          tab === "Unread"
                            ? "bg-primary text-white border-primary"
                            : "bg-transparent text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700",
                        ].join(" ")}
                      >
                        Unread <span className="ml-2 text-xs opacity-80">{unreadCount}</span>
                      </button>

                      <div className="flex-1" />

                      <button
                        type="button"
                        onClick={markAllVisibleAsRead}
                        className="rounded-lg border border-gray-200 bg-white px-3 py-1 text-sm font-bold text-gray-700 hover:opacity-90 dark:border-gray-700 dark:bg-slate-800 dark:text-gray-200"
                      >
                        Mark visible as read
                      </button>
                    </div>
                  </div>

                  <button onClick={onRefresh} className="text-sm font-bold text-primary hover:opacity-80" disabled={loading}>
                    {loading ? "Loading..." : "Refresh"}
                  </button>
                </div>

                {/* Search + filters */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  <input
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm text-gray-800 dark:text-white"
                    placeholder="Search..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />

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

              {/* Two-panel body (flex-1 = stable scrolling) */}
              <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12">
                {/* LEFT: list */}
                <div className="lg:col-span-5 xl:col-span-4 border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-gray-700 min-h-0">
                  <div ref={listTopRef} />

                  {loading ? (
                    <div className="p-4 text-sm text-gray-500 dark:text-gray-400">Loading messages…</div>
                  ) : filtered.length === 0 ? (
                    <div className="p-6">
                      <div className="text-sm font-bold text-gray-800 dark:text-white">
                        {tab === "Unread" ? "No unread messages" : "No messages"}
                      </div>
                      <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">Try changing filters or search.</div>
                    </div>
                  ) : (
                    <div className="h-full min-h-0 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800 pb-6">
                      {filtered.map((m) => {
                        const isSelected = m._id === selectedId;
                        const isUnread = !m.is_read;

                        return (
                          <button
                            key={m._id}
                            onClick={() => openMessage(m._id)}
                            className={[
                              "w-full text-left px-4 py-3",
                              "hover:bg-gray-50 dark:hover:bg-slate-800/40",
                              isSelected ? "bg-gray-50 dark:bg-slate-800/50" : "",
                            ].join(" ")}
                          >
                            <div className="flex items-start gap-3">
                              {/* unread dot */}
                              <div className="pt-1">
                                <div
                                  className={[
                                    "h-2.5 w-2.5 rounded-full",
                                    isUnread
                                      ? "bg-primary"
                                      : "bg-transparent border border-gray-300 dark:border-gray-700",
                                  ].join(" ")}
                                  title={isUnread ? "Unread" : "Read"}
                                />
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 shrink-0">
                                        {m.category ?? "General"}
                                      </span>

                                      <span
                                        className={[
                                          "text-sm truncate",
                                          m.is_read
                                            ? "font-semibold text-gray-800 dark:text-white"
                                            : "font-extrabold text-gray-900 dark:text-white",
                                        ].join(" ")}
                                      >
                                        {m.subject || "(No subject)"}
                                      </span>
                                    </div>

                                    <div
                                      className={[
                                        "mt-1 text-xs truncate",
                                        m.is_read ? "text-gray-500 dark:text-gray-400" : "text-gray-600 dark:text-gray-300",
                                      ].join(" ")}
                                    >
                                      {previewText(m.body) || "—"}
                                    </div>
                                  </div>

                                  <div className="shrink-0 text-xs text-gray-500 dark:text-gray-400">
                                    {formatListDate(m.sent_at)}
                                  </div>
                                </div>

                                <div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400 flex flex-wrap gap-2">
                                  <span>
                                    From: <span className="font-mono">{m.sender_id}</span>
                                  </span>
                                  <span>•</span>
                                  <span>
                                    To: <span className="font-mono">{m.receiver_id}</span>
                                  </span>
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* RIGHT: detail */}
                <div className="lg:col-span-7 xl:col-span-8 min-h-0">
                  {!selected ? (
                    <div className="h-full flex items-center justify-center p-8">
                      <div className="text-center">
                        <div className="text-sm font-bold text-gray-800 dark:text-white">Select a message</div>
                        <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          Choose an item on the left to view details.
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full min-h-0 flex flex-col">
                      {/* detail header */}
                      <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold px-2 py-1 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                              {selected.category ?? "General"}
                            </span>

                            <span
                              className={[
                                "text-xs font-bold px-2 py-1 rounded",
                                selected.is_read
                                  ? "bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-gray-200"
                                  : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
                              ].join(" ")}
                            >
                              {selected.is_read ? "Read" : "Unread"}
                            </span>
                          </div>

                          <h2 className="mt-2 text-lg font-bold text-gray-900 dark:text-white break-words">
                            {selected.subject || "(No subject)"}
                          </h2>

                          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex flex-wrap gap-2">
                            <span>
                              From: <span className="font-mono">{selected.sender_id}</span>
                            </span>
                            <span>•</span>
                            <span>
                              To: <span className="font-mono">{selected.receiver_id}</span>
                            </span>
                            <span>•</span>
                            <span>
                              ID: <span className="font-mono">{selected._id}</span>
                            </span>
                          </div>

                          {selected.sent_at && (
                            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              {formatLocal(selected.sent_at)}{" "}
                              <span className="text-gray-400">({formatUtc(selected.sent_at)})</span>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-2 shrink-0">
                          <button
                            onClick={() => setReadState(selected._id, !selected.is_read)}
                            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:opacity-90 dark:border-gray-700 dark:bg-slate-800 dark:text-gray-200"
                          >
                            Mark {selected.is_read ? "Unread" : "Read"}
                          </button>

                          <button
                            onClick={() => onDelete(selected._id)}
                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:opacity-90 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      {/* body */}
                      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
                        <div className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200 break-words">
                          {selected.body || "—"}
                        </div>

                        {/* attachments placeholder */}
                        <div className="mt-6 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                          <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Attachments
                          </div>

                          {selected.attachments && selected.attachments.length > 0 ? (
                            <ul className="mt-2 space-y-2">
                              {selected.attachments.map((a, idx) => (
                                <li
                                  key={`${a}-${idx}`}
                                  className="text-sm text-gray-700 dark:text-gray-200 flex items-center justify-between gap-3"
                                >
                                  <span className="font-mono break-all">{a}</span>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">(placeholder)</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">No attachments.</div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {/* end two-panel */}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
