import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from 'react-i18next';
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
  major?: string;
  track?: string;
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
    <div className="flex h-screen overflow-hidden bg-white dark:bg-slate-950 font-poppins">
      <Sidebar user={user} onLogout={onLogout} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title="Course Details (Admin)" user={user} />

        {/* Toast */}
        {toast && (
          <div className="fixed top-5 right-5 z-[60]">
            <div
              className={`rounded-2xl px-6 py-4 shadow-xl border text-sm font-bold ${
                toast.type === "success"
                  ? "bg-teal-50 border-teal-200 text-teal-800 dark:bg-teal-900/20 dark:border-teal-900/40 dark:text-teal-200"
                  : "bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-900/20 dark:border-rose-900/40 dark:text-rose-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="material-icons-outlined text-lg">
                  {toast.type === "success" ? "check_circle" : "error"}
                </span>
                <span>{toast.msg}</span>
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-6 lg:p-10">
          {/* Top actions */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-10">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-teal-600 transition-colors bg-slate-50 dark:bg-slate-900/50 px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-800"
            >
              <span className="material-icons-outlined text-base">arrow_back</span>
              Back to Courses
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={openAddModal}
                className="inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-6 py-3.5 text-sm font-bold text-white hover:bg-teal-700 transition-all shadow-lg active:scale-[0.98]"
              >
                <span className="material-icons-outlined text-lg">add</span>
                Add Syllabus Module
              </button>
            </div>
          </div>

          {/* Unsaved changes bar */}
          {hasUnsavedChanges && (
            <div className="sticky top-0 z-40 mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="rounded-[24px] border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/10 px-6 py-4 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3 text-amber-800 dark:text-amber-200">
                    <div className="h-10 w-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
                      <span className="material-icons-outlined text-xl">warning_amber</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold tracking-tight">Unsaved Sequencing Changes</h4>
                      <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mt-0.5">Commit timeline layout adjustments to curriculum database</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={discardChanges}
                      disabled={saving}
                      className="rounded-xl border border-amber-200 dark:border-amber-800 bg-white dark:bg-amber-950/20 px-6 py-3 text-xs font-bold uppercase tracking-widest text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-all"
                    >
                      Discard Draft
                    </button>
                    <button
                      onClick={saveChanges}
                      disabled={saving}
                      className="rounded-xl bg-amber-600 px-8 py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-amber-700 transition-all shadow-md active:scale-95 disabled:opacity-50"
                    >
                      {saving ? "Persisting..." : "Commit Update"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-8 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm font-bold text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-200 flex items-center gap-3">
              <span className="material-icons-outlined">error_outline</span>
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* LEFT */}
            <div className="lg:col-span-2 space-y-8">
              {/* Hero */}
              <div className="bg-white dark:bg-slate-900 rounded-[32px] p-8 lg:p-12 border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 transform group-hover:scale-110 transition-transform duration-1000 -translate-y-12 translate-x-12">
                  <span className="material-icons-outlined text-9xl">library_books</span>
                </div>

                <div className="relative z-10">
                  <div className="flex flex-wrap items-center gap-3 mb-6">
                    <span className="bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-teal-100 dark:border-teal-800/50 shadow-sm">
                      {course.type || "Course Target"}
                    </span>
                    <span className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-slate-200 dark:border-slate-700 shadow-sm font-mono">
                      {course.course_code}
                    </span>
                    {course.department && (
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-2">
                        {course.department}
                      </span>
                    )}
                  </div>

                  <h1 className="text-4xl lg:text-5xl font-black text-slate-900 dark:text-white mb-6 tracking-tight leading-tight">
                    {course.title || "Untitled Sequence"}
                  </h1>

                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                    {course.description?.trim()
                      ? course.description
                      : "Overview analysis documentation pending instantiation."}
                  </p>
                </div>
              </div>

              {/* Weekly Syllabus */}
              <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="border-b border-slate-100 dark:border-slate-800 px-8 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-50/50 dark:bg-slate-950/50">
                  <div>
                    <h3 className="font-extrabold text-2xl text-slate-900 dark:text-white tracking-tight">
                      Curriculum Timeline
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                      Drag or reorder nodes to adjust instructional pacing
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="relative w-full sm:w-64 group">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-4">
                        <span className="material-icons-outlined text-slate-400 group-focus-within:text-teal-500 transition-colors">
                          search
                        </span>
                      </span>
                      <input
                        value={syllabusSearch}
                        onChange={(e) => setSyllabusSearch(e.target.value)}
                        placeholder="Search interval or node..."
                        className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-sm font-bold focus:border-teal-500/50 focus:outline-none focus:ring-4 focus:ring-teal-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white transition-all shadow-sm placeholder:text-slate-300"
                      />
                    </div>

                    <button
                      onClick={openAddModal}
                      className="hidden sm:inline-flex items-center gap-2 rounded-2xl bg-slate-900 dark:bg-slate-800 px-5 py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-slate-800 dark:hover:bg-slate-700 transition-all shadow-sm active:scale-95"
                    >
                      <span className="material-icons-outlined text-base">add</span>
                      Add
                    </button>
                  </div>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredSyllabus.length ? (
                    filteredSyllabus.map((item) => (
                      <div
                        key={item.week}
                        className="px-8 py-5 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all group"
                      >
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="h-10 w-12 rounded-xl bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 flex items-center justify-center font-black text-sm shrink-0 border border-teal-100 dark:border-teal-800/50">
                            W{item.week}
                          </div>

                          <div className="min-w-0">
                            <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                              {item.topic}
                            </div>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">
                              Week {item.week}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 justify-end opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => moveItem(item.week, "up")}
                            className="h-9 w-9 rounded-xl border border-slate-200 bg-white hover:border-teal-500/50 hover:text-teal-600 focus:ring-4 focus:ring-teal-500/10 dark:border-slate-800 dark:bg-slate-950 flex items-center justify-center text-slate-400 transition-all active:scale-95 shadow-sm"
                            title="Shift Node Up"
                          >
                            <span className="material-icons-outlined text-base">arrow_upward</span>
                          </button>

                          <button
                            onClick={() => moveItem(item.week, "down")}
                            className="h-9 w-9 rounded-xl border border-slate-200 bg-white hover:border-teal-500/50 hover:text-teal-600 focus:ring-4 focus:ring-teal-500/10 dark:border-slate-800 dark:bg-slate-950 flex items-center justify-center text-slate-400 transition-all active:scale-95 shadow-sm"
                            title="Shift Node Down"
                          >
                            <span className="material-icons-outlined text-base">arrow_downward</span>
                          </button>

                          <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-1"></div>

                          <button
                            onClick={() => openEditModal(item)}
                            className="h-9 w-9 rounded-xl border border-slate-200 bg-white hover:border-indigo-500/50 hover:text-indigo-600 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-950 flex items-center justify-center text-slate-400 transition-all active:scale-95 shadow-sm"
                            title="Edit Node"
                          >
                            <span className="material-icons-outlined text-base">edit</span>
                          </button>

                          <button
                            onClick={() => removeItem(item.week)}
                            className="h-9 w-9 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 hover:text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:hover:bg-rose-900/40 text-rose-500 flex items-center justify-center transition-all active:scale-95 shadow-sm"
                            title="Purge Node"
                          >
                            <span className="material-icons-outlined text-base">delete_outline</span>
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="px-8 py-12">
                      <div className="rounded-[32px] border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center animate-in fade-in zoom-in-95">
                        <div className="mx-auto h-20 w-20 rounded-[20px] bg-slate-50 dark:bg-slate-950 text-slate-300 dark:text-slate-700 flex items-center justify-center border border-slate-100 dark:border-slate-800 shadow-sm">
                          <span className="material-icons-outlined text-4xl">playlist_add</span>
                        </div>
                        <h4 className="mt-6 text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                          Curriculum Uninitialized
                        </h4>
                        <p className="mt-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                          Add weekly topics so students know what's coming
                        </p>
                        <button
                          onClick={openAddModal}
                          className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-3.5 text-xs font-bold uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm active:scale-95"
                        >
                          <span className="material-icons-outlined text-lg">add</span>
                          Add frist syllabbus item
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT */}
            <div className="space-y-8">
              <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 p-8 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5 scale-150 translate-x-8 -translate-y-8">
                  <span className="material-icons-outlined text-8xl">data_object</span>
                </div>
                <h3 className="font-extrabold text-xl text-slate-900 dark:text-white mb-6 tracking-tight relative z-10">
                  Course Information
                </h3>

                <div className="space-y-6 relative z-10">
                  <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800">
                    <span className="material-icons-outlined text-slate-400 mt-0.5">person</span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {course.instructor || "Undefined"}
                      </p>
                      {course.instructor_email ? (
                        <a
                          href={`mailto:${course.instructor_email}`}
                          className="text-[10px] font-bold uppercase tracking-widest text-teal-600 dark:text-teal-400 hover:underline break-all"
                        >
                          {course.instructor_email}
                        </a>
                      ) : (
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">Pending allocation</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800">
                    <span className="material-icons-outlined text-slate-400 mt-0.5">schedule</span>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">Execution Schedule</p>
                      {schedule.length ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {schedule.map((s, i) => (
                            <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px] font-black tracking-widest uppercase text-slate-600 dark:text-slate-300 shadow-sm">
                              <span className="opacity-50">•</span> {s}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">TBD</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-start gap-3 p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800">
                      <span className="material-icons-outlined text-slate-400 mt-0.5">location_on</span>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">Vector Room</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">{course.room || "TBD"}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800">
                      <span className="material-icons-outlined text-slate-400 mt-0.5">stars</span>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">Credits</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">
                          {Number(course.credits ?? 0)}Credit Hours
                        </p>
                      </div>
                    </div>
                  </div>

                  {course.department && (
                    <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800">
                      <span className="material-icons-outlined text-slate-400 mt-0.5">apartment</span>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">Department</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">{course.department}</p>
                      </div>
                    </div>
                  )}

                  {course.major && (
                    <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800">
                      <span className="material-icons-outlined text-slate-400 mt-0.5">badge</span>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">Major</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">{course.major}</p>
                      </div>
                    </div>
                  )}

                  {course.track && (
                    <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800">
                      <span className="material-icons-outlined text-slate-400 mt-0.5">timeline</span>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">Track</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">{course.track}</p>
                      </div>
                    </div>
                  )}

                </div>

                <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800 relative z-10">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
                    System Prerequisites
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {Array.isArray(course.prerequisites) && course.prerequisites.length ? (
                      course.prerequisites.map((req, i) => (
                        <span
                          key={i}
                          className="px-3 py-1.5 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-indigo-100 dark:border-indigo-800/50 shadow-sm"
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
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="w-full max-w-lg rounded-[32px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
                <div>
                  <h3 className="font-extrabold text-2xl text-slate-900 dark:text-white tracking-tight">
                    {modalMode === "add" ? "Add Syllabus Item" : "Edit Syllabus Item"}
                  </h3>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">
                    Week is selected from a list (no free typing).
                  </p>
                </div>

                <button
                  onClick={closeModal}
                  className="h-10 w-10 rounded-full flex items-center justify-center text-slate-400 hover:bg-white dark:hover:bg-slate-800 transition-all active:scale-95 shadow-sm"
                >
                  <span className="material-icons-outlined">close</span>
                </button>
              </div>

              <div className="p-8 space-y-6">
                {/* Week dropdown */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">
                    Week Interval
                  </label>

                  <div className="flex items-center gap-3">
                    <select
                      value={weekSelect}
                      onChange={(e) => setWeekSelect(Number(e.target.value))}
                      className="flex-1 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3.5 text-sm font-bold text-slate-700 dark:text-white focus:border-teal-500/50 focus:outline-none focus:ring-4 focus:ring-teal-500/10 cursor-pointer shadow-sm transition-all"
                    >
                      {weekOptions.map((w) => {
                        const disabled =
                          modalMode === "add" ? usedWeeks.has(w) : editingWeek !== w && usedWeeks.has(w);

                        return (
                          <option key={w} value={w} disabled={disabled}>
                            Week {w} {disabled ? "• Allocated" : ""}
                          </option>
                        );
                      })}
                    </select>

                    <button
                      onClick={() => setWeekSelect(nextAvailableWeek)}
                      className="shrink-0 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-6 py-3.5 text-xs font-bold uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shadow-sm active:scale-95"
                      title="Jump to next available interval"
                    >
                      Next
                    </button>
                  </div>

                  <p className="text-[10px] font-bold text-slate-400 mt-1 ml-1">
                    Tip: Use "Next" to jump to the first unused week.
                  </p>
                </div>

                {/* Topic */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">
                    Topic
                  </label>
                  <input
                    value={topicInput}
                    onChange={(e) => setTopicInput(e.target.value)}
                    placeholder="Define the primary instructional objective..."
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-5 py-4 text-sm font-medium text-slate-900 dark:text-white focus:border-teal-500/50 focus:outline-none focus:ring-4 focus:ring-teal-500/10 shadow-sm transition-all placeholder:text-slate-300"
                  />
                  <p className="mt-1 text-[11px] text-gray-400">
                    Keep it clear and student-friendly.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 px-8 py-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 rounded-b-[32px]">
                <button
                  onClick={closeModal}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 px-6 py-3 text-xs font-bold uppercase tracking-widest text-slate-500 hover:bg-white dark:hover:bg-slate-900 transition-all shadow-sm active:scale-95"
                >
                  Cancel
                </button>

                <button
                  onClick={commitModal}
                  className="rounded-xl bg-teal-600 px-8 py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-teal-700 transition-all shadow-md active:scale-95"
                >
                  {modalMode === "add" ? "Add Syllabus Item" : "Save Alterations"}
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
    