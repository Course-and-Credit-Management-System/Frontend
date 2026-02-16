const baseURL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000").replace(/\/$/, "");

async function request(path: string, init?: RequestInit) {
  try {
    const res = await fetch(`${baseURL}${path}`, {
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
      ...init,
    });
    const text = await res.text();
    let data: any;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }
    if (!res.ok) {
      const msg = data?.detail || data?.message || "Request failed";
      const e: any = new Error(msg);
      e.response = { status: res.status, data };
      throw e;
    }
    return { data, status: res.status };
  } catch (err: any) {
    if (!err.response) {
      err.message = "Failed to connect to server";
    }
    throw err;
  }
}

export const http = {
  get: (path: string) => request(path, { method: "GET" }),
  post: (path: string, body?: any) =>
    request(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: (path: string, body?: any) =>
    request(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  delete: (path: string) => request(path, { method: "DELETE" }),
};
