import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { User } from "../types";
import { api } from "../lib/api";

type AnnouncementType = "General" | "Urgent" | "Event" | "Academic";
type AnnouncementStatus = "draft" | "published" | "archived";
type SortMode = "Pinned+Newest" | "Newest" | "Oldest" | "Expiring Soon";

type Announcement = {
  _id: string;
  title: string;
  content: string;
  type?: AnnouncementType;

  // optional new fields
  status?: AnnouncementStatus;
  pinned?: boolean;
  pinned_at?: string | null;
  published_at?: string | null;
  updated_at?: string | null;

  // legacy fields (still returned)
  posted_by?: string;
  date_posted?: string;
  expiry_date?: string | null;
  target_audience?: string;
};

interface Props {
  user: User;
  onLogout: () => void;
}

const TYPES: AnnouncementType[] = ["General", "Urgent", "Event", "Academic"];
const STATUSES: Array<{ key: AnnouncementStatus | "all"; label: string }> = [
  { key: "all", label: "All" },
  { key: "draft", label: "Drafts" },
  { key: "published", label: "Published" },
  { key: "archived", label: "Archived" },
];

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

function isExpired(a: Announcement) {
  const exp = safeDate(a.expiry_date ?? null);
  if (!exp) return false;
  return exp.getTime() < Date.now();
}

function shortId(id: string) {
  return id.length > 14 ? `${id.slice(0, 14)}…` : id;
}

function clsx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function statusBadge(status?: AnnouncementStatus) {
  const s = (status ?? "draft") as AnnouncementStatus;
  if (s === "published") return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
  if (s === "archived") return "bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-gray-200";
  return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
}

function typeBadge(type?: AnnouncementType) {
  const t = type ?? "General";
  if (t === "Urgent") return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-200";
  if (t === "Event") return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-200";
  if (t === "Academic") return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
  return "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-200";
}

function normalizeAnnouncement(a: any): Announcement {
  return {
    ...a,
    status: (a.status as AnnouncementStatus | undefined) ?? undefined,
    pinned: typeof a.pinned === "boolean" ? a.pinned : undefined,
    pinned_at: a.pinned_at ?? null,
    published_at: a.published_at ?? null,
    updated_at: a.updated_at ?? null,
    expiry_date: a.expiry_date ?? null,
    target_audience: a.target_audience ?? "All",
  };
}

