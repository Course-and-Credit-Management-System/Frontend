/// <reference types="vite/client" />

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

type RequestOptions = {
  method?: string;
  body?: any;
};

// ---- Global auth-failure handling (401/403) ----
function clearAuthSession() {
  sessionStorage.removeItem("user");
  sessionStorage.removeItem("role");
  sessionStorage.removeItem("must_reset_password");
}

function redirectToLogin() {
  // HashRouter redirect without full reload
  if (typeof window === "undefined") return;

  const hash = window.location.hash || "";

  // Don't spam redirect loops on public pages
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

// Exclude endpoints that should NOT trigger auto-logout redirect logic
function shouldAutoLogout(path: string) {
  // login should not redirect on invalid credentials
  if (path === "/api/v1/auth/login") return false;

  // me() is called on boot; if it fails, we just treat user as logged out (no redirect spam)
  if (path === "/api/v1/auth/me") return false;

  // public flows
  if (path === "/api/v1/auth/forgot-password") return false;
  if (path === "/api/v1/auth/reset-password-with-token") return false;

  return true;
}
// -----------------------------------------------

async function request(path: string, options: RequestOptions = {}) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const res = await fetch(`${API_BASE}${path}`, {
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

  // Global 401/403: clear session + redirect to /#/login (no infinite loops)
  if ((res.status === 401 || res.status === 403) && shouldAutoLogout(path)) {
    clearAuthSession();
    redirectToLogin();

    const msg = data?.detail || data?.message || `Not authorized (${res.status})`;
    throw new Error(msg);
  }

  if (!res.ok) {
    const msg = data?.detail || data?.message || `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return data;
}

export const api = {
  login: (payload: { username: string; password: string; role: "admin" | "student" }) =>
    request("/api/v1/auth/login", { method: "POST", body: payload }),

  me: () => request("/api/v1/auth/me"),

  logout: () => request("/api/v1/auth/logout", { method: "POST" }),

  resetPassword: (payload: { old_password: string; new_password: string }) =>
    request("/api/v1/auth/reset-password", { method: "POST", body: payload }),

  forgotPassword: (email: string) =>
    request("/api/v1/auth/forgot-password", {
      method: "POST",
      body: { email },
    }),

  resetPasswordWithToken: (payload: { token: string; new_password: string }) =>
    request("/api/v1/auth/reset-password-with-token", {
      method: "POST",
      body: payload,
    }),

  adminStatistics: () => request("/api/v1/admin/statistics"),
  adminMajorDistribution: () => request("/api/v1/admin/major-distribution"),
  adminPendingActions: () => request("/api/v1/admin/pending-actions"),

  adminCourses: () => request("/api/v1/admin/courses"),
  adminCourseByCode: (course_code: string) => request(`/api/v1/admin/courses/${course_code}`),
  adminCreateCourse: (payload: any) => request("/api/v1/admin/courses", { method: "POST", body: payload }),
  adminUpdateCourse: (courseCode: string, payload: any) =>
    request(`/api/v1/admin/courses/${encodeURIComponent(courseCode)}`, { method: "PUT", body: payload }),

  // --- Admin Announcements ---
  adminAnnouncements: () => request("/api/v1/admin/announcements"),

  adminCreateAnnouncement: (payload: {
    title: string;
    content: string;
    type?: "General" | "Urgent" | "Event" | "Academic";
    target_audience?: string;
    expiry_date?: string | null;
  }) => request("/api/v1/admin/announcements", { method: "POST", body: payload }),

  adminDeleteAnnouncement: (announcementId: string) =>
    request(`/api/v1/admin/announcements/${encodeURIComponent(announcementId)}`, { method: "DELETE" }),

  adminUpdateAnnouncement: (
    announcementId: string,
    payload: {
      title?: string;
      content?: string;
      type?: "General" | "Urgent" | "Event" | "Academic";
      target_audience?: string;
      expiry_date?: string | null;
    }
  ) =>
    request(`/api/v1/admin/announcements/${encodeURIComponent(announcementId)}`, {
      method: "PUT",
      body: payload,
    }),

  // --- Admin Messages ---
  adminMessages: () => request("/api/v1/admin/messages"),

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
};
