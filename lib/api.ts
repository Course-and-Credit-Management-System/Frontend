/// <reference types="vite/client" />

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

type RequestOptions = {
  method?: string;
  body?: any;
  auth?: boolean; // default true
};

function getToken() {
  return sessionStorage.getItem("access_token");
}

async function request(path: string, options: RequestOptions = {}) {
  const token = getToken();
  const useAuth = options.auth !== false; // default true

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // ✅ attach bearer token automatically
  if (useAuth && token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? "GET",
    headers,
    credentials: "include", // keep this (works for cookies too if you switch later)
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();
  let data: any;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const msg = data?.detail || data?.message || `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return data;
}

export const api = {
  login: (payload: { username: string; password: string; role: "admin" | "student" }) =>
    request("/api/v1/auth/login", { method: "POST", body: payload, auth: false }),

  me: () => request("/api/v1/auth/me"),

  // NOTE: your backend may not actually have /auth/logout yet.
  // If it doesn't, remove this or just clear sessionStorage on frontend.
  logout: async () => {
    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("role");
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("must_reset_password");
    return { message: "Logged out (client-side)" };
  },

  resetPassword: (payload: { old_password: string; new_password: string }) =>
    request("/api/v1/auth/reset-password", { method: "POST", body: payload }),

  // admin dashboard endpoints
  adminStatistics: () => request("/api/v1/admin/statistics"),
  adminMajorDistribution: () => request("/api/v1/admin/major-distribution"),
  adminPendingActions: () => request("/api/v1/admin/pending-actions"),
};
