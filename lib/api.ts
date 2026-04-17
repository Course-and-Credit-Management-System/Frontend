/// <reference types="vite/client" />

import {
  DropRecommendationResponse,
  EnrollmentAssistanceRequest,
  EnrollmentAssistanceResponse,
  EnrollmentSetting,
  EnrollmentSettingStatusPayload,
  EnrollmentSettingUpsertPayload,
  StudentEnrollmentSettingCurrent,
} from '../types';
import {
  StudentChatRequest,
  StudentChatResponse,
  StudentChatHistoryItem
} from "../types/studentChat";

import { AdminChatRequest, AdminChatResponse } from '../types/adminChat';
import type { CurrentCoursesResponse } from "../types";
import { API_BASE_URL, SPRING_API_BASE_URL } from "./apiBase";

// Use relative path so requests go through Vite proxy (same-origin = cookies work)

type RequestOptions = {
  method?: string;
  body?: any;
  backend?: "fastapi" | "spring";
};

type BlobResponse = {
  blob: Blob;
  filename: string | null;
};

export class HttpStatusError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function normalizeStudent(student: any) {
  if (!student || typeof student !== "object") return student;

  const latestTermEnrollmentRaw = student.latestTermEnrollment || student.latest_term_enrollment;
  const latestTermEnrollment =
    latestTermEnrollmentRaw && typeof latestTermEnrollmentRaw === "object"
      ? {
          ...latestTermEnrollmentRaw,
          academicYear:
            latestTermEnrollmentRaw.academicYear ||
            latestTermEnrollmentRaw.academic_year ||
            "",
          semester:
            latestTermEnrollmentRaw.semester ?? latestTermEnrollmentRaw.termSemester ?? null,
          termStatus:
            latestTermEnrollmentRaw.termStatus ||
            latestTermEnrollmentRaw.term_status ||
            "",
          section: latestTermEnrollmentRaw.section || "",
          majorClassId:
            latestTermEnrollmentRaw.majorClassId ||
            latestTermEnrollmentRaw.major_class_id ||
            null,
          majorClassLabel:
            latestTermEnrollmentRaw.majorClassLabel ||
            latestTermEnrollmentRaw.major_class_label ||
            "",
          updatedAt:
            latestTermEnrollmentRaw.updatedAt ||
            latestTermEnrollmentRaw.updated_at ||
            null,
        }
      : null;

  return {
    ...student,
    id: student.id || student.studentid,
    studentid: student.studentid || student.id,
    registrationId:
      student.registrationId || student.registrationid || student.registration_id || null,
    namemm: student.namemm || student.nameMm || student.name_mm || student.fullName || "",
    nameen: student.nameen || student.nameEn || student.name_en || "",
    father_name: student.father_name || student.fatherName || "",
    mother_name: student.mother_name || student.motherName || "",
    gender: student.gender || "",
    birthplace: student.birthplace || student.place_of_birth || student.placeOfBirth || "",
    date_of_birth: student.date_of_birth || student.dateOfBirth || "",
    nrc_number: student.nrc_number || student.nrcNumber || "",
    exam_roll_no:
      student.exam_roll_no ||
      student.examRollNo ||
      student.entrance_roll_no ||
      student.entranceRollNo ||
      "",
    student_name:
      student.student_name || student.studentName || student.full_name || student.fullName || "",
    phone: student.phone || student.phone_number || student.phoneNumber || "",
    user_name: student.user_name || student.username || "",
    currentyear: student.currentyear ?? student.currentYear ?? null,
    academic_semester:
      student.academic_semester || student.academicSemester || student.semester || "",
    major: student.major || student.major_code || student.specialization || "",
    academicyearentered: student.academicyearentered || student.academicYearEntered || "",
    matriculation_rollno:
      student.matriculation_rollno ||
      student.matriculation_roll_no ||
      student.matriculationRollNo ||
      "",
    matriculation_passed_year:
      student.matriculation_passed_year || student.matriculationPassedYear || "",
    totalmarks_obtained:
      student.totalmarks_obtained ??
      student.total_marks_obtained ??
      student.totalMarksObtained ??
      student.total_marks ??
      student.totalMarks ??
      null,
    division_or_state: student.division_or_state || student.divisionOrState || "",
    township: student.township || "",
    address: student.address || "",
    assigned_class: student.assigned_class || student.assignedClass || "",
    status: student.status || "",
    globalStatus: student.globalStatus || student.global_status || student.status || "",
    payment_status: student.payment_status || student.paymentStatus || "",
    payment_academic_year:
      student.payment_academic_year || student.paymentAcademicYear || "",
    paymentStatus: student.paymentStatus || student.payment_status || "",
    paymentAcademicYear:
      student.paymentAcademicYear || student.payment_academic_year || "",
    passportphoto: student.passportphoto || student.passportPhoto || student.passport_photo || "",
    nrcfrontimage:
      student.nrcfrontimage || student.nrcFrontImage || student.nrc_front_image || "",
    nrcbackimage:
      student.nrcbackimage || student.nrcBackImage || student.nrc_back_image || "",
    father_id: student.father_id || student.fatherId || null,
    mother_id: student.mother_id || student.motherId || null,
    rejection_reason: student.rejection_reason || student.rejectionReason || "",
    is_benefit_student: student.is_benefit_student ?? student.isBenefitStudent ?? false,
    is_hostel_student: student.is_hostel_student ?? student.isHostelStudent ?? false,
    is_on_break: student.is_on_break ?? student.isOnBreak ?? false,
    latestTermEnrollment,
    latest_term_enrollment: latestTermEnrollment,
  };
}

