import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { User } from "../types";
import { api } from "../lib/api";

type SyllabusItem = { week: number; topic: string };

type CourseDetailsData = {
  course_code: string;
  title: string;
  instructor?: string;
  instructor_email?: string;
  credits?: number;
  schedule?: string[] | string;
  room?: string;
  description?: string;
  prerequisites?: string[];
  type?: string;
  department?: string;
  syllabus?: SyllabusItem[];
};

interface Props {
  user: User;
  onLogout: () => void;
}

const MAX_WEEKS_DEFAULT = 20;

function normalizeSchedule(scheduleRaw: any): string[] {
  if (!scheduleRaw) return [];
  if (Array.isArray(scheduleRaw)) {
    return scheduleRaw
      .map((x) => (typeof x === "string" ? x.trim() : ""))
      .filter(Boolean);
  }
  if (typeof scheduleRaw === "string") {
    const s = scheduleRaw.trim();
    return s ? [s] : [];
  }
  return [];
}

function normalizeSyllabus(raw: any): SyllabusItem[] {
  if (!Array.isArray(raw)) return [];
  const cleaned = raw
    .map((x) => ({
      week: Number(x?.week),
      topic: typeof x?.topic === "string" ? x.topic.trim() : "",
    }))
    .filter((x) => Number.isFinite(x.week) && x.week > 0 && x.topic.length > 0);

  // sort + unique by week (keep first)
  const seen = new Set<number>();
  const uniq: SyllabusItem[] = [];
  for (const it of cleaned.sort((a, b) => a.week - b.week)) {
    if (seen.has(it.week)) continue;
    seen.add(it.week);
    uniq.push(it);
  }
  return uniq;
}

function deepEqualSyllabus(a: SyllabusItem[], b: SyllabusItem[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].week !== b[i].week) return false;
    if (a[i].topic !== b[i].topic) return false;
  }
  return true;
}