function nextExpiryText(a: Announcement) {
  const exp = safeDate(a.expiry_date ?? null);
  if (!exp) return "No expiry";
  const ms = exp.getTime() - Date.now();
  const absDays = Math.floor(Math.abs(ms) / (1000 * 60 * 60 * 24));
  if (ms < 0) return `Expired ${absDays}d ago`;
  if (absDays === 0) return "Expires today";
  return `Expires in ${absDays}d`;
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

/* =========================================================
   Confirm Modal + Toast
   ========================================================= */

type ConfirmVariant = "danger" | "primary" | "neutral";

function ConfirmModal({
  open,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "neutral",
  loading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  const btn =
    variant === "danger"
      ? "bg-red-600 hover:opacity-90"
      : variant === "primary"
      ? "bg-primary hover:opacity-90"
      : "bg-gray-800 hover:opacity-90";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-gray-700 shadow-lg">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-bold text-gray-800 dark:text-white">{title}</h3>
          {description ? (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{description}</p>
          ) : null}
        </div>

        <div className="px-6 py-4 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 hover:opacity-90 dark:border-gray-700 dark:text-gray-200 disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={clsx("rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-50", btn)}
          >
            {loading ? "Working..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

type ToastKind = "success" | "error" | "info";

function Toast({
  open,
  message,
  kind = "success",
  onClose,
}: {
  open: boolean;
  message: string;
  kind?: ToastKind;
  onClose: () => void;
}) {
  if (!open) return null;

  const color =
    kind === "success"
      ? "border-green-200 bg-green-50 text-green-700 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-200"
      : kind === "error"
      ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200"
      : "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-200";

  return (
    <div className="fixed z-[70] bottom-6 right-6 max-w-sm">
      <div className={clsx("rounded-lg border p-4 text-sm shadow-lg", color)}>
        <div className="flex items-start justify-between gap-3">
          <div className="font-bold">{message}</div>
          <button
            onClick={onClose}
            className="text-xs font-bold opacity-70 hover:opacity-100"
            aria-label="Close toast"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

const AdminAnnouncements: React.FC<Props> = ({ user, onLogout }) => {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // create form
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState<AnnouncementType>("General");
  const [statusVal, setStatusVal] = useState<AnnouncementStatus>("draft");
  const [pinned, setPinned] = useState(false);
  const [targetAudience, setTargetAudience] = useState("All");
  const [expiry, setExpiry] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  // controls
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"All" | AnnouncementType>("All");
  const [statusFilter, setStatusFilter] = useState<AnnouncementStatus | "all">("all");
  const [pinnedFilter, setPinnedFilter] = useState<"All" | "Pinned" | "Unpinned">("All");
  const [expiryFilter, setExpiryFilter] = useState<"All" | "Active" | "Expired">("All");
  const [sortMode, setSortMode] = useState<SortMode>("Pinned+Newest");

  // edit modal state
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editType, setEditType] = useState<AnnouncementType>("General");
  const [editStatus, setEditStatus] = useState<AnnouncementStatus>("draft");
  const [editPinned, setEditPinned] = useState(false);
  const [editTargetAudience, setEditTargetAudience] = useState("All");
  const [editExpiry, setEditExpiry] = useState<string>("");
  const [savingEdit, setSavingEdit] = useState(false);

  // bulk selection
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);

  // confirm + toast
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmDesc, setConfirmDesc] = useState<string | undefined>(undefined);
  const [confirmText, setConfirmText] = useState("Confirm");
  const [confirmVariant, setConfirmVariant] = useState<ConfirmVariant>("neutral");
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<null | (() => Promise<void>)>(null);

  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastKind, setToastKind] = useState<ToastKind>("success");

  function showToast(kind: ToastKind, msg: string) {
    setToastKind(kind);
    setToastMsg(msg);
    setToastOpen(true);
    window.setTimeout(() => setToastOpen(false), 2200);
  }

  function openConfirm(opts: {
    title: string;
    description?: string;
    confirmText?: string;
    variant?: ConfirmVariant;
    action: () => Promise<void>;
  }) {
    setConfirmTitle(opts.title);
    setConfirmDesc(opts.description);
    setConfirmText(opts.confirmText ?? "Confirm");
    setConfirmVariant(opts.variant ?? "neutral");
    setConfirmAction(() => opts.action);
    setConfirmOpen(true);
  }

  async function runConfirm() {
    if (!confirmAction) return;
    setConfirmLoading(true);
    try {
      await confirmAction();
      setConfirmOpen(false);
    } catch (e: any) {
      setError(e?.message || "Action failed");
      showToast("error", e?.message || "Action failed");
    } finally {
      setConfirmLoading(false);
    }
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.adminAnnouncements();
      const arr = Array.isArray(data) ? data : [];
      setItems(arr.map(normalizeAnnouncement));
      setSelected({});
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

    if (statusFilter !== "all") {
      list = list.filter((a) => (a.status ?? "draft") === statusFilter);
    }

    if (typeFilter !== "All") {
      list = list.filter((a) => (a.type ?? "General") === typeFilter);
    }

    if (pinnedFilter !== "All") {
      list = list.filter((a) => (pinnedFilter === "Pinned" ? !!a.pinned : !a.pinned));
    }

    if (expiryFilter !== "All") {
      list = list.filter((a) => (expiryFilter === "Expired" ? isExpired(a) : !isExpired(a)));
    }

    if (q) {
      list = list.filter((a) => {
        const hay = `${a._id} ${a.title ?? ""} ${a.content ?? ""} ${a.posted_by ?? ""} ${a.target_audience ?? ""} ${
          a.status ?? ""
        }`.toLowerCase();
        return hay.includes(q);
      });
    }

    const getCreated = (a: Announcement) => a.updated_at ?? a.published_at ?? a.date_posted ?? "";
    const getPinnedAt = (a: Announcement) => a.pinned_at ?? "";
    const getExpiry = (a: Announcement) => a.expiry_date ?? "";

    list.sort((a, b) => {
      if (sortMode === "Oldest") return getCreated(a).localeCompare(getCreated(b));
      if (sortMode === "Newest") return getCreated(b).localeCompare(getCreated(a));
      if (sortMode === "Expiring Soon") {
        const ea = getExpiry(a) || "9999-12-31T00:00:00Z";
        const eb = getExpiry(b) || "9999-12-31T00:00:00Z";
        const cmp = ea.localeCompare(eb);
        if (cmp !== 0) return cmp;
        return getCreated(b).localeCompare(getCreated(a));
      }
      // Pinned+Newest
      const pa = a.pinned ? 1 : 0;
      const pb = b.pinned ? 1 : 0;
      if (pa !== pb) return pb - pa;
      const pcmp = getPinnedAt(b).localeCompare(getPinnedAt(a));
      if (pcmp !== 0) return pcmp;
      return getCreated(b).localeCompare(getCreated(a));
    });

    return list;
  }, [items, query, typeFilter, statusFilter, pinnedFilter, expiryFilter, sortMode]);

  // ---------- create
  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError("Title and content are required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      let expiryIso: string | undefined;
      if (expiry.trim().length > 0) {
        const d = new Date(expiry);
        if (!Number.isNaN(d.getTime())) expiryIso = d.toISOString();
      }

      await api.adminCreateAnnouncement({
        title: title.trim(),
        content: content.trim(),
        type,
        status: statusVal,
        pinned,
        target_audience: targetAudience.trim() || "All",
        ...(expiryIso ? { expiry_date: expiryIso } : { expiry_date: null }),
      });

      setTitle("");
      setContent("");
      setType("General");
      setStatusVal("draft");
      setPinned(false);
      setTargetAudience("All");
      setExpiry("");

      await load();
      showToast("success", "Announcement created");
    } catch (e: any) {
      setError(e?.message || "Failed to create announcement");
      showToast("error", e?.message || "Failed to create announcement");
    } finally {
      setSubmitting(false);
    }
  }

  // ---------- edit
  function openEdit(a: Announcement) {
    setEditing(a);
    setEditTitle(a.title ?? "");
    setEditContent(a.content ?? "");
    setEditType((a.type ?? "General") as AnnouncementType);
    setEditStatus((a.status ?? "draft") as AnnouncementStatus);
    setEditPinned(!!a.pinned);
    setEditTargetAudience(a.target_audience ?? "All");
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

      if (editExpiry.trim().length === 0) {
        expiryIso = null;
      } else {
        const d = new Date(editExpiry);
        if (!Number.isNaN(d.getTime())) expiryIso = d.toISOString();
      }

      await api.adminUpdateAnnouncement(editing._id, {
        title: editTitle.trim(),
        content: editContent.trim(),
        type: editType,
        status: editStatus,
        pinned: editPinned,
        target_audience: editTargetAudience.trim() || "All",
        expiry_date: expiryIso,
      });

      setEditing(null);
      await load();
      showToast("success", "Announcement updated");
    } catch (err: any) {
      setError(err?.message || "Failed to update announcement");
      showToast("error", err?.message || "Failed to update announcement");
    } finally {
      setSavingEdit(false);
    }
  }

  // ---------- workflow actions
  async function doAction(fn: () => Promise<any>, successMsg: string) {
    setError(null);
    await fn();
    await load();
    showToast("success", successMsg);
  }

  function onDelete(id: string) {
    openConfirm({
      title: "Delete announcement?",
      description: "This will permanently delete the announcement. This cannot be undone.",
      confirmText: "Delete",
      variant: "danger",
      action: async () => {
        await doAction(() => api.adminDeleteAnnouncement(id), "Announcement deleted");
        setSelected((prev) => {
          const { [id]: _, ...rest } = prev;
          return rest;
        });
      },
    });
  }

  function onPublish(a: Announcement) {
    openConfirm({
      title: "Publish announcement?",
      description: "Publishing will mark this announcement as Published.",
      confirmText: "Publish",
      variant: "primary",
      action: async () => doAction(() => api.adminPublishAnnouncement(a._id), "Announcement published"),
    });
  }

  function onArchive(a: Announcement) {
    openConfirm({
      title: "Archive announcement?",
      description: "Archived announcements are kept in DB but treated as inactive.",
      confirmText: "Archive",
      variant: "neutral",
      action: async () => doAction(() => api.adminArchiveAnnouncement(a._id), "Announcement archived"),
    });
  }

  async function onPinToggle(a: Announcement) {
    try {
      setError(null);
      if (a.pinned) {
        await api.adminUnpinAnnouncement(a._id);
        showToast("success", "Announcement unpinned");
      } else {
        await api.adminPinAnnouncement(a._id);
        showToast("success", "Announcement pinned");
      }
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to update pin");
      showToast("error", e?.message || "Failed to update pin");
    }
  }

  function onDuplicate(a: Announcement) {
    openConfirm({
      title: "Duplicate announcement?",
      description: "This will create a new Draft copy you can edit.",
      confirmText: "Duplicate",
      variant: "primary",
      action: async () => doAction(() => api.adminDuplicateAnnouncement(a._id), "Announcement duplicated"),
    });
  }

  // ---------- bulk
  function toggleSelected(id: string) {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function setAllSelected(ids: string[], value: boolean) {
    const next: Record<string, boolean> = {};
    for (const id of ids) next[id] = value;
    setSelected(next);
  }

  function bulkPublish() {
    if (selectedIds.length === 0) return;
    openConfirm({
      title: `Publish ${selectedIds.length} announcements?`,
      description: "They will be marked as Published.",
      confirmText: "Publish",
      variant: "primary",
      action: async () =>
        doAction(() => api.adminBulkAnnouncements({ action: "publish", ids: selectedIds }), "Bulk publish done"),
    });
  }

  function bulkArchive() {
    if (selectedIds.length === 0) return;
    openConfirm({
      title: `Archive ${selectedIds.length} announcements?`,
      description: "They will be marked as Archived.",
      confirmText: "Archive",
      variant: "neutral",
      action: async () =>
        doAction(() => api.adminBulkAnnouncements({ action: "archive", ids: selectedIds }), "Bulk archive done"),
    });
  }

  function bulkDelete() {
    if (selectedIds.length === 0) return;
    openConfirm({
      title: `Delete ${selectedIds.length} announcements?`,
      description: "This will permanently delete them. This cannot be undone.",
      confirmText: "Delete",
      variant: "danger",
      action: async () =>
        doAction(() => api.adminBulkAnnouncements({ action: "delete", ids: selectedIds }), "Bulk delete done"),
    });
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
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Status</label>
                <select
                  className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm text-gray-800 dark:text-white"
                  value={statusVal}
                  onChange={(e) => setStatusVal(e.target.value as AnnouncementStatus)}
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">Drafts are editable; Archived is inactive.</p>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Target Audience (Label)</label>
                <input
                  className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm text-gray-800 dark:text-white"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder='e.g., "All"'
                />
                <p className="mt-1 text-xs text-gray-500">Simple label only (no targeting).</p>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Expiry (optional)</label>
                <input
                  type="datetime-local"
                  className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm text-gray-800 dark:text-white"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                />
                <p className="mt-1 text-xs text-gray-500">Saved as UTC; shown in Local + UTC.</p>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                  <input
                    type="checkbox"
                    checked={pinned}
                    onChange={(e) => setPinned(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 dark:border-gray-600"
                  />
                  Pin (show on top)
                </label>
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
          <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              {STATUSES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setStatusFilter(t.key)}
                  className={clsx(
                    "rounded-lg px-3 py-2 text-sm font-bold border",
                    statusFilter === t.key
                      ? "bg-primary text-white border-primary"
                      : "bg-transparent text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:opacity-90"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
              <input
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm text-gray-800 dark:text-white lg:col-span-2"
                placeholder="Search title/content/id/audience..."
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
                value={pinnedFilter}
                onChange={(e) => setPinnedFilter(e.target.value as any)}
              >
                <option value="All">All</option>
                <option value="Pinned">Pinned</option>
                <option value="Unpinned">Unpinned</option>
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
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm text-gray-800 dark:text-white lg:col-span-1"
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as any)}
              >
                <option value="Pinned+Newest">Pinned + Newest</option>
                <option value="Newest">Newest</option>
                <option value="Oldest">Oldest</option>
                <option value="Expiring Soon">Expiring Soon</option>
              </select>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Selected: <span className="font-bold text-gray-700 dark:text-gray-200">{selectedIds.length}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={bulkPublish}
                  disabled={selectedIds.length === 0}
                  className="rounded-lg bg-green-600 px-3 py-2 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50"
                >
                  Publish
                </button>
                <button
                  type="button"
                  onClick={bulkArchive}
                  disabled={selectedIds.length === 0}
                  className="rounded-lg bg-gray-700 px-3 py-2 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50"
                >
                  Archive
                </button>
                <button
                  type="button"
                  onClick={bulkDelete}
                  disabled={selectedIds.length === 0}
                  className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>

          {/* List */}
          <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="border-b border-gray-200 dark:border-gray-700 px-4 md:px-6 py-4 flex items-center justify-between bg-gray-50/50 dark:bg-slate-900/20">
              <div>
                <h3 className="font-bold text-gray-800 dark:text-white">Announcements</h3>
                <p className="text-[10px] md:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mt-1">
                  Showing {filtered.length} items
                </p>
              </div>
              <button 
                onClick={load} 
                className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/10 transition-colors" 
                disabled={loading}
              >
                <span className={clsx("material-icons-outlined text-sm", loading && "animate-spin")}>refresh</span>
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="px-6 py-12 text-center text-sm font-bold text-gray-500 dark:text-gray-400 animate-pulse">
                Loading database records...
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm font-bold text-gray-500 dark:text-gray-400">
                No announcements found matching your filters.
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {/* Desktop Header - hidden on mobile */}
                <div className="hidden lg:flex px-6 py-3 text-[10px] font-extrabold uppercase tracking-widest text-gray-400 dark:text-gray-500 items-center gap-3 bg-gray-50/30 dark:bg-slate-900/10">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selectedIds.length === filtered.length}
                    onChange={(e) => setAllSelected(filtered.map((x) => x._id), e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 accent-primary"
                    aria-label="Select all"
                  />
                  <span className="w-20">Type</span>
                  <span className="w-24">Status</span>
                  <span className="w-24">Pinned</span>
                  <span className="flex-1">Details</span>
                  <span className="w-[280px] text-right">Actions</span>
                </div>

                {filtered.map((a) => {
                  const expired = isExpired(a);
                  const status = (a.status ?? "draft") as AnnouncementStatus;
                  const createdIso = a.updated_at ?? a.published_at ?? a.date_posted ?? null;
                  const expIso = a.expiry_date ?? null;

                  return (
                    <div key={a._id} className="px-4 md:px-6 py-5 hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                        <div className="flex items-center gap-3 shrink-0">
                          <input
                            type="checkbox"
                            checked={!!selected[a._id]}
                            onChange={() => toggleSelected(a._id)}
                            className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 accent-primary"
                            aria-label={`Select ${a._id}`}
                          />
                          <div className="lg:hidden flex items-center gap-2">
                             <span className={clsx("text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full", typeBadge(a.type))}>
                               {a.type ?? "General"}
                             </span>
                             <span className={clsx("text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full", statusBadge(status))}>
                               {status}
                             </span>
                          </div>
                        </div>

                        {/* Desktop Columns */}
                        <div className="hidden lg:block w-20 shrink-0">
                          <span className={clsx("text-[10px] font-extrabold uppercase tracking-wide px-2 py-1 rounded", typeBadge(a.type))}>
                            {a.type ?? "General"}
                          </span>
                        </div>

                        <div className="hidden lg:block w-24 shrink-0">
                          <span className={clsx("text-[10px] font-extrabold uppercase tracking-wide px-2 py-1 rounded", statusBadge(status))}>
                            {status}
                          </span>
                        </div>

                        <div className="hidden lg:block w-24 shrink-0">
                          {a.pinned ? (
                            <span className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wide text-yellow-600 dark:text-yellow-400">
                              <span className="material-icons-round text-sm">push_pin</span>
                              Pinned
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-400">—</span>
                          )}
                        </div>

                        {/* Details Area */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center flex-wrap gap-x-4 gap-y-1.5 mb-2">
                            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tight">
                              Audience: <span className="text-gray-900 dark:text-white">{a.target_audience ?? "All"}</span>
                            </span>

                            {createdIso && (
                              <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-tight flex items-center gap-1">
                                <span className="material-icons-outlined text-xs">edit_calendar</span>
                                {formatLocalWithTz(createdIso)}
                              </span>
                            )}

                            {expIso && (
                              <span className={clsx(
                                "text-[10px] font-bold uppercase tracking-tight flex items-center gap-1",
                                expired ? "text-rose-500" : "text-gray-400 dark:text-slate-500"
                              )}>
                                <span className="material-icons-outlined text-xs">event_busy</span>
                                {expired ? "Expired" : `Expires: ${formatLocalWithTz(expIso)}`}
                              </span>
                            )}
                          </div>

                          <h4 className="font-bold text-gray-900 dark:text-white break-words leading-tight">{a.title}</h4>
                          <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-300 break-words line-clamp-3 md:line-clamp-none leading-relaxed">{a.content}</p>

                          <div className="mt-3 text-[10px] font-bold text-gray-400 dark:text-slate-500 flex items-center gap-3 flex-wrap uppercase tracking-widest">
                            <div className="flex items-center gap-1">
                              ID: <span className="font-mono text-gray-600 dark:text-gray-400">{shortId(a._id)}</span>
                              <button
                                type="button"
                                onClick={() => copy(a._id)}
                                className="ml-1 text-primary hover:underline transition-all"
                              >
                                Copy
                              </button>
                            </div>
                            {a.posted_by && <span className="flex items-center gap-1"><span className="material-icons-outlined text-xs">person</span> {a.posted_by}</span>}
                          </div>
                        </div>

                        {/* Actions Area */}
                        <div className="mt-4 lg:mt-0 flex flex-wrap lg:flex-nowrap items-center gap-2 shrink-0 lg:w-[280px] lg:justify-end">
                            {status === "draft" && (
                              <button
                                onClick={() => onPublish(a)}
                                className="flex-1 lg:flex-none rounded-lg bg-emerald-600 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wide text-white hover:bg-emerald-700 transition-colors shadow-sm"
                              >
                                Publish
                              </button>
                            )}
                            {status === "published" && (
                              <button
                                onClick={() => onArchive(a)}
                                className="flex-1 lg:flex-none rounded-lg bg-slate-700 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wide text-white hover:bg-slate-800 transition-colors shadow-sm"
                              >
                                Archive
                              </button>
                            )}

                            <button
                              onClick={() => onPinToggle(a)}
                              className={clsx(
                                "flex-1 lg:flex-none rounded-lg px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wide border transition-all shadow-sm flex items-center justify-center gap-1",
                                a.pinned
                                  ? "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-900/50"
                                  : "bg-white text-gray-700 border-gray-200 dark:bg-slate-800 dark:text-gray-200 dark:border-gray-700"
                              )}
                            >
                              <span className="material-icons-outlined text-sm">{a.pinned ? "push_pin" : "push_pin"}</span>
                              {a.pinned ? "Unpin" : "Pin"}
                            </button>

                            <button
                              onClick={() => openEdit(a)}
                              className="rounded-lg border border-gray-200 bg-white p-1.5 text-gray-500 hover:text-primary hover:border-primary transition-all dark:border-gray-700 dark:bg-slate-800 dark:text-gray-400"
                              title="Edit"
                            >
                              <span className="material-icons-outlined text-sm">edit</span>
                            </button>

                            <button
                              onClick={() => onDelete(a._id)}
                              className="rounded-lg border border-rose-100 bg-rose-50 p-1.5 text-rose-600 hover:bg-rose-600 hover:text-white transition-all dark:bg-rose-900/20 dark:border-rose-900/40"
                              title="Delete"
                            >
                              <span className="material-icons-outlined text-sm">delete_outline</span>
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
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Status</label>
                      <select
                        className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm text-gray-800 dark:text-white"
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value as AnnouncementStatus)}
                      >
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                        <option value="archived">Archived</option>
                      </select>
                    </div>

                    <div className="lg:col-span-2 flex items-center gap-3">
                      <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                        <input
                          type="checkbox"
                          checked={editPinned}
                          onChange={(e) => setEditPinned(e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 dark:border-gray-600"
                        />
                        Pinned
                      </label>
                      <span className="text-xs text-gray-500 dark:text-gray-400">(Pinned announcements appear on top.)</span>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Target Audience (Label)</label>
                      <input
                        className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm text-gray-800 dark:text-white"
                        value={editTargetAudience}
                        onChange={(e) => setEditTargetAudience(e.target.value)}
                      />
                    </div>

                    <div>
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

          {/* Confirm + Toast */}
          <ConfirmModal
            open={confirmOpen}
            title={confirmTitle}
            description={confirmDesc}
            confirmText={confirmText}
            variant={confirmVariant}
            loading={confirmLoading}
            onCancel={() => {
              if (confirmLoading) return;
              setConfirmOpen(false);
            }}
            onConfirm={runConfirm}
          />
          <Toast open={toastOpen} message={toastMsg} kind={toastKind} onClose={() => setToastOpen(false)} />
        </main>
      </div>
    </div>
  );
};

export default AdminAnnouncements;
