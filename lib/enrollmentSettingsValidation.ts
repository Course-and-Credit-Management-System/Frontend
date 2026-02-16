import {
  EnrollmentDurationType,
  EnrollmentSetting,
  EnrollmentSettingUpsertPayload,
} from "../types";

export interface EnrollmentSettingsFormDraft {
  durationType: EnrollmentDurationType;
  durationValue: string;
  maxCredits: string;
  maxCourses: string;
  allowWaitlist: boolean;
  isActive: boolean;
}

export interface EnrollmentSettingsFormErrors {
  durationValue?: string;
  maxCredits?: string;
  maxCourses?: string;
}

const MINUTES_IN_DAY = 24 * 60;

export function parseEnrollmentDateMs(value?: string | null): number {
  if (!value) return NaN;
  const raw = value.trim();
  if (!raw) return NaN;

  const hasTimezone = /(?:Z|[+-]\d{2}:\d{2})$/i.test(raw);
  const normalized = hasTimezone ? raw : `${raw}Z`;
  const ms = new Date(normalized).getTime();
  return Number.isFinite(ms) ? ms : NaN;
}

export function getDurationFromSetting(setting: EnrollmentSetting): {
  durationType: EnrollmentDurationType;
  durationValue: number;
} {
  const openAt = parseEnrollmentDateMs(setting.enrollment_open_at);
  const closeAt = parseEnrollmentDateMs(setting.enrollment_close_at);
  const diffMs = closeAt - openAt;

  if (!Number.isFinite(diffMs) || diffMs <= 0) {
    return { durationType: "days", durationValue: 1 };
  }

  const minutes = Math.round(diffMs / 60000);
  if (minutes % MINUTES_IN_DAY === 0) {
    return {
      durationType: "days",
      durationValue: Math.max(1, minutes / MINUTES_IN_DAY),
    };
  }

  return { durationType: "minutes", durationValue: Math.max(1, minutes) };
}

export function toDraftFromSetting(setting: EnrollmentSetting): EnrollmentSettingsFormDraft {
  const duration = getDurationFromSetting(setting);
  return {
    durationType: duration.durationType,
    durationValue: String(duration.durationValue),
    maxCredits: String(setting.max_credits),
    maxCourses: setting.max_courses ? String(setting.max_courses) : "",
    allowWaitlist: setting.allow_waitlist,
    isActive: setting.is_active,
  };
}

export function validateAndBuildEnrollmentPayload(
  draft: EnrollmentSettingsFormDraft
): { payload?: EnrollmentSettingUpsertPayload; errors: EnrollmentSettingsFormErrors } {
  const errors: EnrollmentSettingsFormErrors = {};

  const durationValue = Number(draft.durationValue);
  if (!Number.isFinite(durationValue) || durationValue <= 0) {
    errors.durationValue = "Duration must be a number greater than 0.";
  }

  const maxCredits = Number(draft.maxCredits);
  if (!Number.isFinite(maxCredits) || maxCredits <= 0) {
    errors.maxCredits = "Max credits must be a number greater than 0.";
  }

  let maxCourses: number | undefined;
  if (draft.maxCourses.trim().length > 0) {
    maxCourses = Number(draft.maxCourses);
    if (!Number.isFinite(maxCourses) || maxCourses <= 0) {
      errors.maxCourses = "Max courses must be empty or a number greater than 0.";
    }
  }

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  const payload: EnrollmentSettingUpsertPayload = {
    max_credits: Math.floor(maxCredits),
    allow_waitlist: draft.allowWaitlist,
    is_active: draft.isActive,
  };

  if (typeof maxCourses === "number") {
    payload.max_courses = Math.floor(maxCourses);
  }

  if (draft.durationType === "minutes") {
    payload.window_minutes = Math.floor(durationValue);
  } else {
    payload.window_days = Math.floor(durationValue);
  }

  return { payload, errors: {} };
}
