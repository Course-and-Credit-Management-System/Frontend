const rawApiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "").trim();

const isLoopbackApiUrl = /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?\/?$/i.test(rawApiBaseUrl);

// In local Vite dev, prefer the same-origin proxy so credentialed requests avoid CORS issues.
export const API_BASE_URL =
  rawApiBaseUrl && !(import.meta.env.DEV && isLoopbackApiUrl)
    ? rawApiBaseUrl.replace(/\/$/, "")
    : "";
