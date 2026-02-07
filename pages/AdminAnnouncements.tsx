import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { User } from "../types";
import { api } from "../lib/api";

type AnnouncementType = "General" | "Urgent" | "Event" | "Academic";

type Announcement = {
  _id: string;
  title: string;
  content: string;
  type?: AnnouncementType;
  posted_by?: string;
  date_posted?: string; // ISO string from backend
  expiry_date?: string | null;
  target_audience?: string;
};

interface Props {
  user: User;
  onLogout: () => void;
}

const TYPES: AnnouncementType[] = ["General", "Urgent", "Event", "Academic"];

function safeDate(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatLocalWithTz(iso?: string | null) {
  const d = safeDate(iso ?? null);
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

function formatUtc(iso?: string | null) {
  const d = safeDate(iso ?? null);
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

function isExpired(a: Announcement) {
  const exp = safeDate(a.expiry_date ?? null);
  if (!exp) return false;
  return exp.getTime() < Date.now();
}

function shortId(id: string) {
  return id.length > 14 ? `${id.slice(0, 14)}…` : id;
}

function toDatetimeLocalValue(iso?: string | null) {
  const d = safeDate(iso ?? null);
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const min = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

const AdminAnnouncements: React.FC<Props> = ({ user, onLogout }) => {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // create form
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState<AnnouncementType>("General");
  const [targetAudience, setTargetAudience] = useState("All");
  const [expiry, setExpiry] = useState<string>(""); // datetime-local string
  const [submitting, setSubmitting] = useState(false);

  // interactive controls (kept from previous version)
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"All" | AnnouncementType>("All");
  const [expiryFilter, setExpiryFilter] = useState<"All" | "Active" | "Expired">("All");
  const [sortDir, setSortDir] = useState<"Newest" | "Oldest">("Newest");

  // edit modal state (new)
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editType, setEditType] = useState<AnnouncementType>("General");
  const [editAudience, setEditAudience] = useState("All");
  const [editExpiry, setEditExpiry] = useState<string>(""); // datetime-local
  const [savingEdit, setSavingEdit] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.adminAnnouncements();
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load announcements");
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

    if (typeFilter !== "All") {
      list = list.filter((a) => (a.type ?? "General") === typeFilter);
    }

    if (expiryFilter !== "All") {
      list = list.filter((a) => (expiryFilter === "Expired" ? isExpired(a) : !isExpired(a)));
    }

    if (q) {
      list = list.filter((a) => {
        const hay = `${a._id} ${a.title ?? ""} ${a.content ?? ""} ${a.posted_by ?? ""} ${
          a.target_audience ?? ""
        }`.toLowerCase();
        return hay.includes(q);
      });
    }

    list.sort((a, b) => {
      const da = a.date_posted ?? "";
      const db = b.date_posted ?? "";
      const cmp = db.localeCompare(da);
      return sortDir === "Newest" ? cmp : -cmp;
    });

    return list;
  }, [items, query, typeFilter, expiryFilter, sortDir]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError("Title and content are required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // datetime-local -> ISO (treat input as LOCAL time)
      let expiryIso: string | undefined;
      if (expiry.trim().length > 0) {
        const d = new Date(expiry); // local
        if (!Number.isNaN(d.getTime())) {
          expiryIso = d.toISOString(); // stored as UTC ISO
        }
      }

      await api.adminCreateAnnouncement({
        title: title.trim(),
        content: content.trim(),
        type: type ?? "General",
        target_audience: targetAudience.trim() || "All",
        ...(expiryIso ? { expiry_date: expiryIso } : {}),
      });

      setTitle("");
      setContent("");
      setType("General");
      setTargetAudience("All");
      setExpiry("");

      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to create announcement");
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete(id: string) {
    const ok = window.confirm("Delete this announcement?");
    if (!ok) return;

    setError(null);
    try {
      await api.adminDeleteAnnouncement(id);
      setItems((prev) => prev.filter((x) => x._id !== id));
    } catch (e: any) {
      setError(e?.message || "Failed to delete announcement");
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
  }

  function openEdit(a: Announcement) {
    setEditing(a);
    setEditTitle(a.title ?? "");
    setEditContent(a.content ?? "");
    setEditType((a.type ?? "General") as AnnouncementType);
    setEditAudience(a.target_audience ?? "All");
    setEditExpiry(toDatetimeLocalValue(a.expiry_date ?? null));
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;

    if (!editTitle.trim() || !editContent.trim()) {
      setError("Title and content are required.");
      return;
    }

    setSavingEdit(true);
    setError(null);

    try {
      let expiryIso: string | null | undefined = undefined;

      // if user cleared the field => set null in DB
      if (editExpiry.trim().length === 0) {
        expiryIso = null;
      } else {
        const d = new Date(editExpiry); // local
        if (!Number.isNaN(d.getTime())) {
          expiryIso = d.toISOString();
        }
      }

      await api.adminUpdateAnnouncement(editing._id, {
        title: editTitle.trim(),
        content: editContent.trim(),
        type: editType,
        target_audience: editAudience.trim() || "All",
        expiry_date: expiryIso,
      });

      setEditing(null);
      await load();
    } catch (err: any) {
      setError(err?.message || "Failed to update announcement");
    } finally {
      setSavingEdit(false);
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark font-poppins">
      <Sidebar user={user} onLogout={onLogout} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title="Announcements" user={user} />

        <main className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
              {error}
            </div>
          )}

          {/* Create */}
          <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
            <h3 className="font-bold text-gray-800 dark:text-white mb-4">Create Announcement</h3>

            <form onSubmit={onCreate} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="lg:col-span-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Title</label>
                <input
                  className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm text-gray-800 dark:text-white"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Portal Downtime Tonight"
                />
              </div>

              <div className="lg:col-span-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Content</label>
                <textarea
                  className="mt-1 w-full min-h-[110px] rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm text-gray-800 dark:text-white"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write the announcement text..."
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Type</label>
                <select
                  className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm text-gray-800 dark:text-white"
                  value={type}
                  onChange={(e) => setType(e.target.value as AnnouncementType)}
                >
                  {TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Target Audience</label>
                <input
                  className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm text-gray-800 dark:text-white"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder='e.g., "All", "Students", "Faculty"'
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Expiry (optional)</label>
                <input
                  type="datetime-local"
                  className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm text-gray-800 dark:text-white"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                />
                <p className="mt-1 text-xs text-gray-500">Saved as UTC in DB; shown as Local + UTC in list.</p>
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full lg:w-auto rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
                >
                  {submitting ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>

          {/* Controls */}
          <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
              <input
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm text-gray-800 dark:text-white"
                placeholder="Search title/content/id..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />

              <select
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm text-gray-800 dark:text-white"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
              >
                <option value="All">All Types</option>
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>

              <select
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm text-gray-800 dark:text-white"
                value={expiryFilter}
                onChange={(e) => setExpiryFilter(e.target.value as any)}
              >
                <option value="All">All</option>
                <option value="Active">Active (not expired)</option>
                <option value="Expired">Expired</option>
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
                <h3 className="font-bold text-gray-800 dark:text-white">All Announcements</h3>
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
              <div className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">Loading announcements...</div>
            ) : filtered.length === 0 ? (
              <div className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">No announcements match filters.</div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {filtered.map((a) => {
                  const expired = isExpired(a);
                  return (
                    <div key={a._id} className="px-6 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center flex-wrap gap-2 mb-2">
                            <span className="text-xs font-bold px-2 py-1 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                              {a.type ?? "General"}
                            </span>

                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {a.target_audience ?? "All"}
                            </span>

                            {a.date_posted && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                • {formatLocalWithTz(a.date_posted)}{" "}
                                <span className="text-gray-400">({formatUtc(a.date_posted)})</span>
                              </span>
                            )}

                            {a.expiry_date && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                • Expires: {formatLocalWithTz(a.expiry_date)}{" "}
                                <span className="text-gray-400">({formatUtc(a.expiry_date)})</span>
                              </span>
                            )}

                            {expired && (
                              <span className="text-xs font-bold px-2 py-1 rounded bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-300">
                                Expired
                              </span>
                            )}
                          </div>

                          <h4 className="font-bold text-gray-800 dark:text-white break-words">{a.title}</h4>
                          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 break-words">{a.content}</p>

                          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2 flex-wrap">
                            <span>
                              ID: <span className="font-mono">{shortId(a._id)}</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => copy(a._id)}
                              className="text-primary font-bold hover:opacity-80"
                            >
                              Copy
                            </button>
                            {a.posted_by ? <span>• Posted by: {a.posted_by}</span> : null}
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 shrink-0">
                          <button
                            onClick={() => openEdit(a)}
                            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:opacity-90 dark:border-gray-700 dark:bg-slate-800 dark:text-gray-200"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => onDelete(a._id)}
                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:opacity-90 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Edit Modal */}
          {editing && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="w-full max-w-2xl rounded-xl bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-gray-700 shadow-lg">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <h3 className="font-bold text-gray-800 dark:text-white">Edit Announcement</h3>
                  <button
                    onClick={() => setEditing(null)}
                    className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
                    type="button"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={saveEdit} className="p-6 space-y-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Title</label>
                    <input
                      className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm text-gray-800 dark:text-white"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Content</label>
                    <textarea
                      className="mt-1 w-full min-h-[110px] rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm text-gray-800 dark:text-white"
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Type</label>
                      <select
                        className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm text-gray-800 dark:text-white"
                        value={editType}
                        onChange={(e) => setEditType(e.target.value as AnnouncementType)}
                      >
                        {TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Target Audience</label>
                      <input
                        className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm text-gray-800 dark:text-white"
                        value={editAudience}
                        onChange={(e) => setEditAudience(e.target.value)}
                      />
                    </div>

                    <div className="lg:col-span-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Expiry (optional)</label>
                      <input
                        type="datetime-local"
                        className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm text-gray-800 dark:text-white"
                        value={editExpiry}
                        onChange={(e) => setEditExpiry(e.target.value)}
                      />
                      <p className="mt-1 text-xs text-gray-500">Clear this field to remove expiry.</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditing(null)}
                      className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 hover:opacity-90 dark:border-gray-700 dark:text-gray-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingEdit}
                      className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
                    >
                      {savingEdit ? "Saving..." : "Save"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminAnnouncements;
