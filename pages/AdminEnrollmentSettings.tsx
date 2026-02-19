import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { DetailedCardGridSkeleton } from "../components/Skeleton";
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
    <div className="flex h-screen overflow-hidden bg-white dark:bg-slate-950">
      <Sidebar user={user} onLogout={onLogout} />

      {toast ? (
        <div
          className={`fixed right-8 top-8 z-50 rounded-2xl px-6 py-4 shadow-2xl border transition-all animate-in slide-in-from-right-10 duration-500 ${
            toast.type === "success"
              ? "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/40"
              : "bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/40"
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="material-icons-outlined text-xl">
              {toast.type === "success" ? "check_circle" : "error"}
            </span>
            <p className="font-bold text-sm tracking-tight">{toast.message}</p>
          </div>
        </div>
      ) : null}

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title="Enrollment Controls" user={user} />
        <main className="flex-1 overflow-y-auto p-8 animate-in fade-in duration-700 slide-in-from-bottom-4 scrollbar-hide max-w-[1200px] mx-auto w-full">
          <section className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <button
                onClick={() => navigate("/admin/enrollment")}
                className="group inline-flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-teal-600 transition-colors mb-2"
              >
                <span className="material-icons-outlined text-sm transform group-hover:-translate-x-1 transition-transform">west</span>
                Return to Management
              </button>
              <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">Global Parameters</h1>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Master configuration for institutional enrollment windows</p>
            </div>
          </section>

          <section className="rounded-[32px] border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 p-8 shadow-sm mb-10 transition-all hover:bg-white dark:hover:bg-slate-900 hover:shadow-md">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">Active Policy</h2>
              <div className="h-px flex-1 mx-6 bg-slate-200 dark:bg-slate-800 hidden md:block" />
              {setting && (
                <div className={`px-4 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest border ${
                  setting.is_active 
                    ? "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400" 
                    : "bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-900/20 dark:text-rose-400"
                }`}>
                  {setting.is_active ? "Operational" : "Restricted"}
                </div>
              )}
            </div>

            {loadingCurrent ? (
              <div className="py-4">
                <DetailedCardGridSkeleton count={1} />
              </div>
            ) : null}
            
            {!loadingCurrent && fetchError ? (
              <div className="rounded-2xl bg-rose-50 p-6 text-sm font-bold text-rose-700 border border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-900/40 flex items-center gap-3">
                <span className="material-icons-outlined">warning</span>
                {fetchError}
              </div>
            ) : null}
            
            {!loadingCurrent && notFound ? (
              <div className="rounded-2xl bg-teal-50 p-8 text-center border border-teal-100 dark:bg-teal-900/10 dark:border-teal-900/40">
                <div className="h-16 w-16 rounded-3xl bg-white dark:bg-slate-950 flex items-center justify-center mx-auto mb-4 shadow-sm border border-teal-100/50">
                  <span className="material-icons-outlined text-teal-600 text-3xl">settings_input_component</span>
                </div>
                <p className="text-sm font-bold text-teal-700 dark:text-teal-400">System configuration not initialized.</p>
                <p className="text-xs text-teal-600/70 dark:text-teal-500/70 mt-1">Use the interface below to define the first singleton policy.</p>
              </div>
            ) : null}

            {!loadingCurrent && setting ? (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="rounded-2xl bg-white dark:bg-slate-950 p-6 border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:border-teal-500/30">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="h-10 w-10 rounded-xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center text-teal-600 dark:text-teal-400">
                      <span className="material-icons-outlined text-xl">timer</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Time Buffer</p>
                      <p className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">{openRemaining}</p>
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-1000 ${setting.is_active ? 'bg-teal-500' : 'bg-slate-300'}`} style={{ width: setting.is_active ? '65%' : '0%' }} />
                  </div>
                </div>

                <div className="rounded-2xl bg-white dark:bg-slate-950 p-6 border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:border-teal-500/30">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Availability Window</p>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-500">Commencement</span>
                      <span className="text-sm font-extrabold text-slate-900 dark:text-white">{formatDateTime(setting.enrollment_open_at)}</span>
                    </div>
                    <div className="h-px bg-slate-50 dark:bg-slate-900" />
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-500">Termination</span>
                      <span className="text-sm font-extrabold text-slate-900 dark:text-white">{formatDateTime(setting.enrollment_close_at)}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl bg-white dark:bg-slate-950 p-6 border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:border-teal-500/30">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Constraint Matrix</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Credits</p>
                      <p className="text-xl font-black text-slate-900 dark:text-white">{setting.max_credits}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Waitlist</p>
                      <p className="text-xl font-black text-slate-900 dark:text-white">{setting.allow_waitlist ? "ON" : "OFF"}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </section>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-10 items-start">
            <section className="xl:col-span-8 rounded-[32px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm p-10">
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-8">Policy Definition</h3>

              <form
                className="space-y-8"
                onSubmit={(e) => e.preventDefault()}
              >
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Temporal Unit</label>
                  <div className="inline-flex rounded-2xl bg-slate-100 dark:bg-slate-950 p-1.5 border border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setFormDraft({ ...formDraft, durationType: "minutes" })}
                      className={`rounded-xl px-8 py-2.5 text-xs font-bold transition-all ${
                        formDraft.durationType === "minutes"
                          ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-md"
                          : "text-slate-400 hover:text-slate-600"
                      }`}
                    >
                      Minutes
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormDraft({ ...formDraft, durationType: "days" })}
                      className={`rounded-xl px-8 py-2.5 text-xs font-bold transition-all ${
                        formDraft.durationType === "days"
                          ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-md"
                          : "text-slate-400 hover:text-slate-600"
                      }`}
                    >
                      Days
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                      Duration Magnitude ({formDraft.durationType})
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={formDraft.durationValue}
                      onChange={(e) => setFormDraft({ ...formDraft, durationValue: e.target.value })}
                      className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-6 py-3.5 text-sm font-bold focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500/50 outline-none transition-all dark:text-white"
                    />
                    {formErrors.durationValue && (
                      <p className="mt-1 text-xs font-bold text-rose-500 ml-1 italic">{formErrors.durationValue}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Credit Ceiling</label>
                    <input
                      type="number"
                      min={1}
                      value={formDraft.maxCredits}
                      onChange={(e) => setFormDraft({ ...formDraft, maxCredits: e.target.value })}
                      className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-6 py-3.5 text-sm font-bold focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500/50 outline-none transition-all dark:text-white"
                    />
                    {formErrors.maxCredits && <p className="mt-1 text-xs font-bold text-rose-500 ml-1 italic">{formErrors.maxCredits}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Course Capacity (Optional)</label>
                    <input
                      type="number"
                      min={1}
                      value={formDraft.maxCourses}
                      onChange={(e) => setFormDraft({ ...formDraft, maxCourses: e.target.value })}
                      className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-6 py-3.5 text-sm font-bold focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500/50 outline-none transition-all dark:text-white"
                    />
                    {formErrors.maxCourses && <p className="mt-1 text-xs font-bold text-rose-500 ml-1 italic">{formErrors.maxCourses}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="flex items-center justify-between rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-5 cursor-pointer group">
                    <div className="space-y-0.5">
                      <span className="block text-sm font-extrabold text-slate-900 dark:text-white">Allow Waitlist</span>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Queueing overflow overflow</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={formDraft.allowWaitlist}
                      onChange={(e) => setFormDraft({ ...formDraft, allowWaitlist: e.target.checked })}
                      className="h-5 w-5 rounded-lg border-slate-300 accent-teal-600 cursor-pointer"
                    />
                  </label>
                  <label className="flex items-center justify-between rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-5 cursor-pointer group">
                    <div className="space-y-0.5">
                      <span className="block text-sm font-extrabold text-slate-900 dark:text-white">Active Status</span>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Immediate deployment</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={formDraft.isActive}
                      onChange={(e) => setFormDraft({ ...formDraft, isActive: e.target.checked })}
                      className="h-5 w-5 rounded-lg border-slate-300 accent-teal-600 cursor-pointer"
                    />
                  </label>
                </div>

                {formApiError && (
                  <div className="rounded-2xl bg-rose-50 p-4 text-xs font-bold text-rose-700 border border-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/40">
                    {formApiError}
                  </div>
                )}

                <div className="flex flex-wrap gap-4 pt-4">
                  <button
                    type="button"
                    disabled={submitAction !== null}
                    onClick={() => runSubmit("put")}
                    className="flex-1 rounded-2xl bg-slate-900 dark:bg-slate-800 px-8 py-4 text-xs font-black uppercase tracking-widest text-white shadow-lg hover:bg-slate-800 dark:hover:bg-slate-700 transition-all active:scale-[0.98] disabled:opacity-40"
                  >
                    {submitAction === "put" ? "Processing..." : "Update Master Setting"}
                  </button>
                  <button
                    type="button"
                    disabled={submitAction !== null}
                    onClick={() => runSubmit("post")}
                    className="flex-1 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-8 py-4 text-xs font-black uppercase tracking-widest text-slate-600 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-[0.98] disabled:opacity-40 shadow-sm"
                  >
                    {submitAction === "post" ? "Processing..." : "Renew Parameters"}
                  </button>
                </div>
              </form>
            </section>

            <section className="xl:col-span-4 space-y-8">
              <div className="rounded-[32px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">Gate Controls</h3>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">Instantly toggle institutional enrollment access</p>
                <div className="space-y-4">
                  <button
                    disabled={!setting || statusLoading}
                    onClick={() => setConfirmStatus("open")}
                    className="w-full rounded-2xl bg-emerald-600 px-6 py-4 text-xs font-black uppercase tracking-widest text-white shadow-md hover:bg-emerald-700 transition-all active:scale-[0.98] disabled:opacity-30"
                  >
                    Deploy Gates (OPEN)
                  </button>
                  <button
                    disabled={!setting || statusLoading}
                    onClick={() => setConfirmStatus("closed")}
                    className="w-full rounded-2xl border border-rose-200 dark:border-rose-900/40 bg-white dark:bg-slate-950 px-6 py-4 text-xs font-black uppercase tracking-widest text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all active:scale-[0.98] disabled:opacity-30"
                  >
                    Secure Gates (CLOSE)
                  </button>
                </div>
              </div>

              <div className="p-8 rounded-[32px] bg-teal-50/30 dark:bg-teal-900/10 border border-teal-100/50 dark:border-teal-900/20">
                <div className="flex gap-4">
                  <span className="text-2xl">Tip:</span>
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-teal-800 dark:text-teal-300 uppercase tracking-widest">Operational Tip</p>
                    <p className="text-xs text-teal-700 dark:text-teal-400 leading-relaxed font-medium">
                      Singleton settings apply globally to all departments. Use "Renew" only when starting a completely new academic cycle.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>

      {confirmStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[32px] p-10 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300 text-center">
            <div className={`h-20 w-20 rounded-3xl flex items-center justify-center mx-auto mb-6 ${confirmStatus === 'open' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              <span className="material-icons-outlined text-4xl">{confirmStatus === 'open' ? 'lock_open' : 'lock'}</span>
            </div>
            <h4 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">Gate Confirmation</h4>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-10 leading-relaxed">
              Are you prepared to set the global enrollment state to{" "}
              <span className={`font-black uppercase ${confirmStatus === 'open' ? 'text-emerald-600' : 'text-rose-600'}`}>{confirmStatus}</span>?
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => runStatusAction(confirmStatus)}
                className={`w-full py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-white shadow-lg transition-all active:scale-[0.98] ${confirmStatus === 'open' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}
              >
                Confirm Deployment
              </button>
              <button
                onClick={() => setConfirmStatus(null)}
                className="w-full py-4 rounded-2xl text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
              >
                Abort Action
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminEnrollmentSettings;
