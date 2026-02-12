import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { User } from "../types";
import { api } from "../lib/api";

interface CoursesProps {
  user: User;
  onLogout: () => void;
}

type CourseRow = {
  id: string;
  course_code: string;
  title: string;
  department: string;
  credits: number;
  type: string;
  instructor?: string;
  schedule: string[];
  room?: string;
  description?: string;
  prerequisites: string[];
  semester: string[];
};

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

/**
 * ✅ Semester dropdown options (edit as you like)
 */
const SEMESTER_OPTIONS: { label: string; value: string }[] = [
  // NEW system (up to 4 years)
  { label: "New • 1st Year • First Sem", value: "New • 1st Year • First Sem" },
  { label: "New • 1st Year • Second Sem", value: "New • 1st Year • Second Sem" },
  { label: "New • 2nd Year • First Sem", value: "New • 2nd Year • First Sem" },
  { label: "New • 2nd Year • Second Sem", value: "New • 2nd Year • Second Sem" },
  { label: "New • 3rd Year • First Sem", value: "New • 3rd Year • First Sem" },
  { label: "New • 3rd Year • Second Sem", value: "New • 3rd Year • Second Sem" },
  { label: "New • 4th Year • First Sem", value: "New • 4th Year • First Sem" },
  { label: "New • 4th Year • Second Sem", value: "New • 4th Year • Second Sem" },

  // OLD system (up to 5 years)
  { label: "Old • 1st Year • First Sem", value: "Old • 1st Year • First Sem" },
  { label: "Old • 1st Year • Second Sem", value: "Old • 1st Year • Second Sem" },
  { label: "Old • 2nd Year • First Sem", value: "Old • 2nd Year • First Sem" },
  { label: "Old • 2nd Year • Second Sem", value: "Old • 2nd Year • Second Sem" },
  { label: "Old • 3rd Year • First Sem", value: "Old • 3rd Year • First Sem" },
  { label: "Old • 3rd Year • Second Sem", value: "Old • 3rd Year • Second Sem" },
  { label: "Old • 4th Year • First Sem", value: "Old • 4th Year • First Sem" },
  { label: "Old • 4th Year • Second Sem", value: "Old • 4th Year • Second Sem" },
  { label: "Old • 5th Year • First Sem", value: "Old • 5th Year • First Sem" },
  { label: "Old • 5th Year • Second Sem", value: "Old • 5th Year • Second Sem" },
];

// -----------------------------
// Toast system
// -----------------------------
type ToastType = "success" | "error" | "info";
type Toast = { id: string; type: ToastType; title: string; message?: string };