// ---- Global auth-failure handling (401/403) ----
function clearAuthSession() {
  sessionStorage.removeItem("user");
  sessionStorage.removeItem("role");
  sessionStorage.removeItem("must_reset_password");
  sessionStorage.removeItem("adminAuthToken");
  localStorage.removeItem("access_token");
  localStorage.removeItem("authToken");
  localStorage.removeItem("adminAuthToken");
  localStorage.removeItem("studentData");
  localStorage.removeItem("adminData");
}

function redirectToLogin() {
  if (typeof window === "undefined") return;

  const hash = window.location.hash || "";
  const onPublicPage =
    hash === "#/login" ||
    hash.startsWith("#/login?") ||
    hash === "#/forgot-password" ||
    hash.startsWith("#/forgot-password?") ||
    hash === "#/reset-password-token" ||
    hash.startsWith("#/reset-password-token?");

  if (!onPublicPage) {
    window.location.hash = "#/login";
  }
}

function shouldAutoLogout(path: string) {
  if (path === "/api/v1/auth/login") return false;
  if (path === "/api/v1/auth/me") return false;
  if (path === "/api/v1/auth/forgot-password") return false;
  if (path === "/api/v1/auth/reset-password-with-token") return false;
  if (path.includes("/api/v1/admin/messages/") && path.endsWith("/read")) return false;
  // Allow enrollment errors to be handled by UI instead of auto-redirecting to login
  if (path.includes("/courses/enrollment")) return false;
  // Spring Boot public endpoints (match raw path — prefix is added inside request())
  if (path === "/api/auth/register") return false;
  if (path === "/api/registration-window") return false;
  return true;
}
// -----------------------------------------------

