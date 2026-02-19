export type ThemeMode = "light" | "dark";

export const THEME_STORAGE_KEY = "ui_theme_mode";

export function getStoredTheme(): ThemeMode | null {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value === "dark" || value === "light" ? value : null;
  } catch {
    return null;
  }
}

export function getPreferredTheme(): ThemeMode {
  const stored = getStoredTheme();
  if (stored) return stored;
  if (typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

export function applyTheme(mode: ThemeMode) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", mode === "dark");
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {}
  window.dispatchEvent(new CustomEvent("themechange", { detail: mode }));
}

export function toggleTheme(): ThemeMode {
  const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
  const next: ThemeMode = isDark ? "light" : "dark";
  applyTheme(next);
  return next;
}