const AdminCourseDetails: React.FC<Props> = ({ user, onLogout }) => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();

  const [course, setCourse] = useState<CourseDetailsData | null>(null);
  const [loading, setLoading] = useState(true);

  // syllabus editing state
  const [syllabusDraft, setSyllabusDraft] = useState<SyllabusItem[]>([]);
  const [syllabusOriginal, setSyllabusOriginal] = useState<SyllabusItem[]>([]);

  // UX states
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const [syllabusSearch, setSyllabusSearch] = useState("");

  // modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [editingWeek, setEditingWeek] = useState<number | null>(null);

  const [weekSelect, setWeekSelect] = useState<number>(1);
  const [topicInput, setTopicInput] = useState<string>("");

  const toastTimer = useRef<number | null>(null);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2400);
  };

  const maxWeeks = MAX_WEEKS_DEFAULT;

  const schedule = useMemo(() => normalizeSchedule(course?.schedule), [course?.schedule]);

  const hasUnsavedChanges = useMemo(() => {
    return !deepEqualSyllabus(syllabusOriginal, syllabusDraft);
  }, [syllabusOriginal, syllabusDraft]);

  const usedWeeks = useMemo(() => new Set(syllabusDraft.map((x) => x.week)), [syllabusDraft]);

  const nextAvailableWeek = useMemo(() => {
    for (let w = 1; w <= maxWeeks; w++) {
      if (!usedWeeks.has(w)) return w;
    }
    return maxWeeks + 1; // fallback if 1..maxWeeks all used
  }, [usedWeeks, maxWeeks]);

  const weekOptions = useMemo(() => {
    // allow 1..maxWeeks, plus if nextAvailableWeek exceeds maxWeeks, add it too
    const base = Array.from({ length: maxWeeks }, (_, i) => i + 1);
    if (nextAvailableWeek > maxWeeks) base.push(nextAvailableWeek);
    return base;
  }, [maxWeeks, nextAvailableWeek]);

  const filteredSyllabus = useMemo(() => {
    const q = syllabusSearch.trim().toLowerCase();
    if (!q) return syllabusDraft.slice().sort((a, b) => a.week - b.week);
    return syllabusDraft
      .slice()
      .sort((a, b) => a.week - b.week)
      .filter((it) => String(it.week).includes(q) || it.topic.toLowerCase().includes(q));
  }, [syllabusDraft, syllabusSearch]);

  // ----------------------------
  // Fetch course
  // ----------------------------
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        if (!courseId) throw new Error("Missing course code");

        const data = await api.adminCourseByCode(courseId);

        const normalized: CourseDetailsData = {
          ...data,
          course_code: data?.course_code ?? courseId,
          syllabus: normalizeSyllabus(data?.syllabus),
        };

        if (!alive) return;

        setCourse(normalized);
        setSyllabusOriginal(normalized.syllabus || []);
        setSyllabusDraft(normalized.syllabus || []);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message || "Failed to load course");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [courseId]);

  // ----------------------------
  // Modal helpers
  // ----------------------------
  const openAddModal = () => {
    setModalMode("add");
    setEditingWeek(null);
    setWeekSelect(nextAvailableWeek);
    setTopicInput("");
    setModalOpen(true);
  };

  const openEditModal = (item: SyllabusItem) => {
    setModalMode("edit");
    setEditingWeek(item.week);
    setWeekSelect(item.week);
    setTopicInput(item.topic);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalMode("add");
    setEditingWeek(null);
    setTopicInput("");
  };

  const validateModal = (): string | null => {
    const topic = topicInput.trim();
    if (!topic) return "Topic is required";

    const w = Number(weekSelect);
    if (!Number.isFinite(w) || w <= 0) return "Week must be a valid number";

    // If adding, week must be unused
    if (modalMode === "add" && usedWeeks.has(w)) return `Week ${w} is already used`;

    // If editing, allow same week as the editing item, but prevent conflicts
    if (modalMode === "edit") {
      if (editingWeek == null) return "Missing editing week";
      if (w !== editingWeek && usedWeeks.has(w)) return `Week ${w} is already used`;
    }

    return null;
  };

  const commitModal = () => {
    const err = validateModal();
    if (err) {
      showToast("error", err);
      return;
    }

    const w = Number(weekSelect);
    const topic = topicInput.trim();

    setSyllabusDraft((prev) => {
      let next = prev.slice();

      if (modalMode === "add") {
        next.push({ week: w, topic });
      } else {
        // edit
        next = next.map((it) => (it.week === editingWeek ? { week: w, topic } : it));
      }

      // normalize: sort + unique by week
      next = normalizeSyllabus(next);
      return next;
    });

    closeModal();
    showToast("success", modalMode === "add" ? "Syllabus item added" : "Syllabus item updated");
  };

  // ----------------------------
  // Actions
  // ----------------------------
  const removeItem = (week: number) => {
    const ok = window.confirm(`Delete Week ${week}?`);
    if (!ok) return;

    setSyllabusDraft((prev) => prev.filter((it) => it.week !== week));
    showToast("success", `Week ${week} deleted`);
  };

  const moveItem = (week: number, dir: "up" | "down") => {
    setSyllabusDraft((prev) => {
      const sorted = prev.slice().sort((a, b) => a.week - b.week);
      const idx = sorted.findIndex((x) => x.week === week);
      if (idx < 0) return prev;

      const targetIdx = dir === "up" ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= sorted.length) return prev;

      // Swap weeks to reflect the "ordering" concept while preserving unique week numbers.
      // But better UX: swap their week numbers (so Week labels follow order).
      const a = sorted[idx];
      const b = sorted[targetIdx];
      const swapped = sorted.map((it) => {
        if (it.week === a.week) return { ...it, week: b.week };
        if (it.week === b.week) return { ...it, week: a.week };
        return it;
      });

      return normalizeSyllabus(swapped);
    });
  };

  const discardChanges = () => {
    const ok = window.confirm("Discard all unsaved syllabus changes?");
    if (!ok) return;
    setSyllabusDraft(syllabusOriginal);
    showToast("success", "Changes discarded");
  };

  const saveChanges = async () => {
    if (!courseId) return;

    try {
      setSaving(true);
      setError(null);

      // Always send syllabus in normalized form
      const payload = { syllabus: normalizeSyllabus(syllabusDraft) };

      await api.adminUpdateCourse(courseId, payload);

      setSyllabusOriginal(payload.syllabus);
      setSyllabusDraft(payload.syllabus);

      showToast("success", "Syllabus saved");
    } catch (e: any) {
      setError(e?.message || "Failed to save syllabus");
      showToast("error", e?.message || "Failed to save syllabus");
    } finally {
      setSaving(false);
    }
  };

  // ----------------------------
  // Render states
  // ----------------------------
  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark font-poppins">
        <Sidebar user={user} onLogout={onLogout} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header title="Course Details (Admin)" user={user} />
          <main className="flex-1 overflow-y-auto p-6 lg:p-8">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center text-sm text-gray-500 hover:text-primary mb-6 transition-colors"
            >
              <span className="material-icons-outlined text-sm mr-1">arrow_back</span>
              Back to Courses
            </button>

            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-surface-dark p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-6 w-56 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-10 w-2/3 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark font-poppins">
        <Sidebar user={user} onLogout={onLogout} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header title="Course Details (Admin)" user={user} />
          <main className="flex-1 overflow-y-auto p-6 lg:p-8">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center text-sm text-gray-500 hover:text-primary mb-6 transition-colors"
            >
              <span className="material-icons-outlined text-sm mr-1">arrow_back</span>
              Back to Courses
            </button>

            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
              {error || "Course not found"}
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark font-poppins">
      <Sidebar user={user} onLogout={onLogout} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title="Course Details (Admin)" user={user} />

        {/* Toast */}
        {toast && (
          <div className="fixed top-5 right-5 z-[60]">
            <div
              className={`rounded-xl px-4 py-3 shadow-lg border text-sm ${
                toast.type === "success"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-900/40 dark:text-emerald-200"
                  : "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-900/40 dark:text-red-200"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="material-icons-outlined text-base">
                  {toast.type === "success" ? "check_circle" : "error"}
                </span>
                <span>{toast.msg}</span>
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          {/* Top actions */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary transition-colors"
            >
              <span className="material-icons-outlined text-sm">arrow_back</span>
              Back to Courses
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={openAddModal}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover transition-colors shadow-sm"
              >
                <span className="material-icons-outlined text-base">add</span>
                Add Syllabus Item
              </button>
            </div>
          </div>

          {/* Unsaved changes bar */}
          {hasUnsavedChanges && (
            <div className="sticky top-0 z-40 mb-6">
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 shadow-sm dark:border-amber-900/40 dark:bg-amber-900/20">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
                    <span className="material-icons-outlined text-base">info</span>
                    <span className="text-sm font-semibold">You have unsaved syllabus changes</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={discardChanges}
                      disabled={saving}
                      className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-60 dark:bg-transparent dark:border-amber-900/40 dark:text-amber-200 dark:hover:bg-amber-900/20"
                    >
                      Discard
                    </button>
                    <button
                      onClick={saveChanges}
                      disabled={saving}
                      className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
                    >
                      {saving ? "Saving..." : "Save changes"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* LEFT */}
            <div className="lg:col-span-2 space-y-8">
              {/* Hero */}
              <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-8 border border-gray-200 dark:border-gray-700 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                  <span className="material-icons-outlined text-9xl">menu_book</span>
                </div>

                <div className="relative z-10">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                      {course.type || "Course"}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400 font-mono text-sm">
                      {course.course_code}
                    </span>
                    {course.department && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        • {course.department}
                      </span>
                    )}
                  </div>

                  <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-3">
                    {course.title || "—"}
                  </h1>

                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                    {course.description?.trim()
                      ? course.description
                      : "No description available yet."}
                  </p>
                </div>
              </div>

              {/* Weekly Syllabus */}
              <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-lg text-gray-800 dark:text-white">
                      Weekly Syllabus
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Add topics by week. Use reorder buttons to adjust pacing.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative w-full sm:w-64">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                        <span className="material-icons-outlined text-gray-400 text-base">
                          search
                        </span>
                      </span>
                      <input
                        value={syllabusSearch}
                        onChange={(e) => setSyllabusSearch(e.target.value)}
                        placeholder="Search week/topic..."
                        className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-700 dark:bg-slate-800 dark:text-gray-200"
                      />
                    </div>

                    <button
                      onClick={openAddModal}
                      className="hidden sm:inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
                    >
                      <span className="material-icons-outlined text-base">add</span>
                      Add
                    </button>
                  </div>
                </div>

                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredSyllabus.length ? (
                    filteredSyllabus.map((item) => (
                      <div
                        key={item.week}
                        className="px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="h-10 w-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                            W{item.week}
                          </div>

                          <div className="min-w-0">
                            <div className="text-sm text-gray-800 dark:text-gray-100 font-semibold truncate">
                              {item.topic}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              Week {item.week}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => moveItem(item.week, "up")}
                            className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-slate-800 dark:hover:bg-slate-700"
                            title="Move up"
                          >
                            <span className="material-icons-outlined text-base text-gray-500">
                              arrow_upward
                            </span>
                          </button>

                          <button
                            onClick={() => moveItem(item.week, "down")}
                            className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-slate-800 dark:hover:bg-slate-700"
                            title="Move down"
                          >
                            <span className="material-icons-outlined text-base text-gray-500">
                              arrow_downward
                            </span>
                          </button>

                          <button
                            onClick={() => openEditModal(item)}
                            className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-slate-800 dark:hover:bg-slate-700"
                            title="Edit"
                          >
                            <span className="material-icons-outlined text-base text-gray-500">
                              edit
                            </span>
                          </button>

                          <button
                            onClick={() => removeItem(item.week)}
                            className="p-2 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 dark:border-red-900/30 dark:bg-red-900/20 dark:hover:bg-red-900/30"
                            title="Delete"
                          >
                            <span className="material-icons-outlined text-base text-red-600 dark:text-red-300">
                              delete
                            </span>
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="px-6 py-10">
                      <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-slate-800 p-8 text-center">
                        <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                          <span className="material-icons-outlined">playlist_add</span>
                        </div>
                        <h4 className="mt-3 text-sm font-bold text-gray-800 dark:text-white">
                          No syllabus available yet
                        </h4>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          Add weekly topics so students know what’s coming.
                        </p>
                        <button
                          onClick={openAddModal}
                          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover"
                        >
                          <span className="material-icons-outlined text-base">add</span>
                          Add first syllabus item
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT */}
            <div className="space-y-6">
              <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                <h3 className="font-bold text-gray-800 dark:text-white mb-4">
                  Course Information
                </h3>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <span className="material-icons-outlined text-gray-400 mt-0.5">
                      person
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-800 dark:text-white truncate">
                        {course.instructor || "—"}
                      </p>
                      {course.instructor_email ? (
                        <a
                          href={`mailto:${course.instructor_email}`}
                          className="text-xs text-gray-500 hover:text-primary break-all"
                        >
                          {course.instructor_email}
                        </a>
                      ) : (
                        <p className="text-xs text-gray-500">—</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="material-icons-outlined text-gray-400 mt-0.5">
                      schedule
                    </span>
                    <div>
                      <p className="text-sm font-bold text-gray-800 dark:text-white">
                        Schedule
                      </p>
                      {schedule.length ? (
                        <ul className="mt-1 space-y-1">
                          {schedule.map((s, i) => (
                            <li key={i} className="text-xs text-gray-500">
                              {s}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-gray-500">—</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="material-icons-outlined text-gray-400 mt-0.5">
                      location_on
                    </span>
                    <div>
                      <p className="text-sm font-bold text-gray-800 dark:text-white">
                        Location
                      </p>
                      <p className="text-xs text-gray-500">{course.room || "—"}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="material-icons-outlined text-gray-400 mt-0.5">
                      stars
                    </span>
                    <div>
                      <p className="text-sm font-bold text-gray-800 dark:text-white">
                        Credits
                      </p>
                      <p className="text-xs text-gray-500">
                        {Number(course.credits ?? 0)} Credit Hours
                      </p>
                    </div>
                  </div>

                  {course.department && (
                    <div className="flex items-start gap-3">
                      <span className="material-icons-outlined text-gray-400 mt-0.5">
                        apartment
                      </span>
                      <div>
                        <p className="text-sm font-bold text-gray-800 dark:text-white">
                          Department
                        </p>
                        <p className="text-xs text-gray-500">{course.department}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                    Prerequisites
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {Array.isArray(course.prerequisites) && course.prerequisites.length ? (
                      course.prerequisites.map((req, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 rounded text-xs font-medium"
                        >
                          {req}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-gray-500">None</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick tools */}
              <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                <h3 className="font-bold text-gray-800 dark:text-white mb-2">
                  Quick Actions
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                  Speed up syllabus creation.
                </p>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => {
                      setModalMode("add");
                      setEditingWeek(null);
                      setWeekSelect(nextAvailableWeek);
                      setTopicInput("");
                      setModalOpen(true);
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:bg-slate-800 dark:text-gray-200 dark:hover:bg-slate-700"
                  >
                    <span className="material-icons-outlined text-base">add</span>
                    Add next available week (W{nextAvailableWeek})
                  </button>

                  <button
                    onClick={() => {
                      // auto-sort & normalize draft
                      setSyllabusDraft((prev) => normalizeSyllabus(prev));
                      showToast("success", "Syllabus normalized (sorted & cleaned)");
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:bg-slate-800 dark:text-gray-200 dark:hover:bg-slate-700"
                  >
                    <span className="material-icons-outlined text-base">sort</span>
                    Normalize (Sort & Clean)
                  </button>

                  <button
                    onClick={() => {
                      if (!syllabusDraft.length) {
                        showToast("error", "No syllabus items to clear");
                        return;
                      }
                      const ok = window.confirm("Clear ALL syllabus items?");
                      if (!ok) return;
                      setSyllabusDraft([]);
                      showToast("success", "All syllabus cleared");
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-200 dark:hover:bg-red-900/30"
                  >
                    <span className="material-icons-outlined text-base">delete_sweep</span>
                    Clear all syllabus
                  </button>

                  <button
                    onClick={saveChanges}
                    disabled={saving || !hasUnsavedChanges}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <span className="material-icons-outlined text-base">save</span>
                    {saving ? "Saving..." : "Save syllabus"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Modal */}
        {modalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                <div>
                  <h3 className="font-bold text-gray-800 dark:text-white">
                    {modalMode === "add" ? "Add Syllabus Item" : "Edit Syllabus Item"}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Week is selected from a list (no free typing).
                  </p>
                </div>

                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <span className="material-icons-outlined">close</span>
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Week dropdown */}
                <div>
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400">
                    Week
                  </label>

                  <div className="mt-1 flex items-center gap-2">
                    <select
                      value={weekSelect}
                      onChange={(e) => setWeekSelect(Number(e.target.value))}
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-800 dark:text-gray-200 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {weekOptions.map((w) => {
                        const disabled =
                          modalMode === "add" ? usedWeeks.has(w) : editingWeek !== w && usedWeeks.has(w);

                        return (
                          <option key={w} value={w} disabled={disabled}>
                            Week {w} {disabled ? "• already used" : ""}
                          </option>
                        );
                      })}
                    </select>

                    <button
                      onClick={() => setWeekSelect(nextAvailableWeek)}
                      className="shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:bg-slate-800 dark:text-gray-200 dark:hover:bg-slate-700"
                      title="Jump to next available week"
                    >
                      Next
                    </button>
                  </div>

                  <p className="mt-1 text-[11px] text-gray-400">
                    Tip: Use “Next” to jump to the first unused week.
                  </p>
                </div>

                {/* Topic */}
                <div>
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400">
                    Topic
                  </label>
                  <input
                    value={topicInput}
                    onChange={(e) => setTopicInput(e.target.value)}
                    placeholder="e.g. Intro to Flutter Widgets"
                    className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-800 dark:text-gray-200 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <p className="mt-1 text-[11px] text-gray-400">
                    Keep it clear and student-friendly.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 dark:border-gray-700">
                <button
                  onClick={closeModal}
                  className="rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>

                <button
                  onClick={commitModal}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
                >
                  {modalMode === "add" ? "Add item" : "Save changes"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCourseDetails;
    