async function request<T = any>(path: string, options: RequestOptions = {}): Promise<T> {
  const backend = options.backend ?? "fastapi";
  const base = backend === "spring" ? SPRING_API_BASE_URL : API_BASE_URL;

  // With the new path-based routing (/api/v1 -> fastapi, /api -> spring)
  // we do not need the /spring-api prefix.
  const fullPath = path;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Preserve compatibility with older login flows while standardizing on access_token.
  const token =
    localStorage.getItem("access_token") ||
    localStorage.getItem("authToken") ||
    sessionStorage.getItem("adminAuthToken") ||
    localStorage.getItem("adminAuthToken");
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${base}${fullPath}`, {
    method: options.method ?? "GET",
    headers,
    credentials: "include",
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();
  let data: any;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if ((res.status === 401 || res.status === 403) && shouldAutoLogout(path)) {
    clearAuthSession();
    redirectToLogin();
    const msg = (data as any)?.detail || (data as any)?.message || `Not authorized (${res.status})`;
    throw new HttpStatusError(res.status, msg);
  }

  if (!res.ok) {
    const msg = (data as any)?.detail || (data as any)?.message || `Request failed (${res.status})`;
    throw new HttpStatusError(res.status, msg);
  }

  return data;
}

async function requestBlob(path: string, options: RequestOptions = {}): Promise<BlobResponse> {
  const backend = options.backend ?? "fastapi";
  const base = backend === "spring" ? SPRING_API_BASE_URL : API_BASE_URL;
  const fullPath = path;

  const headers: Record<string, string> = options.body
    ? { "Content-Type": "application/json" }
    : {};

  const res = await fetch(`${base}${fullPath}`, {
    method: options.method ?? "GET",
    headers,
    credentials: "include",
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if ((res.status === 401 || res.status === 403) && shouldAutoLogout(path)) {
    clearAuthSession();
    redirectToLogin();
    throw new HttpStatusError(res.status, `Not authorized (${res.status})`);
  }

  if (!res.ok) {
    throw new HttpStatusError(res.status, `Request failed (${res.status})`);
  }

  const blob = await res.blob();
  const contentDisposition = res.headers.get("content-disposition") || "";
  const filenameMatch = contentDisposition.match(/filename\*?=(?:UTF-8''|")?([^\";]+)/i);
  const filename = filenameMatch?.[1]?.trim()?.replace(/"/g, "") || null;

  return { blob, filename };
}

// ---------------------------
// Types (Announcements)
// ---------------------------
export type AnnouncementType = "General" | "Urgent" | "Event" | "Academic";
export type AnnouncementStatus = "draft" | "published" | "archived";

export type AdminAnnouncementCreate = {
  title: string;
  content: string;
  type?: AnnouncementType;

  // legacy label-only
  target_audience?: string;

  // legacy expiry
  expiry_date?: string | null;

  // optional new fields your backend supports
  status?: AnnouncementStatus;
  pinned?: boolean;
};

export type AdminAnnouncementUpdate = {
  title?: string;
  content?: string;
  type?: AnnouncementType;

  target_audience?: string;
  expiry_date?: string | null;

  status?: AnnouncementStatus;
  pinned?: boolean;
};

export type AdminAnnouncementBulkPayload = {
  action: "publish" | "archive" | "delete";
  ids: string[];
};

// ---------------------------
// API
// ---------------------------
export const api = {
  // Public student registration
  registerStudent: (payload: any) => request("/api/auth/register", { method: "POST", body: payload }),
  getRegistrationWindowSettings: () => request("/api/registration-window", {}),

  // Legacy Spring auth endpoints kept for compatibility with src/pages login flows.
  loginStudent: (payload: { email: string; username: string; password: string }) =>
    request("/api/auth/login", { method: "POST", body: payload, backend: "spring" }),
  loginAdmin: (payload: { email: string; password: string }) =>
    request("/api/auth/admin/login", { method: "POST", body: payload, backend: "spring" }),
  getStudents: async (email: string) => {
    const result = await request<any[]>(
      `/api/students?email=${encodeURIComponent(email)}`,
      { backend: "spring" }
    );
    return Array.isArray(result) ? result.map(normalizeStudent) : [];
  },
  getStudentById: async (studentId: string) => {
    const result = await request<any>(
      `/api/students/${encodeURIComponent(studentId)}`,
      { backend: "spring" }
    );
    return normalizeStudent(result);
  },
  updateStudent: async (studentId: string, payload: any) => {
    const result = await request<any>(
      `/api/students/${encodeURIComponent(studentId)}`,
      { method: "PUT", body: payload, backend: "spring" }
    );
    return normalizeStudent(result);
  },
  getStudentStartRoute: () =>
    request("/api/student/start-route", { backend: "spring" }),
  listRegistrations: async (studentId?: string) => {
    const registrations = await request<any[]>("/api/admin/registrations", { backend: "spring" });
    if (!studentId) return registrations;
    const sid = String(studentId);
    return (Array.isArray(registrations) ? registrations : []).filter((item) => {
      const candidate =
        item?.studentId ||
        item?.student_id ||
        item?.studentUserId ||
        item?.student_user_id ||
        item?.user_id ||
        null;
      return candidate != null && String(candidate) === sid;
    });
  },
  getRegistrationSections: (registrationId: string) =>
    request(`/v1/registration/${encodeURIComponent(registrationId)}/sections`, { backend: "spring" }),

  login: (payload: { username: string; password: string; role: "admin" | "student" }) =>
    request("/api/v1/auth/login", { method: "POST", body: payload }),

  me: () => request("/api/v1/auth/me"),

  logout: () => request("/api/v1/auth/logout", { method: "POST" }),

  resetPassword: (payload: { old_password: string; new_password: string }) =>
    request("/api/v1/auth/reset-password", { method: "POST", body: payload }),

  forgotPassword: (payload: { email: string }) =>
    request("/api/v1/auth/forgot-password", { method: "POST", body: payload }),

  resetPasswordWithToken: (payload: { token: string; new_password: string }) =>
    request("/api/v1/auth/reset-password-with-token", { method: "POST", body: payload }),

  adminStatistics: () => request("/api/v1/admin/statistics"),
  adminMajorDistribution: () => request("/api/v1/admin/major-distribution"),
  adminPendingActions: () => request("/api/v1/admin/pending-actions"),

  // --- Admin Courses ---
  adminCourses: () => request("/api/v1/admin/courses"),
  adminCourseByCode: (course_code: string) =>
  request(`/api/v1/admin/courses/${encodeURIComponent(course_code)}`),
  adminCreateCourse: (payload: any) => request("/api/v1/admin/courses", { method: "POST", body: payload }),
  adminUpdateCourse: (courseCode: string, payload: any) =>
    request(`/api/v1/admin/courses/${encodeURIComponent(courseCode)}`, { method: "PUT", body: payload }),

  // --- Admin Announcements ---
  adminAnnouncements: () => request("/api/v1/admin/announcements"),

  adminCreateAnnouncement: (payload: AdminAnnouncementCreate) =>
    request("/api/v1/admin/announcements", { method: "POST", body: payload }),

  adminDeleteAnnouncement: (announcementId: string) =>
    request(`/api/v1/admin/announcements/${encodeURIComponent(announcementId)}`, { method: "DELETE" }),

  adminUpdateAnnouncement: (announcementId: string, payload: AdminAnnouncementUpdate) =>
    request(`/api/v1/admin/announcements/${encodeURIComponent(announcementId)}`, {
      method: "PUT",
      body: payload,
    }),

  adminPublishAnnouncement: (announcementId: string) =>
    request(`/api/v1/admin/announcements/${encodeURIComponent(announcementId)}/publish`, { method: "POST" }),

  adminArchiveAnnouncement: (announcementId: string) =>
    request(`/api/v1/admin/announcements/${encodeURIComponent(announcementId)}/archive`, { method: "POST" }),

  adminPinAnnouncement: (announcementId: string) =>
    request(`/api/v1/admin/announcements/${encodeURIComponent(announcementId)}/pin`, { method: "POST" }),

  adminUnpinAnnouncement: (announcementId: string) =>
    request(`/api/v1/admin/announcements/${encodeURIComponent(announcementId)}/unpin`, { method: "POST" }),

  adminDuplicateAnnouncement: (announcementId: string) =>
    request(`/api/v1/admin/announcements/${encodeURIComponent(announcementId)}/duplicate`, { method: "POST" }),

  adminBulkAnnouncements: (payload: AdminAnnouncementBulkPayload) =>
    request("/api/v1/admin/announcements/bulk", { method: "POST", body: payload }),

  // --- Admin Enrollments ---
  adminEnrollments: () => request("/api/v1/admin/enrollments/"),
  adminUpdateEnrollmentStatus: (enrollmentId: string, payload: { status: string; reason: string }) =>
    request<{ message: string; success: boolean }>(`/api/v1/admin/enrollments/${encodeURIComponent(enrollmentId)}/status`, {
        method: "PUT",
        body: payload
  }),
  
  adminCreateEnrollment: (payload: { student_id: string; course_id: string }) => 
    request("/api/v1/admin/enrollments/", {
        method: "POST",
        body: payload
  }),

  adminAdvanceSemester: () =>
    request<{ detail: string }>("/api/v1/admin/semester/advance", {
      method: "POST",
    }),

  // --- Admin Enrollment Settings (singleton) ---
  adminEnrollmentSettingCurrent: () =>
    request<EnrollmentSetting>("/api/v1/admin/enrollment-settings"),

  adminReplaceEnrollmentSetting: (payload: EnrollmentSettingUpsertPayload) =>
    request<EnrollmentSetting>("/api/v1/admin/enrollment-settings", {
      method: "POST",
      body: payload,
    }),

  adminUpsertEnrollmentSetting: (payload: EnrollmentSettingUpsertPayload) =>
    request<EnrollmentSetting>("/api/v1/admin/enrollment-settings", {
      method: "PUT",
      body: payload,
    }),

  adminSetEnrollmentSettingStatus: (payload: EnrollmentSettingStatusPayload) =>
    request<EnrollmentSetting>("/api/v1/admin/enrollment-settings/status", {
      method: "PATCH",
      body: payload,
    }),

  // --- Admin Messages ---
  adminMessages: () => request("/api/v1/admin/messages"),
  adminStudents: () => request("/api/v1/admin/students/"),
  adminStudentIds: () => request("/api/v1/admin/students/ids"),
  adminStudentOptions: () => request("/api/v1/admin/students/options"),

  adminCreateMessage: (payload: {
    receiver_id: string;
    subject: string;
    body: string;
    category?: string;
    attachments?: string[];
  }) => request("/api/v1/admin/messages", { method: "POST", body: payload }),

  adminMarkMessageRead: (messageId: string, is_read: boolean) =>
    request(`/api/v1/admin/messages/${encodeURIComponent(messageId)}/read`, {
      method: "PUT",
      body: { is_read },
    }),

  adminDeleteMessage: (messageId: string) =>
    request(`/api/v1/admin/messages/${encodeURIComponent(messageId)}`, { method: "DELETE" }),

  // --- Student Messages ---
  studentMessages: () => request<any[]>("/api/v1/student/messages"),

  studentMarkMessageRead: (messageId: string, is_read: boolean) =>
    request(`/api/v1/student/messages/${encodeURIComponent(messageId)}/read`, {
      method: "PUT",
      body: { is_read },
    }),

  studentAvailableCourses: (query?: string, sort?: string) => {
    const params = new URLSearchParams();
    if (query) params.append("search", query);
    if (sort) params.append("sort", sort);
    return request<{ data: any[]; meta: any }>(`/api/v1/student/courses?${params.toString()}`);
  },

  studentEnrollmentSettingCurrent: () =>
    request<StudentEnrollmentSettingCurrent>("/api/v1/student/enrollment/settings/current"),

  enrollStudent: (payload: { selected_code: string }) => 
    request<{ success: boolean; message: string; credit_usage: any }>("/api/v1/student/courses/enrollment", {
      method: "POST",
      body: payload
    }),

  studentEnrollmentAssistance: (payload: EnrollmentAssistanceRequest) =>
    request<EnrollmentAssistanceResponse>("/api/v1/student/courses/enrollment-assistance", {
      method: "POST",
      body: payload,
    }),
  studentDropRecommendation: () =>
    request<DropRecommendationResponse>("/api/v1/student/courses/drop-recommendation"),

  studentProgressGet: () => request("/api/v1/student/progress"),
  studentProgressSaveAcademicYear: (payload: { academic_year: string }) =>
    request("/api/v1/student/progress/academic-year", { method: "POST", body: payload }),
  studentProgressSaveCurrent: (payload: { current_year: string; current_semester: string }) =>
    request("/api/v1/student/progress/current", { method: "POST", body: payload }),

  studentMajorState: () => request("/api/v1/student/major/state"),
  studentMajorOptions: () => request("/api/v1/student/major/options"),
  studentMajorEligibility: () => request("/api/v1/student/major/eligibility"),
  studentSelectTrack: (payload: { track: "CS" | "CT" }) =>
    request("/api/v1/student/major/track", { method: "POST", body: payload }),
  studentSelectMajor: (payload: { major: string }) =>
    request("/api/v1/student/major/select", { method: "POST", body: payload }),

  // --- Special Major Access (standalone flow) ---
  specialMajorEligibility: () => request("/api/v1/student/special-major/eligibility"),
  specialMajorOptions: () => request("/api/v1/student/special-major/options"),
  specialMajorSelectTrack: async (payload: { track: "CS" | "CT" }) => {
    try {
      return await request("/api/v1/student/special-major/track", { method: "POST", body: payload });
    } catch {
      try {
        return await request("/api/v1/student/special-major/track", {
          method: "POST",
          body: { selected_track: payload.track },
        });
      } catch {
        return request("/api/v1/student/special-major/track", {
          method: "POST",
          body: { track_code: payload.track },
        });
      }
    }
  },
  specialMajorSelect: (payload: { major: string }) =>
    request("/api/v1/student/special-major/select", { method: "POST", body: payload }),
  specialMajorPopulateFromProfile: () =>
    request("/api/v1/student/special-major/populate-from-profile", { method: "POST" }),

  currentStudentCourses: () => request<CurrentCoursesResponse>("/api/v1/student/courses/current"),
  studentCurrentCoursesPdf: () =>
    requestBlob("/api/v1/student/courses/current/pdf", { method: "GET" }),

  studentCourseDetails: (code: string) =>
    request<any>(`/api/v1/student/courses/detail/${encodeURIComponent(code)}`),

  // --- Student Alerts ---
  studentAlerts: () => request<any[]>("/api/v1/student/alerts/"),
  studentDeleteAlert: (alertId: string) => request(`/api/v1/student/alerts/${encodeURIComponent(alertId)}`, { method: "DELETE" }),

  // --- Student Announcements ---
  studentAnnouncements: async () => {
    try {
      return await request<any[]>("/api/v1/student/announcements");
    } catch {
      try {
        return await request<any[]>("/api/v1/student/announcements/");
      } catch {
        return [];
      }
    }
  },
  studentAnnouncementsUnreadCount: async () => {
    try {
      return await request<{ count: number; total: number }>("/api/v1/student/announcements/unread-count");
    } catch {
      try {
        return await request<{ count: number; total: number }>("/api/v1/student/announcements/unread-count/");
      } catch {
        return { count: 0, total: 0 };
      }
    }
  },
  studentAnnouncementsMarkAllRead: async () => {
    try {
      return await request("/api/v1/student/announcements/mark-read", { method: "POST", body: { all: true } });
    } catch {
      try {
        return await request("/api/v1/student/announcements/mark-read/", { method: "POST", body: { all: true } });
      } catch {
        return { success: false };
      }
    }
  },

  dropCourse: (code: string) =>
    request<{ success: boolean }>(`/api/v1/student/courses/${encodeURIComponent(code)}`, {
      method: "DELETE",
    }),

  bulkDropCourses: (courseCodes: string[]) =>
    request<{ success: boolean }>("/api/v1/student/courses/bulk-drop", {
      method: "POST",
      body: { course_codes: courseCodes },
    }),

  studentResults: () => request("/api/v1/student/results"),

  studentResultsSummary: (user_id?: string) =>
    request(`/api/v1/student/results/summary${user_id ? `?user_id=${encodeURIComponent(user_id)}` : ""}`),
  studentResultsPdf: () =>
    request(`/api/v1/student/results/pdf`),

  studentDegreeProgress: () =>
    request("/api/v1/student/progress"),
  studentDegreeAudit: () =>
    request("/api/v1/student/degree-audit"),

  // --- Student Dashboard ---
  studentDashboardSummary: () => request("/api/v1/student/dashboard-summary"),

  studentAiChat: async (payload: StudentChatRequest): Promise<StudentChatResponse> => {
    const token = localStorage.getItem("access_token");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/ai/ai/student/chat`, {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    let data: any;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }

    if (!response.ok) {
      const msg = data?.detail || data?.message || `Request failed (${response.status})`;
      throw new HttpStatusError(response.status, msg);
    }

    if (!data || typeof data.answer !== "string") {
      throw new HttpStatusError(500, "Unexpected response format from AI service.");
    }

    return data as StudentChatResponse;
  },

  studentCourseChat: async (payload: {
    message: string;
    course_id: string;
    history: StudentChatHistoryItem[];
    mode: "auto";
  }): Promise<StudentChatResponse> => {
    const token = localStorage.getItem("access_token");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/ai/ai/student/course-chat`, {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    let data: any;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }

    if (!response.ok) {
      const msg = data?.detail || data?.message || `Request failed (${response.status})`;
      throw new HttpStatusError(response.status, msg);
    }

    return data as StudentChatResponse;
  },

  adminAiChat: async (payload: AdminChatRequest): Promise<AdminChatResponse> => {
    const token = localStorage.getItem("access_token");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/ai/ai/admin/chat`, {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    let data: any;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }

    if (!response.ok) {
      const msg = data?.detail || data?.message || `Request failed (${response.status})`;
      throw new HttpStatusError(response.status, msg);
    }

    if (!data || typeof data.answer !== "string") {
      throw new HttpStatusError(500, "Unexpected response format from AI service.");
    }

    return data as AdminChatResponse;
  },
};
  
