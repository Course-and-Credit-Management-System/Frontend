// Extracted from postLoginRouting.js
const DETAILS_CONFIRMED_STATUSES = new Set([
  'DETAILS_SUBMITTED',
  'PAYMENT_REQUIRED',
  'PAYMENT_PENDING',
  'PAYMENT_DONE',
  'ENROLLED'
]);

const toUpper = (value: any) => String(value || '').trim().toUpperCase();

export const isMeaningfulValue = (value: any): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim() !== '';
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.values(value).some(isMeaningfulValue);
  return true;
};

const registrationIdOf = (record: any) =>
  record?.registrationId || record?.registrationid || record?.registration_id || record?.id || null;

const toSortableTimestamp = (value: any) => {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const sortRegistrationsByRecent = (items: any[]) =>
  [...(Array.isArray(items) ? items : [])].sort((a, b) => {
    const aTime = Math.max(
      toSortableTimestamp(a?.submittedAt),
      toSortableTimestamp(a?.submitted_at),
      toSortableTimestamp(a?.createdAt),
      toSortableTimestamp(a?.created_at),
      -Infinity
    );
    const bTime = Math.max(
      toSortableTimestamp(b?.submittedAt),
      toSortableTimestamp(b?.submitted_at),
      toSortableTimestamp(b?.createdAt),
      toSortableTimestamp(b?.created_at),
      -Infinity
    );
    return bTime - aTime;
  });

const hasSectionContent = (payload: any) => {
  if (!payload || typeof payload !== 'object') return false;
  const sectionKeys = ['personal', 'contact', 'academic', 'guardian', 'documents', 'declaration'];
  return sectionKeys.some((key) => isMeaningfulValue(payload[key]));
};

export async function detectStudentDetailsRecord(api: any, studentSession: any) {
  const statusHint = toUpper(studentSession?.status);
  const studentId = studentSession?.studentid || studentSession?.id || null;

  if (!studentId) {
    return { exists: DETAILS_CONFIRMED_STATUSES.has(statusHint), source: 'status-fallback' };
  }

  try {
    const registrations = await api.listRegistrations(studentId);
    const sorted = sortRegistrationsByRecent(registrations);

    if (sorted.length === 0) {
      return { exists: DETAILS_CONFIRMED_STATUSES.has(statusHint), source: 'no-registrations' };
    }

    const seenIds = new Set();
    for (const registration of sorted) {
      const registrationId = registrationIdOf(registration);
      if (!registrationId) continue;
      const key = String(registrationId);
      if (seenIds.has(key)) continue;
      seenIds.add(key);

      try {
        const sections = await api.getRegistrationSections(registrationId);
        if (hasSectionContent(sections)) {
          return { exists: true, source: 'registration-sections' };
        }
      } catch (sectionError: any) {
        if (sectionError?.status !== 404) {
          return { exists: DETAILS_CONFIRMED_STATUSES.has(statusHint), source: 'section-error' };
        }
      }
    }

    return { exists: DETAILS_CONFIRMED_STATUSES.has(statusHint), source: 'status-fallback' };
  } catch (_) {
    return { exists: DETAILS_CONFIRMED_STATUSES.has(statusHint), source: 'status-fallback' };
  }
}

export function deriveAcademicProgress(startRoutePayload: any) {
  const reason = toUpper(startRoutePayload?.reason);
  const route = String(startRoutePayload?.route || '').trim();
  const semesterRaw = Number(startRoutePayload?.currentSemester);
  const currentSemester = Number.isFinite(semesterRaw) ? semesterRaw : null;
  const enrollmentOpen = typeof startRoutePayload?.enrollmentOpen === 'boolean'
    ? startRoutePayload.enrollmentOpen
    : null;

  const hasPayload = !!startRoutePayload && typeof startRoutePayload === 'object';
  const eligibilityKnown = hasPayload && enrollmentOpen !== null && (reason !== '' || route !== '' || currentSemester !== null);
  const enrollmentEligible = Boolean(enrollmentOpen) && (reason === 'SEM2_ENROLLMENT' || route === '/enrollment');

  let completedSemestersSameAcademicYear = null;
  if (reason === 'YEAR_CHANGED') {
    completedSemestersSameAcademicYear = 2;
  } else if (reason === 'SEM2_ENROLLMENT') {
    completedSemestersSameAcademicYear = 1;
  } else if (currentSemester === 1) {
    completedSemestersSameAcademicYear = 0;
  }

  return {
    reason,
    route,
    enrollmentOpen,
    currentAcademicYear: startRoutePayload?.currentAcademicYear || null,
    currentSemester,
    completedSemestersSameAcademicYear,
    eligibilityKnown,
    enrollmentEligible
  };
}

export function decidePostLoginRoute(studentSession: any, studentDetails: any, academicProgress: any) {
  const detailsExist = Boolean(studentDetails?.exists);
  if (!detailsExist) {
    return { type: 'REDIRECT', path: '/student-details' };
  }

  const enrollmentEligibilityKnown = Boolean(academicProgress?.eligibilityKnown);
  const canEnroll = enrollmentEligibilityKnown && Boolean(academicProgress?.enrollmentEligible);

  const enrollOption: any = {
    label: 'Enroll',
    path: '/enrollment'
  };
  if (!canEnroll) {
    enrollOption.disabled = true;
    enrollOption.reason = enrollmentEligibilityKnown
      ? 'Enrollment is available only after one completed semester.'
      : 'Enrollment option is disabled until eligibility is confirmed.';
  }

  return {
    type: 'CHOICE',
    options: [
      { label: 'Update Student Details', path: '/student-details' },
      enrollOption
    ]
  };
}