function ToastHost({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  return (
    <div className="fixed z-[9999] right-4 bottom-4 space-y-3 w-[360px] max-w-[92vw]">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="rounded-xl border shadow-lg p-4 bg-white dark:bg-surface-dark dark:border-gray-700 animate-[toastIn_.18s_ease-out]"
        >
          <div className="flex items-start gap-3">
            <div
              className={[
                "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
                t.type === "success"
                  ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300"
                  : t.type === "error"
                  ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300"
                  : "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300",
              ].join(" ")}
            >
              <span className="material-icons-outlined">
                {t.type === "success" ? "check_circle" : t.type === "error" ? "error" : "info"}
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-gray-900 dark:text-white">{t.title}</div>
              {t.message ? <div className="mt-1 text-xs text-gray-600 dark:text-gray-300 break-words">{t.message}</div> : null}
            </div>

            <button onClick={() => onDismiss(t.id)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" title="Dismiss">
              <span className="material-icons-outlined text-base">close</span>
            </button>
          </div>
        </div>
      ))}

      <style>{`
        @keyframes toastIn {
          from { transform: translateY(8px); opacity: 0; }
          to { transform: translateY(0px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// -----------------------------
// Confirm modal
// -----------------------------
function ConfirmModal({
  open,
  title,
  message,
  confirmText = "Confirm",
  danger = false,
  onCancel,
  onConfirm,
  loading,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  danger?: boolean;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden">
        <div className="p-5 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div
              className={[
                "h-10 w-10 rounded-xl flex items-center justify-center",
                danger ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300" : "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300",
              ].join(" ")}
            >
              <span className="material-icons-outlined">{danger ? "delete_forever" : "help"}</span>
            </div>
            <div className="min-w-0">
              <div className="font-bold text-gray-900 dark:text-white">{title}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{message}</div>
            </div>
          </div>
        </div>

        <div className="p-5 flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={!!loading}
            className="rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!!loading}
            className={["rounded-xl px-4 py-2 text-sm font-medium text-white", danger ? "bg-red-600 hover:bg-red-700" : "bg-primary hover:bg-primary-hover"].join(" ")}
          >
            {loading ? "Working..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

// -----------------------------
// Multi-select dropdown + selected chips
// -----------------------------
function MultiSelectChips({
  label,
  options,
  selected,
  onChange,
  placeholder = "Select...",
  helper,
}: {
  label: string;
  options: { label: string; value: string }[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  helper?: string;
}) {
  const add = (val: string) => {
    if (!val) return;
    if (selected.includes(val)) return;
    onChange([...selected, val]);
  };

  const remove = (val: string) => {
    onChange(selected.filter((x) => x !== val));
  };

  return (
    <div>
      <label className="text-xs font-bold text-gray-500 dark:text-gray-400">{label}</label>

      <div className="mt-2 flex flex-col sm:flex-row gap-3">
        <select
          className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 text-gray-700 dark:text-gray-200"
          value=""
          onChange={(e) => add(e.target.value)}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        {helper ? <div className="sm:self-center text-[11px] text-gray-400">{helper}</div> : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {selected.length ? (
          selected.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1 rounded-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-700 px-3 py-1 text-xs text-gray-700 dark:text-gray-200"
            >
              <span className="material-icons-outlined text-[16px] text-gray-400">check</span>
              {s}
              <button onClick={() => remove(s)} className="ml-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" type="button">
                <span className="material-icons-outlined text-[16px]">close</span>
              </button>
            </span>
          ))
        ) : (
          <div className="text-xs text-gray-500 dark:text-gray-400">None selected.</div>
        )}
      </div>
    </div>
  );
}

// -----------------------------
// NEW: Free-type tag input for schedule
// -----------------------------
function TagInput({
  label,
  values,
  onChange,
  placeholder,
  helper,
}: {
  label: string;
  values: string[];
  onChange: (vals: string[]) => void;
  placeholder?: string;
  helper?: string;
}) {
  const [text, setText] = useState("");

  const add = (raw: string) => {
    const v = (raw ?? "").trim();
    if (!v) return;
    if (values.includes(v)) return;
    onChange([...values, v]);
    setText("");
  };

  const remove = (v: string) => onChange(values.filter((x) => x !== v));

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      add(text);
    }
    if (e.key === "Backspace" && !text && values.length) {
      // quick remove last
      onChange(values.slice(0, -1));
    }
  };

  return (
    <div>
      <label className="text-xs font-bold text-gray-500 dark:text-gray-400">{label}</label>

      <div className="mt-2 flex gap-2">
        <input
          className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 text-gray-700 dark:text-gray-200"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => add(text)}
          className="rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary-hover"
        >
          Add
        </button>
      </div>

      {helper ? <div className="mt-2 text-[11px] text-gray-400">{helper}</div> : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {values.length ? (
          values.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1 rounded-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-700 px-3 py-1 text-xs text-gray-700 dark:text-gray-200"
            >
              <span className="material-icons-outlined text-[16px] text-gray-400">schedule</span>
              {s}
              <button onClick={() => remove(s)} className="ml-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" type="button">
                <span className="material-icons-outlined text-[16px]">close</span>
              </button>
            </span>
          ))
        ) : (
          <div className="text-xs text-gray-500 dark:text-gray-400">No schedule added.</div>
        )}
      </div>
    </div>
  );
}

// -----------------------------
// Helpers
// -----------------------------
function normalizeSemester(raw: any): string[] {
  if (!raw) return [];
  if (typeof raw === "string") return raw.trim() ? [raw.trim()] : [];
  if (Array.isArray(raw)) {
    const out: string[] = [];
    for (const item of raw) {
      if (!item) continue;
      if (typeof item === "string") {
        const s = item.trim();
        if (s) out.push(s);
      } else if (typeof item === "object") {
        const s = String(item.semester ?? "").trim();
        if (s) out.push(s);
      } else {
        const s = String(item).trim();
        if (s) out.push(s);
      }
    }
    return out;
  }
  return [];
}

function normalizeSchedule(raw: any): string[] {
  if (!raw) return [];
  if (typeof raw === "string") return raw.trim() ? [raw.trim()] : [];
  if (Array.isArray(raw)) return raw.map((x) => String(x).trim()).filter(Boolean);
  return [];
}

function uniqSorted(xs: string[]) {
  return Array.from(new Set(xs)).sort((a, b) => a.localeCompare(b));
}

function safeStr(v: any, fallback = "—") {
  const s = String(v ?? "").trim();
  return s ? s : fallback;
}

function currencyId() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

// -----------------------------
// Wizard Modal (Add/Edit)
// -----------------------------
type WizardMode = "create" | "edit";

type CourseDraft = {
  course_code: string;
  title: string;
  department: string;
  credits: string;
  type: string;
  instructor: string;
  room: string;
  description: string;
  prerequisites: string[];
  schedule: string[]; // ✅ now free-type tags
  semester: string[]; // ✅ dropdown multi-select
};

const CourseWizardModal = React.memo(function CourseWizardModal({
  open,
  mode,
  initial,
  busy,
  onClose,
  onSubmit,
  prerequisiteOptions,
}: {
  open: boolean;
  mode: WizardMode;
  initial: CourseDraft;
  busy: boolean;
  onClose: () => void;
  onSubmit: (payload: any) => Promise<void>;
  prerequisiteOptions: { label: string; value: string }[];
}) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<CourseDraft>(initial);

  const titleRef = useRef<HTMLInputElement | null>(null);
  const codeRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setDraft(initial);

    setTimeout(() => {
      if (mode === "create") codeRef.current?.focus();
      else titleRef.current?.focus();
    }, 60);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const isCreate = mode === "create";
  const steps = ["Basics", "Schedule & Semester", "Prerequisites", "Review"];

  const setField = (k: keyof CourseDraft, v: any) => setDraft((p) => ({ ...p, [k]: v }));

  const canNextStep0 =
    (!isCreate || draft.course_code.trim()) &&
    draft.title.trim() &&
    draft.department.trim() &&
    draft.credits.trim() &&
    Number.isFinite(Number(draft.credits)) &&
    Number(draft.credits) > 0;

  const headerTitle = isCreate ? "Add New Course" : `Edit Course (${draft.course_code})`;

  const submit = async () => {
    const creditsNum = Number(draft.credits);

    const payload: any = {
      title: draft.title.trim(),
      department: draft.department.trim(),
      credits: creditsNum,
      type: draft.type,
      instructor: draft.instructor.trim() ? draft.instructor.trim() : null,
      room: draft.room.trim() ? draft.room.trim() : null,
      description: draft.description.trim() ? draft.description.trim() : null,
      prerequisites: draft.prerequisites ?? [],
      schedule: draft.schedule ?? [], // ✅ free type array
      semester: (draft.semester ?? []).map((s) => ({ semester: s })),
    };

    if (isCreate) payload.course_code = draft.course_code.trim();

    await onSubmit(payload);
  };

  const pill = (active: boolean) =>
    active ? "bg-primary text-white" : "bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-300";

  return (
    <div className="fixed inset-0 z-[9997] flex items-center justify-center bg-black/55 p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-lg font-extrabold text-gray-900 dark:text-white">{headerTitle}</div>
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">Semester + Prereqs are selected. Schedule is free-type tags.</div>

            <div className="mt-4 flex flex-wrap gap-2">
              {steps.map((s, idx) => (
                <span key={s} className={["px-3 py-1 rounded-full text-xs font-semibold", pill(idx === step)].join(" ")}>
                  {idx + 1}. {s}
                </span>
              ))}
            </div>
          </div>

          <button onClick={onClose} disabled={busy} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" title="Close">
            <span className="material-icons-outlined">close</span>
          </button>
        </div>

        <div className="p-6">
          {/* Step 0 */}
          {step === 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {isCreate && (
                <div>
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400">Course Code</label>
                  <input
                    ref={codeRef}
                    className="mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    value={draft.course_code}
                    onChange={(e) => setField("course_code", e.target.value)}
                    placeholder="e.g. CST-1010"
                  />
                  <p className="mt-1 text-[11px] text-gray-400">Used as unique ID. Cannot change later.</p>
                </div>
              )}

              <div className={isCreate ? "" : "md:col-span-2"}>
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400">Title</label>
                <input
                  ref={titleRef}
                  className="mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  value={draft.title}
                  onChange={(e) => setField("title", e.target.value)}
                  placeholder="Course name"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400">Department</label>
                <input
                  className="mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  value={draft.department}
                  onChange={(e) => setField("department", e.target.value)}
                  placeholder="e.g. Computer Science"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400">Credits</label>
                <input
                  className="mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  value={draft.credits}
                  onChange={(e) => setField("credits", e.target.value)}
                  placeholder="e.g. 3"
                  inputMode="decimal"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400">Type</label>
                <select
                  className="mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  value={draft.type}
                  onChange={(e) => setField("type", e.target.value)}
                >
                  <option value="Core">Core</option>
                  <option value="Elective">Elective</option>
                  <option value="Prerequisite">Prerequisite</option>
                  <option value="Major">Major</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400">Instructor</label>
                <input
                  className="mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  value={draft.instructor}
                  onChange={(e) => setField("instructor", e.target.value)}
                  placeholder="Optional"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400">Room</label>
                <input
                  className="mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  value={draft.room}
                  onChange={(e) => setField("room", e.target.value)}
                  placeholder="Optional"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400">Description</label>
                <textarea
                  className="mt-1 w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  rows={4}
                  value={draft.description}
                  onChange={(e) => setField("description", e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>
          )}

          {/* Step 1 */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-slate-800/40 p-4">
                <MultiSelectChips
                  label="Semester (multi-select)"
                  options={SEMESTER_OPTIONS}
                  selected={draft.semester}
                  onChange={(vals) => setField("semester", vals)}
                  placeholder="Choose a semester…"
                  helper="You can add multiple semesters."
                />
              </div>

              <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-slate-800/40 p-4">
                <TagInput
                  label="Schedule (free type, press Enter to add)"
                  values={draft.schedule}
                  onChange={(vals) => setField("schedule", vals)}
                  placeholder='e.g. "Mon/Wed 10:00-11:30"'
                  helper="Tip: Enter adds a chip. Backspace deletes last chip when input is empty."
                />
              </div>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-slate-800/40 p-4">
                <MultiSelectChips
                  label="Prerequisites (choose from existing courses)"
                  options={prerequisiteOptions}
                  selected={draft.prerequisites}
                  onChange={(vals) => setField("prerequisites", vals)}
                  placeholder="Select prerequisite course…"
                  helper="Shows Course Code + Title (stores only course code)."
                />
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-slate-800/40 p-5">
                <div className="text-xl font-extrabold text-gray-900 dark:text-white">{draft.title || "—"}</div>
                <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  <span className="font-mono">{draft.course_code || "—"}</span> • {draft.department || "—"} • {draft.type || "—"} •{" "}
                  {Number(draft.credits || 0).toFixed(1)} credits
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-700 p-4">
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-bold">Semester</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {draft.semester.length ? (
                        draft.semester.map((s) => (
                          <span key={s} className="rounded-full bg-gray-100 dark:bg-slate-800 px-3 py-1 text-xs text-gray-700 dark:text-gray-200">
                            {s}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-500 dark:text-gray-400">—</span>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-700 p-4">
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-bold">Schedule</div>
                    <div className="mt-2 space-y-1">
                      {draft.schedule.length ? (
                        draft.schedule.map((s, i) => (
                          <div key={i} className="text-sm text-gray-800 dark:text-gray-200">
                            • {s}
                          </div>
                        ))
                      ) : (
                        <span className="text-xs text-gray-500 dark:text-gray-400">—</span>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-700 p-4 md:col-span-2">
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-bold">Prerequisites</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {draft.prerequisites.length ? (
                        draft.prerequisites.map((p) => (
                          <span key={p} className="rounded-full bg-gray-100 dark:bg-slate-800 px-3 py-1 text-xs text-gray-700 dark:text-gray-200">
                            {p}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-500 dark:text-gray-400">None</span>
                      )}
                    </div>
                  </div>
                </div>

                {draft.description.trim() ? (
                  <div className="mt-4 text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap">{draft.description.trim()}</div>
                ) : (
                  <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">No description.</div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            disabled={busy}
            className="rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={busy || step === 0}
              className="rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50"
            >
              Back
            </button>

            {step < 3 ? (
              <button
                onClick={() => setStep((s) => Math.min(3, s + 1))}
                disabled={busy || (step === 0 && !canNextStep0)}
                className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
              >
                Next
              </button>
            ) : (
              <button
                onClick={submit}
                disabled={busy}
                className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
              >
                {busy ? "Saving..." : "Save"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

// -----------------------------
// Skeleton cards
// -----------------------------
function CourseCardSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-surface-dark p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="h-4 w-28 bg-gray-200 dark:bg-slate-700 rounded mb-3" />
          <div className="h-6 w-2/3 bg-gray-200 dark:bg-slate-700 rounded mb-2" />
          <div className="h-4 w-1/2 bg-gray-200 dark:bg-slate-700 rounded" />
          <div className="mt-4 flex flex-wrap gap-2">
            <div className="h-6 w-20 bg-gray-200 dark:bg-slate-700 rounded-full" />
            <div className="h-6 w-28 bg-gray-200 dark:bg-slate-700 rounded-full" />
            <div className="h-6 w-24 bg-gray-200 dark:bg-slate-700 rounded-full" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-9 bg-gray-200 dark:bg-slate-700 rounded-xl" />
          <div className="h-9 w-9 bg-gray-200 dark:bg-slate-700 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

// -----------------------------
// Main component
// -----------------------------
const AdminCourses: React.FC<CoursesProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();

  const [rawCourses, setRawCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);

  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [semesterFilter, setSemesterFilter] = useState<string>("");

  const [toasts, setToasts] = useState<Toast[]>([]);
  const toast = (type: ToastType, title: string, message?: string) => {
    const id = currencyId();
    setToasts((p) => [...p, { id, type, title, message }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3200);
  };

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmCourseCode, setConfirmCourseCode] = useState<string | null>(null);

  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardMode, setWizardMode] = useState<"create" | "edit">("create");
  const [wizardInitial, setWizardInitial] = useState<CourseDraft>({
    course_code: "",
    title: "",
    department: "",
    credits: "",
    type: "Elective",
    instructor: "",
    room: "",
    description: "",
    prerequisites: [],
    schedule: [],
    semester: [],
  });

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const data = await api.adminCourses();
      setRawCourses(Array.isArray(data) ? data : []);
    } catch (e: any) {
      toast("error", "Failed to load courses", e?.message || "Unknown error");
      setRawCourses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const courses: CourseRow[] = useMemo(() => {
    return (rawCourses || []).map((c) => {
      const courseCode = String(c.course_code ?? "");
      return {
        id: String(c._id ?? courseCode),
        course_code: courseCode,
        title: safeStr(c.title),
        department: safeStr(c.department),
        credits: Number(c.credits ?? 0) || 0,
        type: safeStr(c.type, "Elective"),
        instructor: c.instructor ? String(c.instructor) : "",
        schedule: normalizeSchedule(c.schedule),
        room: c.room ? String(c.room) : "",
        description: c.description ? String(c.description) : "",
        prerequisites: Array.isArray(c.prerequisites) ? c.prerequisites.map((x: any) => String(x)) : [],
        semester: normalizeSemester(c.semester),
      };
    });
  }, [rawCourses]);

  const prerequisiteOptions = useMemo(() => {
    return uniqSorted(courses.map((c) => `${c.course_code} — ${c.title}`)).map((label) => {
      const code = label.split(" — ")[0];
      return { label, value: code };
    });
  }, [courses]);

  const departments = useMemo(() => uniqSorted(courses.map((c) => c.department).filter((d) => d && d !== "—")), [courses]);
  const types = useMemo(() => uniqSorted(courses.map((c) => String(c.type)).filter(Boolean)), [courses]);

  const semesterOptions = useMemo(() => {
    const all = courses.flatMap((c) => c.semester || []);
    return uniqSorted(all);
  }, [courses]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return courses.filter((c) => {
      const matchesSearch =
        !q || c.course_code.toLowerCase().includes(q) || c.title.toLowerCase().includes(q) || (c.instructor ?? "").toLowerCase().includes(q);
      const matchesDept = !deptFilter || c.department === deptFilter;
      const matchesType = !typeFilter || String(c.type) === typeFilter;
      const matchesSemester = !semesterFilter || (c.semester || []).includes(semesterFilter);
      return matchesSearch && matchesDept && matchesType && matchesSemester;
    });
  }, [courses, search, deptFilter, typeFilter, semesterFilter]);

  const openCreate = () => {
    setWizardMode("create");
    setWizardInitial({
      course_code: "",
      title: "",
      department: "",
      credits: "",
      type: "Elective",
      instructor: "",
      room: "",
      description: "",
      prerequisites: [],
      schedule: [],
      semester: [],
    });
    setWizardOpen(true);
  };

  const openEdit = (course: CourseRow) => {
    setWizardMode("edit");
    setWizardInitial({
      course_code: course.course_code,
      title: course.title ?? "",
      department: course.department ?? "",
      credits: String(course.credits ?? ""),
      type: course.type ?? "Elective",
      instructor: course.instructor ?? "",
      room: course.room ?? "",
      description: course.description ?? "",
      prerequisites: Array.isArray(course.prerequisites) ? course.prerequisites : [],
      schedule: Array.isArray(course.schedule) ? course.schedule : [],
      semester: Array.isArray(course.semester) ? course.semester : [],
    });
    setWizardOpen(true);
  };

  const handleWizardSubmit = async (payload: any) => {
    try {
      setMutating(true);

      if (wizardMode === "create") {
        await api.adminCreateCourse(payload);
        toast("success", "Course created", payload.course_code);
      } else {
        const code = wizardInitial.course_code;
        await api.adminUpdateCourse(code, payload);
        toast("success", "Course updated", code);
      }

      setWizardOpen(false);
      await fetchCourses();
    } catch (e: any) {
      toast("error", "Save failed", e?.message || "Unknown error");
    } finally {
      setMutating(false);
    }
  };

  const askDelete = (courseCode: string) => {
    setConfirmCourseCode(courseCode);
    setConfirmOpen(true);
  };

  const doDelete = async () => {
    if (!confirmCourseCode) return;
    try {
      setMutating(true);

      const res = await fetch(`${API_BASE}/api/v1/admin/courses/${encodeURIComponent(confirmCourseCode)}`, {
        method: "DELETE",
        credentials: "include",
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : null;

      if (!res.ok) {
        const msg = data?.detail || data?.message || `Request failed (${res.status})`;
        throw new Error(msg);
      }

      toast("success", "Course deleted", confirmCourseCode);
      setConfirmOpen(false);
      setConfirmCourseCode(null);
      await fetchCourses();
    } catch (e: any) {
      toast("error", "Delete failed", e?.message || "Unknown error");
    } finally {
      setMutating(false);
    }
  };

  const badge = (label: string) =>
    "inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-slate-800 px-3 py-1 text-xs font-semibold text-gray-700 dark:text-gray-200";

  const typeBadgeClass = (t: string) => {
    if (t === "Core") return "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300";
    if (t === "Prerequisite") return "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300";
    if (t === "Major") return "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300";
    return "bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300";
  };

  const goDetails = (code: string) => navigate(`/admin/courses/${encodeURIComponent(code)}`);

  return (
    <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark">
      <Sidebar user={user} onLogout={onLogout} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title="Courses Management" user={user} />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-6 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-surface-dark shadow-sm overflow-hidden">
            <div className="p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="min-w-0">
                <div className="text-lg font-extrabold text-gray-900 dark:text-white">Manage Courses</div>
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">Semester + prereqs are selected. Schedule is free typed.</div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span className={badge(`Total: ${courses.length}`)}>
                    <span className="material-icons-outlined text-[16px] text-gray-400">database</span>
                    Total: {courses.length}
                  </span>
                  <span className={badge(`Shown: ${filtered.length}`)}>
                    <span className="material-icons-outlined text-[16px] text-gray-400">filter_alt</span>
                    Shown: {filtered.length}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  className="flex items-center justify-center gap-2 rounded-xl border border-primary bg-white px-4 py-2.5 text-sm font-semibold text-primary hover:bg-gray-50 dark:bg-transparent dark:hover:bg-slate-800 transition-colors"
                  onClick={() => toast("info", "Excel import", "We can implement this next.")}
                  disabled={mutating}
                >
                  <span className="material-icons-outlined text-lg">description</span>
                  Import (Excel)
                </button>

                <button
                  className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover shadow-sm transition-colors"
                  onClick={openCreate}
                  disabled={mutating}
                >
                  <span className="material-icons-outlined text-lg">add</span>
                  Add Course
                </button>
              </div>
            </div>

            <div className="border-t border-gray-100 dark:border-gray-700 p-4">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                <div className="lg:col-span-4">
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                      <span className="material-icons-outlined text-gray-400">search</span>
                    </span>
                    <input
                      className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 dark:text-gray-200"
                      placeholder="Search by code, title, instructor..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                </div>

                <div className="lg:col-span-3">
                  <select
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 py-2.5 px-3 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/40"
                    value={deptFilter}
                    onChange={(e) => setDeptFilter(e.target.value)}
                  >
                    <option value="">All Departments</option>
                    {departments.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="lg:col-span-2">
                  <select
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 py-2.5 px-3 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/40"
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                  >
                    <option value="">All Types</option>
                    {types.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="lg:col-span-3">
                  <select
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 py-2.5 px-3 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/40"
                    value={semesterFilter}
                    onChange={(e) => setSemesterFilter(e.target.value)}
                  >
                    <option value="">All Semesters</option>
                    {semesterOptions.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <CourseCardSkeleton key={i} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-surface-dark p-10 text-center">
              <div className="mx-auto h-14 w-14 rounded-2xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-gray-600 dark:text-gray-200">
                <span className="material-icons-outlined text-3xl">menu_book</span>
              </div>
              <div className="mt-4 text-lg font-extrabold text-gray-900 dark:text-white">No courses found</div>
              <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">Try adjusting filters or create a new course.</div>
              <div className="mt-6 flex justify-center gap-3">
                <button
                  onClick={() => {
                    setSearch("");
                    setDeptFilter("");
                    setTypeFilter("");
                    setSemesterFilter("");
                  }}
                  className="rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800"
                >
                  Reset Filters
                </button>
                <button onClick={openCreate} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover">
                  Add Course
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {filtered.map((course) => (
                <div
                  key={course.id}
                  className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-surface-dark p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => goDetails(course.course_code)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{course.course_code}</span>
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${typeBadgeClass(course.type)}`}>{course.type}</span>
                      </div>

                      <div className="mt-2 text-lg font-extrabold text-gray-900 dark:text-white truncate">{course.title}</div>

                      <div className="mt-1 text-sm text-gray-600 dark:text-gray-300 truncate">
                        {course.department}
                        {course.instructor ? ` • Instructor: ${course.instructor}` : ""}
                        {course.room ? ` • Room: ${course.room}` : ""}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className={badge(`${Number(course.credits).toFixed(1)} credits`)}>
                          <span className="material-icons-outlined text-[16px] text-gray-400">stars</span>
                          {Number(course.credits).toFixed(1)} credits
                        </span>

                        {course.semester?.slice(0, 2).map((s) => (
                          <span key={s} className={badge(s)}>
                            <span className="material-icons-outlined text-[16px] text-gray-400">school</span>
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(course);
                        }}
                        className="h-9 w-9 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-200 hover:text-primary hover:border-primary transition-colors"
                        title="Edit"
                        disabled={mutating}
                      >
                        <span className="material-icons-outlined text-lg">edit</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          askDelete(course.course_code);
                        }}
                        className="h-9 w-9 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-200 hover:text-red-500 hover:border-red-400 transition-colors"
                        title="Delete"
                        disabled={mutating}
                      >
                        <span className="material-icons-outlined text-lg">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={openCreate}
            className="fixed right-5 bottom-5 z-[50] rounded-2xl bg-primary text-white shadow-xl hover:bg-primary-hover transition-colors px-4 py-3 flex items-center gap-2"
            disabled={mutating}
            title="Add Course"
          >
            <span className="material-icons-outlined">add</span>
            <span className="text-sm font-bold">Add Course</span>
          </button>
        </main>
      </div>

      <CourseWizardModal
        open={wizardOpen}
        mode={wizardMode}
        initial={wizardInitial}
        busy={mutating}
        onClose={() => setWizardOpen(false)}
        onSubmit={handleWizardSubmit}
        prerequisiteOptions={prerequisiteOptions}
      />

      <ConfirmModal
        open={confirmOpen}
        title="Delete course?"
        message={confirmCourseCode ? `This will permanently delete "${confirmCourseCode}".` : "This cannot be undone."}
        confirmText="Delete"
        danger
        loading={mutating}
        onCancel={() => {
          setConfirmOpen(false);
          setConfirmCourseCode(null);
        }}
        onConfirm={doDelete}
      />

      <ToastHost toasts={toasts} onDismiss={(id) => setToasts((p) => p.filter((t) => t.id !== id))} />
    </div>
  );
};

export default AdminCourses;