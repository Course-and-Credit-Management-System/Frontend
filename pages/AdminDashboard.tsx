import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { User } from "../types";
import { api } from "../lib/api";
import { useNavigate } from "react-router-dom";

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

type AdminStatisticsResponse = {
  totalStudents: number;
  graduatedCount: number;
  retakeRequirement: number;
  averageGPA: number;
};

type AdminMajorDistributionItem = {
  major: string;
  count: number;
};

type PendingDoc = Record<string, any>;

type AdminPendingActionsResponse = {
  majorChanges?: PendingDoc[] | { count: number };
  scheduleConflicts?: PendingDoc[] | { count: number };

  // ✅ new backend shape
  mustResetPasswords?: PendingDoc[] | { count: number };
  mustResetPasswordCount?: number;
};

type HealthState = "online" | "degraded" | "offline" | "unknown";
type SessionState = "active" | "expired" | "unknown";

function cn(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(" ");
}

function formatNumber(n: any) {
  const num = Number(n);
  if (!Number.isFinite(num)) return "—";
  return new Intl.NumberFormat().format(num);
}

function formatCompact(n: any) {
  const num = Number(n);
  if (!Number.isFinite(num)) return "—";
  return new Intl.NumberFormat(undefined, { notation: "compact" }).format(num);
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function getCount(v: any): number {
  if (!v) return 0;
  if (Array.isArray(v)) return v.length;
  if (typeof v === "object" && typeof v.count === "number") return v.count;
  return 0;
}

function timeAgo(ts?: string | number) {
  if (!ts) return "—";
  const d = typeof ts === "number" ? new Date(ts) : new Date(ts);
  const t = d.getTime();
  if (!Number.isFinite(t)) return "—";
  const diff = Date.now() - t;
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return `${days}d ago`;
}

function detectHttpStatus(err: any): number | null {
  const direct = err?.status;
  if (typeof direct === "number") return direct;

  const nested = err?.response?.status;
  if (typeof nested === "number") return nested;

  const msg = String(err?.message || "");
  const m = msg.match(/\b(401|403|404|500|502|503)\b/);
  if (m) return Number(m[1]);

  return null;
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-gray-200/70 dark:bg-slate-700/50", className)} />;
}

function IconBadge({
  icon,
  tone = "primary",
}: {
  icon: string;
  tone?: "primary" | "emerald" | "amber" | "rose" | "cyan" | "indigo";
}) {
  const tones: Record<string, string> = {
    primary: "bg-teal-100 text-teal-700 dark:bg-teal-900/35 dark:text-teal-300",
    emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/35 dark:text-emerald-300",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/35 dark:text-amber-300",
    rose: "bg-rose-100 text-rose-700 dark:bg-rose-900/35 dark:text-rose-300",
    cyan: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/35 dark:text-cyan-300",
    indigo: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/35 dark:text-indigo-300",
  };
  return (
    <div className={cn("grid h-10 w-10 place-items-center rounded-xl", tones[tone])}>
      <span className="material-icons-outlined text-[20px]">{icon}</span>
    </div>
  );
}

function Pill({
  children,
  tone = "gray",
}: {
  children: React.ReactNode;
  tone?: "gray" | "green" | "amber" | "rose" | "cyan";
}) {
  const tones: Record<string, string> = {
    gray: "bg-gray-100 text-gray-700 dark:bg-slate-700/40 dark:text-slate-200",
    green: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/35 dark:text-emerald-200",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/35 dark:text-amber-200",
    rose: "bg-rose-100 text-rose-700 dark:bg-rose-900/35 dark:text-rose-200",
    cyan: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/35 dark:text-cyan-200",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", tones[tone])}>
      {children}
    </span>
  );
}

function StatusBadge({
  kind,
  status,
}: {
  kind: "Major Change" | "Schedule Conflict" | "Password Reset";
  status: string;
}) {
  const tone =
    kind === "Schedule Conflict" ? "rose" : kind === "Major Change" ? "amber" : "cyan";

  const cls =
    tone === "rose"
      ? "bg-rose-100 text-rose-700 dark:bg-rose-900/35 dark:text-rose-200"
      : tone === "amber"
      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/35 dark:text-amber-200"
      : "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/35 dark:text-cyan-200";

  return (
    <span className={cn("inline-flex rounded-full px-2 py-1 text-[11px] font-extrabold", cls)}>
      {status}
    </span>
  );
}

/**
 * CSS conic-gradient donut (no libs)
 */
