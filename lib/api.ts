/// <reference types="vite/client" />

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

type RequestOptions = {
  method?: string;
  body?: any;
};

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

  adminStatistics: () => request("/api/v1/admin/statistics"),
  adminMajorDistribution: () => request("/api/v1/admin/major-distribution"),
  adminPendingActions: () => request("/api/v1/admin/pending-actions"),
};
