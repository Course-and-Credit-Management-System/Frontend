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

function clsx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
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
      // Keep mobile/tablet in list view when user taps "Back to Inbox".
      // Auto-select only for desktop split-view.
      if (window.innerWidth >= 1280) {
        setSelectedId(filtered[0]._id);
      }
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
    <div className="flex min-h-screen overflow-x-hidden bg-background-light dark:bg-background-dark font-poppins">
      <Sidebar user={user} onLogout={onLogout} />
      <div className="flex flex-1 flex-col">
        <Header title="Messages" user={user} />

        <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 xl:p-8">
          <div className="flex flex-col gap-6 pb-4">
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
                className="w-full px-4 sm:px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-slate-800/40"
              >
                <div>
                  <div className="font-bold text-gray-800 dark:text-white">Send Message</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {composeOpen ? "Fill the form below" : "Click to compose a new message"}
                  </div>
                </div>

                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Unread: <span className="font-bold text-gray-800 dark:text-white">{unreadCount}</span>
                  </div>
                  <div className="text-sm font-bold text-primary">{composeOpen ? "Hide" : "Compose"}</div>
                </div>
              </button>

              {composeOpen && (
                <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700">
                  <form onSubmit={onSend} className="grid grid-cols-1 xl:grid-cols-2 gap-4">
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

                    <div className="xl:col-span-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Subject</label>
                      <input
                        className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm text-gray-800 dark:text-white"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="e.g., Probation Warning"
                      />
                    </div>

                    <div className="xl:col-span-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Body</label>
                      <textarea
                        className="mt-1 w-full min-h-[90px] rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm text-gray-800 dark:text-white"
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        placeholder="Write your message..."
                      />
                    </div>

                    <div className="flex items-end gap-2 xl:col-span-2">
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
            <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col">
              {/* Top bar */}
              <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-4 flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-800 dark:text-white">Inbox</h3>
                      <span className="text-[10px] font-extrabold uppercase tracking-widest bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded text-gray-500">
                        {filtered.length}/{items.length}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                      Unread messages auto-mark as read when opened.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:flex items-center gap-2 shrink-0 w-full sm:w-auto">
                    <button onClick={onRefresh} className="flex items-center justify-center gap-2 rounded-lg border border-primary/20 px-3 py-2 text-xs font-bold text-primary hover:bg-primary/5 transition-colors" disabled={loading}>
                      <span className={clsx("material-icons-outlined text-sm", loading && "animate-spin")}>refresh</span>
                      Refresh
                    </button>
                    <button
                      type="button"
                      onClick={markAllVisibleAsRead}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-slate-800 dark:text-gray-200 transition-all shadow-sm"
                    >
                      Mark read
                    </button>
                  </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-3">
                  {/* Tabs */}
                  <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-900/50 p-1 rounded-xl shrink-0">
                    <button
                      type="button"
                      onClick={() => setTab("All")}
                      className={clsx(
                        "flex-1 lg:flex-none rounded-lg px-4 py-1.5 text-xs font-bold transition-all",
                        tab === "All"
                          ? "bg-white dark:bg-primary text-primary dark:text-white shadow-sm"
                          : "text-gray-500 dark:text-gray-400 hover:text-gray-700"
                      )}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => setTab("Unread")}
                      className={clsx(
                        "flex-1 lg:flex-none rounded-lg px-4 py-1.5 text-xs font-bold transition-all flex items-center justify-center gap-2",
                        tab === "Unread"
                          ? "bg-white dark:bg-primary text-primary dark:text-white shadow-sm"
                          : "text-gray-500 dark:text-gray-400 hover:text-gray-700"
                      )}
                    >
                      Unread
                      {unreadCount > 0 && (
                        <span className={clsx(
                          "size-1.5 rounded-full",
                          tab === "Unread" ? "bg-white" : "bg-primary"
                        )} />
                      )}
                    </button>
                  </div>

                  {/* Search + filters */}
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                    <div className="relative">
                      <span className="material-icons-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">search</span>
                      <input
                        className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent pl-8 pr-3 py-1.5 text-xs font-bold text-gray-800 dark:text-white focus:border-primary outline-none transition-all"
                        placeholder="Search..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </div>

                    <select
                      className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-1.5 text-xs font-bold text-gray-800 dark:text-white outline-none focus:border-primary transition-all"
                      value={catFilter}
                      onChange={(e) => setCatFilter(e.target.value)}
                    >
                      <option value="All">Categories</option>
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>

                    <select
                      className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-1.5 text-xs font-bold text-gray-800 dark:text-white outline-none focus:border-primary transition-all"
                      value={sortDir}
                      onChange={(e) => setSortDir(e.target.value as any)}
                    >
                      <option value="Newest">Newest</option>
                      <option value="Oldest">Oldest</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Two-panel body (flex-1 = stable scrolling) */}
              <div className="grid grid-cols-1 xl:grid-cols-12">
                {/* LEFT: list */}
                <div className={clsx(
                  "xl:col-span-5 2xl:col-span-4 border-b xl:border-b-0 xl:border-r border-gray-200 dark:border-gray-700 min-h-0 flex flex-col bg-gray-50/20",
                  selectedId && "hidden xl:flex" // hide list on mobile/tablet if message selected
                )}>
                  <div ref={listTopRef} />

                  {loading ? (
                    <div className="p-8 text-center text-xs font-bold text-gray-400 animate-pulse uppercase tracking-widest">
                      Syncing messages…
                    </div>
                  ) : filtered.length === 0 ? (
                    <div className="p-8 text-center">
                      <div className="text-sm font-bold text-gray-400 uppercase tracking-wide">
                        {tab === "Unread" ? "Clean Inbox" : "Empty Inbox"}
                      </div>
                      <div className="mt-1 text-[11px] text-gray-400">Try adjusting your filters.</div>
                    </div>
                  ) : (
                    <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800 scrollbar-thin">
                      {filtered.map((m) => {
                        const isSelected = m._id === selectedId;
                        const isUnread = !m.is_read;

                        return (
                          <button
                            key={m._id}
                            onClick={() => openMessage(m._id)}
                            className={clsx(
                              "w-full text-left px-4 py-4 transition-all group",
                              isSelected ? "bg-white dark:bg-slate-800/60 shadow-inner" : "hover:bg-gray-50 dark:hover:bg-slate-800/30"
                            )}
                          >
                            <div className="flex items-start gap-3">
                              {/* unread dot */}
                              <div className="pt-1.5 shrink-0">
                                <div
                                  className={clsx(
                                    "h-2 w-2 rounded-full transition-all",
                                    isUnread ? "bg-primary scale-110 shadow-[0_0_8px_rgba(7,125,138,0.4)]" : "bg-gray-300 dark:bg-slate-700 scale-75"
                                  )}
                                />
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                   <span className={clsx(
                                     "text-[10px] font-extrabold uppercase tracking-tight px-1.5 py-0.5 rounded shrink-0",
                                     m.category === "Warning" ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300" : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                   )}>
                                     {m.category ?? "General"}
                                   </span>
                                   <span className="shrink-0 text-[10px] font-bold text-gray-400 uppercase">
                                     {formatListDate(m.sent_at)}
                                   </span>
                                </div>

                                <div className={clsx(
                                  "text-sm truncate transition-colors",
                                  isSelected ? "text-primary font-bold" : isUnread ? "text-gray-900 dark:text-white font-bold" : "text-gray-600 dark:text-gray-400 font-medium"
                                )}>
                                  {m.subject || "(No subject)"}
                                </div>

                                <div className={clsx(
                                  "mt-1 text-xs truncate",
                                  isUnread ? "text-gray-600 dark:text-gray-300 font-medium" : "text-gray-400 dark:text-gray-500"
                                )}>
                                  {previewText(m.body, 60)}
                                </div>

                                <div className="mt-2 text-[10px] font-bold text-gray-400 dark:text-slate-600 flex items-center gap-2 uppercase tracking-tighter">
                                  <span className="truncate">From: {m.sender_id}</span>
                                  <span className="opacity-30">|</span>
                                  <span className="truncate">To: {m.receiver_id}</span>
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
                <div className={clsx(
                  "xl:col-span-7 2xl:col-span-8 min-h-0 flex flex-col bg-white dark:bg-transparent",
                  !selectedId && "hidden xl:flex" // hide detail on mobile/tablet if none selected
                )}>
                  {!selected ? (
                    <div className="h-full flex items-center justify-center p-8 bg-gray-50/30">
                      <div className="text-center">
                        <div className="size-16 rounded-2xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                           <span className="material-icons-outlined text-gray-400 text-3xl">mail_outline</span>
                        </div>
                        <div className="text-sm font-bold text-gray-400 uppercase tracking-widest">Select a message</div>
                        <div className="mt-1 text-xs text-gray-400">Choose an item to read its full content.</div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full min-h-0 flex flex-col">
                      {/* mobile back button */}
                      <div className="xl:hidden px-4 py-2 border-b border-gray-100 dark:border-slate-800">
                         <button 
                           onClick={() => setSelectedId(null)}
                           className="flex items-center gap-1 text-xs font-bold text-primary"
                         >
                           <span className="material-icons-outlined text-sm">arrow_back</span>
                           Back to Inbox
                         </button>
                      </div>

                      {/* detail header */}
                      <div className="border-b border-gray-200 dark:border-gray-700 px-4 md:px-6 py-5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 bg-gray-50/30 dark:bg-slate-900/10">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-3">
                            <span className="text-[10px] font-extrabold uppercase tracking-wide px-2 py-1 rounded bg-primary/10 text-primary border border-primary/20">
                              {selected.category ?? "General"}
                            </span>

                            <span className={clsx(
                              "text-[10px] font-extrabold uppercase tracking-wide px-2 py-1 rounded border",
                              selected.is_read
                                ? "bg-gray-100 text-gray-500 border-gray-200 dark:bg-slate-800 dark:text-gray-400 dark:border-gray-700"
                                : "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-900/40"
                            )}>
                              {selected.is_read ? "Read" : "Unread"}
                            </span>
                          </div>

                          <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white break-words leading-tight">
                            {selected.subject || "(No subject)"}
                          </h2>

                          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-[11px] font-bold">
                            <div className="flex items-center gap-2 text-gray-500">
                               <span className="uppercase tracking-widest text-[9px] w-10">From:</span>
                               <span className="font-mono text-gray-900 dark:text-white bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{selected.sender_id}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-500">
                               <span className="uppercase tracking-widest text-[9px] w-10">To:</span>
                               <span className="font-mono text-gray-900 dark:text-white bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{selected.receiver_id}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-500">
                               <span className="uppercase tracking-widest text-[9px] w-10">Sent:</span>
                               <span className="text-gray-700 dark:text-gray-300">{formatLocal(selected.sent_at)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-500">
                               <span className="uppercase tracking-widest text-[9px] w-10">ID:</span>
                               <span className="font-mono text-gray-400 truncate">{selected._id}</span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-1 gap-2 shrink-0 w-full sm:w-auto">
                          <button
                            onClick={() => setReadState(selected._id, !selected.is_read)}
                            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-[10px] font-extrabold uppercase tracking-wide text-gray-700 hover:bg-gray-50 shadow-sm transition-all dark:border-gray-700 dark:bg-slate-800 dark:text-gray-200"
                          >
                            Mark {selected.is_read ? "Unread" : "Read"}
                          </button>

                          <button
                            onClick={() => onDelete(selected._id)}
                            className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-[10px] font-extrabold uppercase tracking-wide text-rose-600 hover:bg-rose-100 shadow-sm transition-all dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-200"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      {/* body */}
                      <div className="px-4 md:px-8 py-6 md:py-8">
                        <div className="whitespace-pre-wrap text-sm md:text-base text-gray-800 dark:text-gray-200 break-words leading-relaxed max-w-3xl">
                          {selected.body || "—"}
                        </div>

                        {/* attachments placeholder */}
                        <div className="mt-12 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-6 bg-gray-50/30">
                          <div className="flex items-center gap-2 text-[10px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-4">
                            <span className="material-icons-outlined text-sm">attach_file</span>
                            Attachments
                          </div>

                          {selected.attachments && selected.attachments.length > 0 ? (
                            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {selected.attachments.map((a, idx) => (
                                <li
                                  key={`${a}-${idx}`}
                                  className="text-xs text-gray-700 dark:text-gray-200 flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 shadow-sm hover:border-primary/30 transition-colors"
                                >
                                  <span className="font-mono truncate">{a}</span>
                                  <span className="material-icons-outlined text-gray-400 text-sm">download</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <div className="text-xs font-bold text-gray-400 italic">No files attached to this message.</div>
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