function Donut({
  segments,
  centerTop,
  centerBottom,
}: {
  segments: { label: string; value: number; color: string }[];
  centerTop: string;
  centerBottom: string;
}) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  let start = 0;

  const stops = segments
    .map((s) => {
      const pct = (s.value / total) * 100;
      const from = start;
      const to = start + pct;
      start = to;
      return `${s.color} ${from.toFixed(2)}% ${to.toFixed(2)}%`;
    })
    .join(", ");

  return (
    <div className="relative grid place-items-center">
      <div className="h-44 w-44 rounded-full" style={{ background: `conic-gradient(${stops})` }} />
      <div className="absolute grid h-28 w-28 place-items-center rounded-full border border-border-light bg-surface-light shadow-sm dark:border-border-dark dark:bg-surface-dark">
        <div className="text-center">
          <div className="text-xl font-extrabold text-gray-900 dark:text-white">{centerTop}</div>
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400">{centerBottom}</div>
        </div>
      </div>
    </div>
  );
}

function Modal({
  open,
  title,
  subtitle,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-border-light bg-white shadow-2xl dark:border-border-dark dark:bg-surface-dark">
          <div className="flex items-start justify-between gap-4 border-b border-border-light px-5 py-4 dark:border-border-dark">
            <div className="min-w-0">
              <div className="text-lg font-extrabold text-gray-900 dark:text-white">{title}</div>
              {subtitle ? <div className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{subtitle}</div> : null}
            </div>
            <button
              onClick={onClose}
              className="rounded-xl border border-border-light bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 dark:border-border-dark dark:bg-slate-900/40 dark:text-white dark:hover:bg-slate-900/60"
            >
              <span className="material-icons-outlined text-[18px]">close</span>
            </button>
          </div>
          <div className="max-h-[74vh] overflow-y-auto p-5">{children}</div>
        </div>
      </div>
    </div>
  );
}

const AdminDashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();

  const [stats, setStats] = useState<AdminStatisticsResponse | null>(null);
  const [majors, setMajors] = useState<AdminMajorDistributionItem[]>([]);
  const [pending, setPending] = useState<AdminPendingActionsResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const [apiHealth, setApiHealth] = useState<HealthState>("unknown");
  const [dbHealth, setDbHealth] = useState<HealthState>("unknown");
  const [sessionState, setSessionState] = useState<SessionState>("unknown");

  // Pending modal
  const [pendingModalOpen, setPendingModalOpen] = useState(false);
  const [pendingModalTab, setPendingModalTab] = useState<"major" | "conflict" | "reset" | "all">("all");
  const [pendingSearch, setPendingSearch] = useState("");

  const load = async (mode: "initial" | "refresh" = "initial") => {
    try {
      mode === "refresh" ? setRefreshing(true) : setLoading(true);
      setError(null);

      const [s, m, p] = await Promise.all([
        api.adminStatistics(),
        api.adminMajorDistribution(),
        api.adminPendingActions(),
      ]);

      setStats(s);
      setMajors(Array.isArray(m) ? m : []);
      setPending(p);
      setLastUpdated(Date.now());

      setApiHealth("online");
      setDbHealth("online");
      setSessionState("active");
    } catch (e: any) {
      const status = detectHttpStatus(e);

      setApiHealth(lastUpdated ? "degraded" : "offline");
      setDbHealth(lastUpdated ? "degraded" : "offline");

      if (status === 401 || status === 403) setSessionState("expired");
      else setSessionState(lastUpdated ? "active" : "unknown");

      setError(e?.message || "Failed to load dashboard data");
    } finally {
      mode === "refresh" ? setRefreshing(false) : setLoading(false);
    }
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!alive) return;
      await load("initial");
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Counts
  const pendingMajorChanges = getCount(pending?.majorChanges);
  const pendingScheduleConflicts = getCount(pending?.scheduleConflicts);

  // ✅ backend now uses mustResetPasswords + mustResetPasswordCount
  const mustResetPasswordCount =
    typeof pending?.mustResetPasswordCount === "number"
      ? pending.mustResetPasswordCount
      : getCount(pending?.mustResetPasswords);

  const totalPending = pendingMajorChanges + pendingScheduleConflicts + (mustResetPasswordCount || 0);

  const majorWidget = useMemo(() => {
    const list = (majors || []).filter((x) => x && typeof x.count === "number" && x.count > 0);
    const total = list.reduce((a, x) => a + x.count, 0) || 0;

    const TOP_N = 6;
    const top = list.slice(0, TOP_N);
    const rest = list.slice(TOP_N);
    const othersCount = rest.reduce((a, x) => a + x.count, 0);

    const palette = ["#14b8a6", "#6366f1", "#22c55e", "#f59e0b", "#06b6d4", "#f43f5e", "#a855f7", "#94a3b8"];

    const segments = [
      ...top.map((x, idx) => ({
        label: x.major || `Major ${idx + 1}`,
        value: x.count,
        color: palette[idx % palette.length],
      })),
      ...(othersCount > 0 ? [{ label: "Other Majors", value: othersCount, color: palette[palette.length - 1] }] : []),
    ];

    const ranked = [
      ...top.map((x) => ({ label: x.major, value: x.count })),
      ...(othersCount > 0 ? [{ label: "Other Majors", value: othersCount }] : []),
    ];

    return { total, segments, ranked };
  }, [majors]);

  const kpis = useMemo(() => {
    const avgGpa = stats?.averageGPA ?? 0;
    const gpaTone = avgGpa >= 3.3 ? "emerald" : avgGpa >= 2.7 ? "cyan" : avgGpa > 0 ? "amber" : "primary";

    return [
      {
        label: "Total Students",
        value: stats ? formatCompact(stats.totalStudents) : "—",
        sub: "Active student accounts",
        icon: <IconBadge icon="groups" tone="primary" />,
        rightHint: stats ? `${formatNumber(stats.totalStudents)} records` : "—",
      },
      {
        label: "Graduated",
        value: stats ? formatCompact(stats.graduatedCount) : "—",
        sub: "Academic status: Graduated",
        icon: <IconBadge icon="school" tone="emerald" />,
        rightHint: stats ? `${formatNumber(stats.graduatedCount)} completed` : "—",
      },
      {
        label: "Retake Required",
        value: stats ? formatCompact(stats.retakeRequirement) : "—",
        sub: "Pending / conflict / waitlist",
        icon: <IconBadge icon="history_edu" tone="amber" />,
        rightHint: "Needs attention",
      },
      {
        label: "Average GPA",
        value: stats ? (stats.averageGPA || 0).toFixed(2) : "—",
        sub: "Across students with GPA",
        icon: <IconBadge icon="leaderboard" tone={gpaTone as any} />,
        rightHint: avgGpa ? (avgGpa >= 3.0 ? "Healthy" : "Watch") : "—",
      },
    ] as const;
  }, [stats]);

  const workQueue = useMemo(() => {
    const items: Array<{
      key: string;
      title: string;
      description: string;
      count: number;
      tone: "amber" | "rose" | "cyan" | "green";
      icon: string;
      route?: string;
      modalTab: "major" | "conflict" | "reset";
      sample?: PendingDoc;
    }> = [
      {
        key: "passwordResets",
        title: "Must Reset Password",
        description: "Accounts requiring password reset on next sign-in.",
        count: mustResetPasswordCount || 0,
        tone: "green",
        icon: "lock_reset",
        route: "/admin/students",
        modalTab: "reset",
        sample: Array.isArray(pending?.mustResetPasswords) ? pending?.mustResetPasswords?.[0] : undefined,
      },
      {
        key: "majorChanges",
        title: "Major Change Requests",
        description: "Students requesting major transitions/pending approvals.",
        count: pendingMajorChanges,
        tone: "amber",
        icon: "swap_horiz",
        route: "/admin/students",
        modalTab: "major",
        sample: Array.isArray(pending?.majorChanges) ? pending?.majorChanges?.[0] : undefined,
      },
      {
        key: "scheduleConflicts",
        title: "Schedule Conflicts",
        description: "Enrollments flagged as Conflict and require review.",
        count: pendingScheduleConflicts,
        tone: "rose",
        icon: "error_outline",
        route: "/admin/enrollment",
        modalTab: "conflict",
        sample: Array.isArray(pending?.scheduleConflicts) ? pending?.scheduleConflicts?.[0] : undefined,
      },
    ];

    return items.sort((a, b) => b.count - a.count);
  }, [pending, pendingMajorChanges, pendingScheduleConflicts, mustResetPasswordCount]);

  const surface =
    "rounded-2xl bg-surface-light shadow-sm border border-border-light dark:bg-surface-dark dark:border-border-dark";

  const healthPill = (h: HealthState) => {
    if (h === "online") return { tone: "green" as const, label: "Online" };
    if (h === "degraded") return { tone: "amber" as const, label: "Degraded" };
    if (h === "offline") return { tone: "rose" as const, label: "Offline" };
    return { tone: "gray" as const, label: "Unknown" };
  };

  const sessionPill = (s: SessionState) => {
    if (s === "active") return { tone: "cyan" as const, label: "Active" };
    if (s === "expired") return { tone: "rose" as const, label: "Expired" };
    return { tone: "gray" as const, label: "Unknown" };
  };

  // ✅ Pending modal data (fixed: mustResetPasswords)
  const pendingDocs = useMemo(() => {
    const major = Array.isArray(pending?.majorChanges) ? pending?.majorChanges : [];
    const conflict = Array.isArray(pending?.scheduleConflicts) ? pending?.scheduleConflicts : [];
    const reset = Array.isArray(pending?.mustResetPasswords) ? pending?.mustResetPasswords : [];

    const all: Array<{ kind: "Major Change" | "Schedule Conflict" | "Password Reset"; doc: PendingDoc }> = [
      ...major.map((doc) => ({ kind: "Major Change" as const, doc })),
      ...conflict.map((doc) => ({ kind: "Schedule Conflict" as const, doc })),
      ...reset.map((doc) => ({ kind: "Password Reset" as const, doc })),
    ];

    return { major, conflict, reset, all };
  }, [pending]);

  const modalList = useMemo(() => {
    const base =
      pendingModalTab === "major"
        ? pendingDocs.major.map((doc) => ({ kind: "Major Change" as const, doc }))
        : pendingModalTab === "conflict"
        ? pendingDocs.conflict.map((doc) => ({ kind: "Schedule Conflict" as const, doc }))
        : pendingModalTab === "reset"
        ? pendingDocs.reset.map((doc) => ({ kind: "Password Reset" as const, doc }))
        : pendingDocs.all;

    const q = pendingSearch.trim().toLowerCase();
    if (!q) return base;

    return base.filter(({ kind, doc }) => {
      const text = JSON.stringify({ kind, ...doc }).toLowerCase();
      return text.includes(q);
    });
  }, [pendingDocs, pendingModalTab, pendingSearch]);

  const openPendingModal = (tab: typeof pendingModalTab) => {
    setPendingModalTab(tab);
    setPendingModalOpen(true);
  };

  const go = (path: string) => navigate(path);

  // Row formatting for modal table (better UX)
  const rowMeta = (kind: "Major Change" | "Schedule Conflict" | "Password Reset", doc: PendingDoc) => {
    if (kind === "Password Reset") {
      const userObj = doc?.user || {};
      const name = userObj?.name || "Unknown";
      const email = userObj?.email || "";
      const uid = doc?.user_id || userObj?.id || "—";
      const key = email ? `${name} • ${email}` : `${name} • ${uid}`;
      const status = "must_reset_password";
      const id = String(doc?.id || doc?._id || uid || "");
      const when = doc?.updated_at || doc?.created_at;
      return { key, status, id, when };
    }

    if (kind === "Major Change") {
      const key = doc?.major_name || doc?.major_id || doc?.student_id || doc?.user_id || "—";
      const status = String(doc?.status || "—");
      const id = String(doc?._id || doc?.id || doc?.major_id || "");
      const when = doc?.updated_at || doc?.created_at;
      return { key: String(key), status, id, when };
    }

    // Schedule Conflict
    {
      const key =
        doc?.course_id ||
        doc?.course_code ||
        (doc?.student_id ? `Student ${doc.student_id}` : "") ||
        doc?.user_id ||
        "—";
      const status = String(doc?.status || "Conflict");
      const id = String(doc?._id || doc?.id || "");
      const when = doc?.updated_at || doc?.created_at;
      return { key: String(key), status, id, when };
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark">
      <Sidebar user={user} onLogout={onLogout} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title="Admin Dashboard" user={user} />

        <main className="flex-1 overflow-y-auto">
          {/* Top command bar */}
          <div className="px-6 pt-6">
            <div className={cn(surface, "p-5 md:p-6")}>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                      Operations Overview
                    </h1>
                    {refreshing ? (
                      <Pill tone="gray">
                        <span className="material-icons-outlined text-[14px] animate-spin">refresh</span>
                        Updating…
                      </Pill>
                    ) : (
                      <Pill tone="gray">
                        <span className="material-icons-outlined text-[14px]">schedule</span>
                        {lastUpdated ? `Updated ${timeAgo(lastUpdated)}` : "Not updated yet"}
                      </Pill>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Key metrics, major distribution, and pending actions requiring admin attention.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => load("refresh")}
                    className="inline-flex items-center gap-2 rounded-xl border border-border-light bg-white px-3.5 py-2 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50 dark:border-border-dark dark:bg-slate-900/40 dark:text-white dark:hover:bg-slate-900/60"
                  >
                    <span className={cn("material-icons-outlined text-[18px]", refreshing && "animate-spin")}>
                      refresh
                    </span>
                    Refresh
                  </button>

                  <div className="h-9 w-px bg-border-light dark:bg-border-dark" />

                  <button
                    onClick={() => go("/admin/announcements")}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95"
                  >
                    <span className="material-icons-outlined text-[18px]">campaign</span>
                    New Announcement
                  </button>

                  <button
                    onClick={() => go("/admin/courses")}
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-3.5 py-2 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50 dark:bg-slate-900/40 dark:text-white dark:hover:bg-slate-900/60"
                  >
                    <span className="material-icons-outlined text-[18px]">library_add</span>
                    Add Course
                  </button>

                  <button
                    onClick={() => go("/admin/students")}
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-3.5 py-2 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50 dark:bg-slate-900/40 dark:text-white dark:hover:bg-slate-900/60"
                  >
                    <span className="material-icons-outlined text-[18px]">person_add</span>
                    Add Student
                  </button>
                </div>
              </div>

              {error && (
                <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-200">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2">
                      <span className="material-icons-outlined mt-0.5 text-[18px]">error_outline</span>
                      <div>
                        <div className="font-semibold">Dashboard failed to load</div>
                        <div className="opacity-90">{error}</div>
                        {sessionState === "expired" ? (
                          <div className="mt-1 text-xs font-semibold">Session expired — please log in again.</div>
                        ) : null}
                      </div>
                    </div>
                    <button
                      onClick={() => load("refresh")}
                      className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:opacity-95"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* KPI row */}
          <div className="px-6 pt-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {kpis.map((kpi, idx) => (
                <div key={idx} className={cn(surface, "p-5 transition-all hover:-translate-y-0.5 hover:shadow-md")}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {kpi.icon}
                      <div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">{kpi.label}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{kpi.sub}</div>
                      </div>
                    </div>
                    <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">{kpi.rightHint}</div>
                  </div>

                  <div className="mt-4 flex items-end justify-between">
                    <div className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                      {loading ? <Skeleton className="h-9 w-24" /> : kpi.value}
                    </div>

                    <div className="flex items-end gap-1 opacity-80">
                      {[12, 22, 18, 30, 26, 40, 34].map((h, i) => (
                        <div
                          key={i}
                          className="w-1.5 rounded-sm bg-gray-300 dark:bg-slate-600"
                          style={{ height: `${h}px` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Main grid */}
          <div className="px-6 py-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              {/* Analytics (left) */}
              <section className={cn(surface, "lg:col-span-8 p-6")}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-extrabold text-gray-900 dark:text-white">Student Analytics</h2>
                      <Pill tone="cyan">
                        <span className="material-icons-outlined text-[14px]">insights</span>
                        Live
                      </Pill>
                    </div>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Snapshot of academic outcomes and operational load.
                      {stats ? ` • Avg GPA: ${stats.averageGPA.toFixed(2)}` : ""}
                    </p>
                  </div>

                  <button
                    onClick={() => openPendingModal("all")}
                    className="inline-flex items-center gap-2 rounded-xl border border-border-light bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 dark:border-border-dark dark:bg-slate-900/40 dark:text-white dark:hover:bg-slate-900/60"
                  >
                    <span className="material-icons-outlined text-[18px]">visibility</span>
                    View Queue
                  </button>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-emerald-50 p-5 dark:border-emerald-900/30 dark:bg-emerald-900/10">
                    <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-200/40 dark:bg-emerald-500/10" />
                    <div className="relative flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <IconBadge icon="school" tone="emerald" />
                        <div>
                          <div className="text-sm font-semibold text-gray-900 dark:text-white">Graduated</div>
                          <div className="text-xs text-gray-600 dark:text-gray-300">Completed students</div>
                        </div>
                      </div>
                      <Pill tone="green">
                        <span className="material-icons-outlined text-[14px]">trending_up</span>
                        Healthy
                      </Pill>
                    </div>

                    <div className="relative mt-5 flex items-end justify-between">
                      <div className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                        {loading ? <Skeleton className="h-10 w-28" /> : formatNumber(stats?.graduatedCount ?? 0)}
                      </div>
                      <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                        {stats?.totalStudents
                          ? `${Math.round(((stats.graduatedCount || 0) / (stats.totalStudents || 1)) * 100)}% of students`
                          : "—"}
                      </div>
                    </div>
                  </div>

                  <div className="relative overflow-hidden rounded-2xl border border-amber-100 bg-amber-50 p-5 dark:border-amber-900/30 dark:bg-amber-900/10">
                    <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-amber-200/40 dark:bg-amber-500/10" />
                    <div className="relative flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <IconBadge icon="history_edu" tone="amber" />
                        <div>
                          <div className="text-sm font-semibold text-gray-900 dark:text-white">Retake Required</div>
                          <div className="text-xs text-gray-600 dark:text-gray-300">Pending / conflict / waitlist</div>
                        </div>
                      </div>
                      <Pill tone="amber">
                        <span className="material-icons-outlined text-[14px]">priority_high</span>
                        Action
                      </Pill>
                    </div>

                    <div className="relative mt-5 flex items-end justify-between">
                      <div className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                        {loading ? <Skeleton className="h-10 w-28" /> : formatNumber(stats?.retakeRequirement ?? 0)}
                      </div>
                      <div className="text-xs font-semibold text-amber-700 dark:text-amber-300">Review enrollments</div>
                    </div>
                  </div>
                </div>

                {/* Major chart */}
                <div className="mt-6 rounded-2xl border border-border-light bg-gray-50 p-5 dark:border-border-dark dark:bg-slate-800/30">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-extrabold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                        Major Distribution
                      </h3>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Top majors and grouped remainder (scales to any number of majors).
                      </p>
                    </div>
                    <Pill tone="gray">
                      <span className="material-icons-outlined text-[14px]">pie_chart</span>
                      {loading ? "Loading…" : `${formatNumber(majorWidget.total)} students`}
                    </Pill>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
                    <div className="flex items-center justify-center">
                      {loading ? (
                        <div className="grid place-items-center">
                          <Skeleton className="h-44 w-44 rounded-full" />
                          <Skeleton className="mt-3 h-4 w-28" />
                        </div>
                      ) : majorWidget.total > 0 ? (
                        <Donut segments={majorWidget.segments} centerTop={formatCompact(majorWidget.total)} centerBottom="Students" />
                      ) : (
                        <div className="rounded-xl border border-border-light bg-white p-6 text-center text-sm text-gray-500 dark:border-border-dark dark:bg-slate-900/30 dark:text-gray-400">
                          No major data found.
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      {loading ? (
                        <>
                          <Skeleton className="h-12 w-full" />
                          <Skeleton className="h-12 w-full" />
                          <Skeleton className="h-12 w-full" />
                          <Skeleton className="h-12 w-full" />
                        </>
                      ) : (
                        majorWidget.ranked.map((r, idx) => {
                          const pct = majorWidget.total ? (r.value / majorWidget.total) * 100 : 0;
                          const color = majorWidget.segments[idx]?.color || "#94a3b8";
                          return (
                            <div key={`${r.label}-${idx}`} className="rounded-xl border border-border-light bg-white p-3 dark:border-border-dark dark:bg-slate-900/30">
                              <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                                    <div className="truncate text-sm font-semibold text-gray-900 dark:text-white">{r.label || "—"}</div>
                                  </div>
                                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    {formatNumber(r.value)} students • {pct.toFixed(1)}%
                                  </div>
                                </div>
                                <div className="text-sm font-extrabold text-gray-900 dark:text-white">{formatCompact(r.value)}</div>
                              </div>

                              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-slate-700/50">
                                <div className="h-full rounded-full" style={{ width: `${clamp(pct, 0, 100)}%`, backgroundColor: color }} />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {/* Right column */}
              <aside className="lg:col-span-4 flex flex-col gap-6">
                {/* System Status */}
                <div className={cn(surface, "p-6")}>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-extrabold text-gray-900 dark:text-white">System Status</h3>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Live health derived from API calls</p>
                    </div>
                    {(() => {
                      const pill =
                        apiHealth === "online" && sessionState === "active"
                          ? { tone: "green" as const, label: "Operational" }
                          : apiHealth === "degraded"
                          ? { tone: "amber" as const, label: "Degraded" }
                          : apiHealth === "offline"
                          ? { tone: "rose" as const, label: "Offline" }
                          : { tone: "gray" as const, label: "Unknown" };
                      return (
                        <Pill tone={pill.tone}>
                          <span className="material-icons-outlined text-[14px]">
                            {pill.tone === "green" ? "verified" : pill.tone === "amber" ? "warning_amber" : "error_outline"}
                          </span>
                          {pill.label}
                        </Pill>
                      );
                    })()}
                  </div>

                  <div className="mt-5 space-y-3">
                    {(() => {
                      const p = healthPill(apiHealth);
                      return (
                        <div className="flex items-center justify-between rounded-xl border border-border-light bg-white px-4 py-3 dark:border-border-dark dark:bg-slate-900/30">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "material-icons-outlined text-[18px]",
                                p.tone === "green"
                                  ? "text-emerald-500"
                                  : p.tone === "amber"
                                  ? "text-amber-500"
                                  : p.tone === "rose"
                                  ? "text-rose-500"
                                  : "text-slate-400"
                              )}
                            >
                              dns
                            </span>
                            <div className="text-sm font-semibold text-gray-900 dark:text-white">API</div>
                          </div>
                          <div
                            className={cn(
                              "text-xs font-bold",
                              p.tone === "green"
                                ? "text-emerald-600 dark:text-emerald-300"
                                : p.tone === "amber"
                                ? "text-amber-700 dark:text-amber-300"
                                : p.tone === "rose"
                                ? "text-rose-700 dark:text-rose-300"
                                : "text-slate-500 dark:text-slate-300"
                            )}
                          >
                            {p.label}
                          </div>
                        </div>
                      );
                    })()}

                    {(() => {
                      const p = healthPill(dbHealth);
                      return (
                        <div className="flex items-center justify-between rounded-xl border border-border-light bg-white px-4 py-3 dark:border-border-dark dark:bg-slate-900/30">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "material-icons-outlined text-[18px]",
                                p.tone === "green"
                                  ? "text-emerald-500"
                                  : p.tone === "amber"
                                  ? "text-amber-500"
                                  : p.tone === "rose"
                                  ? "text-rose-500"
                                  : "text-slate-400"
                              )}
                            >
                              storage
                            </span>
                            <div className="text-sm font-semibold text-gray-900 dark:text-white">Database</div>
                          </div>
                          <div
                            className={cn(
                              "text-xs font-bold",
                              p.tone === "green"
                                ? "text-emerald-600 dark:text-emerald-300"
                                : p.tone === "amber"
                                ? "text-amber-700 dark:text-amber-300"
                                : p.tone === "rose"
                                ? "text-rose-700 dark:text-rose-300"
                                : "text-slate-500 dark:text-slate-300"
                            )}
                          >
                            {p.label}
                          </div>
                        </div>
                      );
                    })()}

                    {(() => {
                      const p = sessionPill(sessionState);
                      return (
                        <div className="flex items-center justify-between rounded-xl border border-border-light bg-white px-4 py-3 dark:border-border-dark dark:bg-slate-900/30">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "material-icons-outlined text-[18px]",
                                p.tone === "cyan" ? "text-cyan-500" : p.tone === "rose" ? "text-rose-500" : "text-slate-400"
                              )}
                            >
                              admin_panel_settings
                            </span>
                            <div className="text-sm font-semibold text-gray-900 dark:text-white">Admin Session</div>
                          </div>
                          <div
                            className={cn(
                              "text-xs font-bold",
                              p.tone === "cyan"
                                ? "text-cyan-700 dark:text-cyan-300"
                                : p.tone === "rose"
                                ? "text-rose-700 dark:text-rose-300"
                                : "text-slate-500 dark:text-slate-300"
                            )}
                          >
                            {p.label}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="mt-5 rounded-xl bg-gray-50 p-4 text-xs text-gray-600 dark:bg-slate-800/30 dark:text-gray-300">
                    Tip: Use <span className="font-bold">Refresh</span> for real-time updates during enrollment periods.
                    <div className="mt-1 opacity-80">{lastUpdated ? `Last check: ${timeAgo(lastUpdated)}` : "No checks yet."}</div>
                  </div>
                </div>

                {/* Pending inbox */}
                <div className={cn(surface, "p-6")}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-extrabold text-gray-900 dark:text-white">Pending Actions</h3>
                        <Pill tone={totalPending > 0 ? "amber" : "green"}>
                          <span className="material-icons-outlined text-[14px]">{totalPending > 0 ? "hourglass_top" : "task_alt"}</span>
                          {loading ? "Loading…" : totalPending > 0 ? `${totalPending} pending` : "All clear"}
                        </Pill>
                      </div>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Work queue generated from live collections.</p>
                    </div>

                    <button onClick={() => openPendingModal("all")} className="text-sm font-semibold text-primary hover:underline">
                      View all
                    </button>
                  </div>

                  <div className="mt-5 space-y-3">
                    {loading ? (
                      <>
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                      </>
                    ) : (
                      workQueue.map((w) => (
                        <div
                          key={w.key}
                          className="rounded-2xl border border-border-light bg-white p-4 transition-all hover:-translate-y-0.5 hover:shadow-sm dark:border-border-dark dark:bg-slate-900/30"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <IconBadge icon={w.icon} tone={w.tone === "rose" ? "rose" : w.tone === "amber" ? "amber" : w.tone === "cyan" ? "cyan" : "emerald"} />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <div className="truncate text-sm font-extrabold text-gray-900 dark:text-white">{w.title}</div>
                                  {w.count > 0 ? (
                                    <Pill tone={w.tone === "rose" ? "rose" : w.tone === "amber" ? "amber" : w.tone === "cyan" ? "cyan" : "green"}>{w.count}</Pill>
                                  ) : (
                                    <Pill tone="gray">0</Pill>
                                  )}
                                </div>
                                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{w.description}</div>

                                {w.sample ? (
                                  <div className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
                                    Latest:{" "}
                                    <span className="font-semibold text-gray-700 dark:text-gray-200">
                                      {(w.sample?.user?.name && w.sample?.user?.email)
                                        ? `${w.sample.user.name} • ${w.sample.user.email}`
                                        : w.sample?.major_name || w.sample?.student_id || w.sample?.course_id || w.sample?.user_id || "record"}
                                    </span>{" "}
                                    • {timeAgo(w.sample?.updated_at || w.sample?.created_at)}
                                  </div>
                                ) : null}
                              </div>
                            </div>

                            <div className="flex flex-col gap-2">
                              <button
                                onClick={() => openPendingModal(w.modalTab)}
                                className={cn(
                                  "rounded-xl px-3 py-2 text-xs font-extrabold shadow-sm",
                                  w.count > 0 ? "bg-primary text-white hover:opacity-95" : "bg-gray-100 text-gray-600 dark:bg-slate-700/40 dark:text-slate-200"
                                )}
                              >
                                Review
                              </button>

                              <button
                                onClick={() => {
                                  if (w.route) go(w.route);
                                }}
                                className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-gray-900 hover:bg-gray-50 dark:bg-slate-900/40 dark:text-white dark:hover:bg-slate-900/60"
                              >
                                Details
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </aside>
            </div>

            <footer className="mt-6 border-t border-border-light pt-6 text-center text-xs text-gray-400 dark:border-border-dark">
              © {new Date().getFullYear()} University Admin System • Built for real operations
            </footer>
          </div>
        </main>
      </div>

      {/* Pending Queue Modal */}
      <Modal
        open={pendingModalOpen}
        title="Pending Queue"
        subtitle="Live records returned by /api/v1/admin/pending-actions"
        onClose={() => setPendingModalOpen(false)}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {[
              { key: "all", label: `All (${pendingDocs.all.length})` },
              { key: "major", label: `Major Changes (${pendingDocs.major.length})` },
              { key: "conflict", label: `Conflicts (${pendingDocs.conflict.length})` },
              { key: "reset", label: `Password Reset (${pendingDocs.reset.length || mustResetPasswordCount || 0})` },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setPendingModalTab(t.key as any)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-extrabold border transition",
                  pendingModalTab === t.key
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border-light bg-white text-gray-700 hover:bg-gray-50 dark:border-border-dark dark:bg-slate-900/30 dark:text-gray-200 dark:hover:bg-slate-900/50"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="relative">
            <span className="material-icons-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-gray-400">
              search
            </span>
            <input
              value={pendingSearch}
              onChange={(e) => setPendingSearch(e.target.value)}
              placeholder="Search in queue…"
              className="w-full rounded-xl border border-border-light bg-white pl-10 pr-3 py-2 text-sm font-semibold text-gray-900 shadow-sm outline-none focus:ring-2 focus:ring-primary/30 dark:border-border-dark dark:bg-slate-900/30 dark:text-white"
            />
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-border-light dark:border-border-dark">
          <div className="grid grid-cols-12 bg-gray-50 px-4 py-2 text-[11px] font-extrabold uppercase tracking-wider text-gray-600 dark:bg-slate-900/40 dark:text-gray-300">
            <div className="col-span-3">Type</div>
            <div className="col-span-5">Key</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2 text-right">Updated</div>
          </div>

          <div className="divide-y divide-border-light dark:divide-border-dark">
            {modalList.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">No items in this bucket.</div>
            ) : (
              modalList.slice(0, 50).map((row, idx) => {
                const doc = row.doc || {};
                const meta = rowMeta(row.kind, doc);

                return (
                  <button
                    key={idx}
                    onClick={() => {
                      if (row.kind === "Schedule Conflict") go("/admin/enrollment");
                      else go("/admin/students");
                    }}
                    className="grid w-full grid-cols-12 items-center px-4 py-3 text-left text-sm hover:bg-gray-50 dark:hover:bg-slate-900/40"
                  >
                    <div className="col-span-3 font-extrabold text-gray-900 dark:text-white">{row.kind}</div>
                    <div className="col-span-5 truncate text-gray-700 dark:text-gray-200">{meta.key}</div>
                    <div className="col-span-2">
                      <StatusBadge kind={row.kind} status={meta.status} />
                    </div>
                    <div className="col-span-2 text-right text-xs font-bold text-gray-500 dark:text-gray-400">
                      {meta.when ? timeAgo(meta.when) : "—"}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button
            onClick={() => go("/admin/enrollment")}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-extrabold text-white hover:opacity-95"
          >
            Go to Enrollment
          </button>
          <button
            onClick={() => go("/admin/students")}
            className="rounded-xl border border-border-light bg-white px-4 py-2 text-sm font-bold text-gray-900 hover:bg-gray-50 dark:border-border-dark dark:bg-slate-900/40 dark:text-white dark:hover:bg-slate-900/60"
          >
            Go to Students
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default AdminDashboard;