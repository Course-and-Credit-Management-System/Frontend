import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { api, HttpStatusError } from "../lib/api";
import {
  EnrollmentSettingsFormDraft,
  EnrollmentSettingsFormErrors,
  parseEnrollmentDateMs,
  toDraftFromSetting,
  validateAndBuildEnrollmentPayload,
} from "../lib/enrollmentSettingsValidation";
import { EnrollmentSetting, EnrollmentStatusAction, User } from "../types";

interface AdminEnrollmentSettingsProps {
  user: User;
  onLogout: () => void;
}

type ToastState = {
  type: "success" | "error";
  message: string;
} | null;

const defaultDraft: EnrollmentSettingsFormDraft = {
  durationType: "days",
  durationValue: "30",
  maxCredits: "24",
  maxCourses: "6",
  allowWaitlist: false,
  isActive: true,
};

function formatDateTime(value?: string | null) {
  if (!value) return "N/A";
  const ms = parseEnrollmentDateMs(value);
  if (!Number.isFinite(ms)) return "N/A";
  const date = new Date(ms);
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatCountdown(msRemaining: number) {
  if (msRemaining <= 0) return "Expired";
  const totalSeconds = Math.floor(msRemaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  return `${hours}h ${minutes}m ${seconds}s`;
}

const AdminEnrollmentSettings: React.FC<AdminEnrollmentSettingsProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [setting, setSetting] = useState<EnrollmentSetting | null>(null);
  const [loadingCurrent, setLoadingCurrent] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [tick, setTick] = useState(Date.now());

  const [formDraft, setFormDraft] = useState<EnrollmentSettingsFormDraft>(defaultDraft);
  const [formErrors, setFormErrors] = useState<EnrollmentSettingsFormErrors>({});
  const [formApiError, setFormApiError] = useState<string | null>(null);
  const [submitAction, setSubmitAction] = useState<"post" | "put" | null>(null);

  const [statusLoading, setStatusLoading] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState<EnrollmentStatusAction | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    const timer = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const fetchCurrent = async () => {
    setLoadingCurrent(true);
    setFetchError(null);
    setNotFound(false);
    try {
      const current = await api.adminEnrollmentSettingCurrent();
      setSetting(current);
      const draft = toDraftFromSetting(current);
      setFormDraft(draft);
    } catch (error: any) {
      if (error instanceof HttpStatusError && error.status === 404) {
        setSetting(null);
        setNotFound(true);
      } else {
        setFetchError(error?.message || "Failed to load enrollment setting.");
      }
    } finally {
      setLoadingCurrent(false);
    }
  };

  useEffect(() => {
    fetchCurrent();
  }, []);

  const openRemaining = useMemo(() => {
    if (!setting?.is_active) return "Closed";
    const closeAt = parseEnrollmentDateMs(setting.enrollment_close_at);
    if (!Number.isFinite(closeAt)) return "N/A";
    const currentNow = Date.now();
    const remainingMs = closeAt - currentNow;
    return formatCountdown(remainingMs);
  }, [setting, tick]);

  const runSubmit = async (action: "post" | "put") => {
    setFormApiError(null);
    const result = validateAndBuildEnrollmentPayload(formDraft);
    setFormErrors(result.errors);
    if (!result.payload) return;

    setSubmitAction(action);
    try {
      if (action === "post") {
        await api.adminReplaceEnrollmentSetting(result.payload);
      } else {
        await api.adminUpsertEnrollmentSetting(result.payload);
      }
      setToast({
        type: "success",
        message: action === "post" ? "Enrollment setting renewed successfully." : "Enrollment setting updated successfully.",
      });
      await fetchCurrent();
    } catch (error: any) {
      setFormApiError(error?.message || "Failed to save setting.");
    } finally {
      setSubmitAction(null);
    }
  };

  const runStatusAction = async (status: EnrollmentStatusAction) => {
    setStatusLoading(true);
    setConfirmStatus(null);
    try {
      await api.adminSetEnrollmentSettingStatus({ status });
      setToast({
        type: "success",
        message: `Enrollment is now ${status === "open" ? "Open" : "Closed"}.`,
      });
      await fetchCurrent();
    } catch (error: any) {
      setToast({
        type: "error",
        message: error?.message || "Failed to change enrollment status.",
      });
    } finally {
      setStatusLoading(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f5f5] dark:bg-background-dark">
      <Sidebar user={user} onLogout={onLogout} />

      {toast ? (
        <div
          className={`fixed right-4 top-4 z-50 rounded-[6px] px-4 py-3 text-sm font-medium ${
            toast.type === "success"
              ? "bg-[#eafaf1] text-[#27ae60] dark:bg-green-900/25 dark:text-green-300"
              : "bg-[#fdecea] text-[#e74c3c] dark:bg-red-900/25 dark:text-red-300"
          }`}
        >
          {toast.message}
        </div>
      ) : null}

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title="Enrollment Settings" user={user} />
        <main className="flex-1 overflow-y-auto p-6 dark:bg-background-dark">
          <section className="mb-6">
            <button
              onClick={() => navigate("/admin/enrollment")}
              className="mb-3 rounded-[6px] border border-[#077d8a] bg-white px-4 py-2 text-sm font-medium text-[#077d8a] hover:bg-[#e0e0e0] dark:border-teal-500 dark:bg-slate-800 dark:text-teal-300 dark:hover:bg-slate-700"
            >
              Back
            </button>
            <h1 className="text-2xl font-semibold text-[#333333] dark:text-white">Enrollment Settings</h1>
            <p className="mt-1 text-base text-[#666666] dark:text-gray-300">Singleton config for enrollment control</p>
          </section>

          <section className="rounded-[8px] border border-[#cccccc] bg-white p-5 shadow-[0_2px_6px_rgba(0,0,0,0.1)] dark:border-gray-700 dark:bg-surface-dark">
            <h2 className="text-lg font-semibold text-[#333333] dark:text-white">Current Setting</h2>

            {loadingCurrent ? <p className="mt-4 text-sm text-[#666666] dark:text-gray-300">Loading current setting...</p> : null}
            {!loadingCurrent && fetchError ? (
              <div className="mt-4 rounded-[6px] bg-[#fdecea] px-3 py-2 text-sm text-[#e74c3c] dark:bg-red-900/25 dark:text-red-300">{fetchError}</div>
            ) : null}
            {!loadingCurrent && notFound ? (
              <div className="mt-4 rounded-[6px] bg-[#eafaf1] px-3 py-2 text-sm text-[#077d8a] dark:bg-teal-900/25 dark:text-teal-300">
                Enrollment setting not found. Use Replace/Create to create the singleton setting.
              </div>
            ) : null}

            {!loadingCurrent && setting ? (
              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="rounded-[6px] border border-[#cccccc] bg-[#f5f5f5] p-3 dark:border-gray-700 dark:bg-slate-800">
                  <p className="text-sm text-[#666666] dark:text-gray-300">Status</p>
                  <span
                    className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                      setting.is_active
                        ? "bg-[#eafaf1] text-[#27ae60] dark:bg-green-900/25 dark:text-green-300"
                        : "bg-[#fdecea] text-[#e74c3c] dark:bg-red-900/25 dark:text-red-300"
                    }`}
                  >
                    {setting.is_active ? "Open" : "Closed"}
                  </span>
                  <p className="mt-3 text-sm text-[#666666] dark:text-gray-300">Remaining Time</p>
                  <p className="text-sm font-semibold text-[#333333] dark:text-gray-100">{openRemaining}</p>
                </div>
                <div className="rounded-[6px] border border-[#cccccc] bg-[#f5f5f5] p-3 dark:border-gray-700 dark:bg-slate-800">
                  <p className="text-sm text-[#666666] dark:text-gray-300">Enrollment Open At</p>
                  <p className="text-sm font-semibold text-[#333333] dark:text-gray-100">{formatDateTime(setting.enrollment_open_at)}</p>
                  <p className="mt-3 text-sm text-[#666666] dark:text-gray-300">Enrollment Close At</p>
                  <p className="text-sm font-semibold text-[#333333] dark:text-gray-100">{formatDateTime(setting.enrollment_close_at)}</p>
                </div>
                <div className="rounded-[6px] border border-[#cccccc] bg-[#f5f5f5] p-3 dark:border-gray-700 dark:bg-slate-800">
                  <p className="text-sm text-[#666666] dark:text-gray-300">Max Credits</p>
                  <p className="text-sm font-semibold text-[#333333] dark:text-gray-100">{setting.max_credits}</p>
                  <p className="mt-2 text-sm text-[#666666] dark:text-gray-300">Max Courses</p>
                  <p className="text-sm font-semibold text-[#333333] dark:text-gray-100">{setting.max_courses ?? "N/A"}</p>
                  <p className="mt-2 text-sm text-[#666666] dark:text-gray-300">Allow Waitlist</p>
                  <p className="text-sm font-semibold text-[#333333] dark:text-gray-100">{setting.allow_waitlist ? "Yes" : "No"}</p>
                </div>
              </div>
            ) : null}
          </section>

          <section className="mt-6 rounded-[8px] border border-[#cccccc] bg-white p-5 shadow-[0_2px_6px_rgba(0,0,0,0.1)] dark:border-gray-700 dark:bg-surface-dark">
            <h3 className="text-lg font-semibold text-[#333333] dark:text-white">Enrollment Setting Form</h3>

            <form
              className="mt-4 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
              }}
            >
              <div>
                <label className="mb-2 block text-[14px] font-medium text-[#333333] dark:text-gray-100">Duration Type</label>
                <div className="inline-flex rounded-[6px] border border-[#cccccc] bg-white p-1 dark:border-gray-700 dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => setFormDraft({ ...formDraft, durationType: "minutes" })}
                    className={`rounded-[6px] px-4 py-2 text-sm font-medium ${
                      formDraft.durationType === "minutes"
                        ? "bg-[#077d8a] text-white"
                        : "text-[#077d8a] hover:bg-[#f5f5f5] dark:text-teal-300 dark:hover:bg-slate-700"
                    }`}
                  >
                    Minutes
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormDraft({ ...formDraft, durationType: "days" })}
                    className={`rounded-[6px] px-4 py-2 text-sm font-medium ${
                      formDraft.durationType === "days"
                        ? "bg-[#077d8a] text-white"
                        : "text-[#077d8a] hover:bg-[#f5f5f5] dark:text-teal-300 dark:hover:bg-slate-700"
                    }`}
                  >
                    Days
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[14px] font-medium text-[#333333] dark:text-gray-100">
                    Duration Value ({formDraft.durationType})
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formDraft.durationValue}
                    onChange={(e) => setFormDraft({ ...formDraft, durationValue: e.target.value })}
                    className="w-full rounded-[6px] border border-[#cccccc] bg-white p-[10px_12px] text-[#333333] outline-none focus:border-[#077d8a] focus:shadow-[0_0_0_2px_rgba(7,125,138,0.2)] dark:border-gray-700 dark:bg-slate-800 dark:text-gray-100 dark:focus:border-teal-400 dark:focus:shadow-[0_0_0_2px_rgba(45,212,191,0.2)]"
                  />
                  {formErrors.durationValue ? (
                    <p className="mt-1 text-sm text-[#e74c3c]">{formErrors.durationValue}</p>
                  ) : null}
                </div>

                <div>
                  <label className="mb-1 block text-[14px] font-medium text-[#333333] dark:text-gray-100">Max Credits</label>
                  <input
                    type="number"
                    min={1}
                    value={formDraft.maxCredits}
                    onChange={(e) => setFormDraft({ ...formDraft, maxCredits: e.target.value })}
                    className="w-full rounded-[6px] border border-[#cccccc] bg-white p-[10px_12px] text-[#333333] outline-none focus:border-[#077d8a] focus:shadow-[0_0_0_2px_rgba(7,125,138,0.2)] dark:border-gray-700 dark:bg-slate-800 dark:text-gray-100 dark:focus:border-teal-400 dark:focus:shadow-[0_0_0_2px_rgba(45,212,191,0.2)]"
                  />
                  {formErrors.maxCredits ? <p className="mt-1 text-sm text-[#e74c3c]">{formErrors.maxCredits}</p> : null}
                </div>

                <div>
                  <label className="mb-1 block text-[14px] font-medium text-[#333333] dark:text-gray-100">Max Courses (optional)</label>
                  <input
                    type="number"
                    min={1}
                    value={formDraft.maxCourses}
                    onChange={(e) => setFormDraft({ ...formDraft, maxCourses: e.target.value })}
                    className="w-full rounded-[6px] border border-[#cccccc] bg-white p-[10px_12px] text-[#333333] outline-none focus:border-[#077d8a] focus:shadow-[0_0_0_2px_rgba(7,125,138,0.2)] dark:border-gray-700 dark:bg-slate-800 dark:text-gray-100 dark:focus:border-teal-400 dark:focus:shadow-[0_0_0_2px_rgba(45,212,191,0.2)]"
                  />
                  {formErrors.maxCourses ? <p className="mt-1 text-sm text-[#e74c3c]">{formErrors.maxCourses}</p> : null}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="flex items-center justify-between rounded-[6px] border border-[#cccccc] p-3 dark:border-gray-700">
                  <span className="text-sm font-medium text-[#333333] dark:text-gray-100">Allow waitlist</span>
                  <input
                    type="checkbox"
                    checked={formDraft.allowWaitlist}
                    onChange={(e) => setFormDraft({ ...formDraft, allowWaitlist: e.target.checked })}
                    className="h-4 w-4 rounded border-[#cccccc] text-[#077d8a] focus:ring-[#077d8a]"
                  />
                </label>
                <label className="flex items-center justify-between rounded-[6px] border border-[#cccccc] p-3 dark:border-gray-700">
                  <span className="text-sm font-medium text-[#333333] dark:text-gray-100">Is active</span>
                  <input
                    type="checkbox"
                    checked={formDraft.isActive}
                    onChange={(e) => setFormDraft({ ...formDraft, isActive: e.target.checked })}
                    className="h-4 w-4 rounded border-[#cccccc] text-[#077d8a] focus:ring-[#077d8a]"
                  />
                </label>
              </div>

              {formApiError ? (
                <div className="rounded-[6px] bg-[#fdecea] px-3 py-2 text-sm text-[#e74c3c] dark:bg-red-900/25 dark:text-red-300">{formApiError}</div>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={submitAction !== null}
                  onClick={() => runSubmit("put")}
                  className="rounded-[6px] bg-[#077d8a] px-6 py-3 text-sm font-medium uppercase text-white shadow-[0_2px_4px_rgba(0,0,0,0.1)] hover:bg-[#066a75] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitAction === "put" ? "Updating..." : "Update Setting"}
                </button>
                <button
                  type="button"
                  disabled={submitAction !== null}
                  onClick={() => runSubmit("post")}
                  className="rounded-[6px] border border-[#077d8a] bg-white px-6 py-3 text-sm font-medium uppercase text-[#077d8a] hover:bg-[#e0e0e0] disabled:cursor-not-allowed disabled:opacity-60 dark:border-teal-500 dark:bg-slate-800 dark:text-teal-300 dark:hover:bg-slate-700"
                >
                  {submitAction === "post" ? "Renewing..." : "Renew Setting"}
                </button>
              </div>
            </form>
          </section>

          <section className="mt-6 rounded-[8px] border border-[#cccccc] bg-white p-5 shadow-[0_2px_6px_rgba(0,0,0,0.1)] dark:border-gray-700 dark:bg-surface-dark">
            <h3 className="text-lg font-semibold text-[#333333] dark:text-white">Status Actions</h3>
            <p className="mt-1 text-sm text-[#666666] dark:text-gray-300">Open or close enrollment with confirmation.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                disabled={!setting || statusLoading}
                onClick={() => setConfirmStatus("open")}
                className="rounded-[6px] bg-[#077d8a] px-5 py-3 text-sm font-medium uppercase text-white shadow-[0_2px_4px_rgba(0,0,0,0.1)] hover:bg-[#066a75] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Open Enrollment
              </button>
              <button
                disabled={!setting || statusLoading}
                onClick={() => setConfirmStatus("closed")}
                className="rounded-[6px] border border-[#077d8a] bg-white px-5 py-3 text-sm font-medium text-[#077d8a] hover:bg-[#e0e0e0] disabled:cursor-not-allowed disabled:opacity-50 dark:border-teal-500 dark:bg-slate-800 dark:text-teal-300 dark:hover:bg-slate-700"
              >
                Close Enrollment
              </button>
            </div>
          </section>
        </main>
      </div>

      {confirmStatus ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-[8px] bg-white p-5 shadow-lg dark:bg-surface-dark dark:border dark:border-gray-700">
            <h4 className="text-lg font-semibold text-[#333333] dark:text-white">Confirm Status Change</h4>
            <p className="mt-2 text-sm text-[#666666] dark:text-gray-300">
              Are you sure you want to set enrollment to{" "}
              <span className="font-semibold">{confirmStatus === "open" ? "Open" : "Closed"}</span>?
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setConfirmStatus(null)}
                className="rounded-[6px] border border-[#077d8a] bg-white px-4 py-2 text-sm font-medium text-[#077d8a] hover:bg-[#e0e0e0] dark:border-teal-500 dark:bg-slate-800 dark:text-teal-300 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={() => runStatusAction(confirmStatus)}
                className="rounded-[6px] bg-[#077d8a] px-4 py-2 text-sm font-medium uppercase text-white hover:bg-[#066a75]"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default AdminEnrollmentSettings;
