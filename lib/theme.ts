/*
 * Light / dark mode. The design system's two themes are "sheet" (light) and "blueprint" (dark);
 * every colour is a token keyed by [data-theme], so switching is just setting that attribute.
 *
 * The viewer's explicit choice lives in localStorage (a per-browser convenience). Without one,
 * app screens follow the OS setting and public pages open in the engineer's chosen default.
 */

export type Theme = "sheet" | "blueprint";
export const THEME_KEY = "sf-theme";
export const THEME_EVENT = "sf-theme-change";
/** Elements whose theme follows the viewer's choice (public page wrappers). */
export const SCOPE_ATTR = "data-theme-scope";

export function isTheme(value: unknown): value is Theme {
  return value === "sheet" || value === "blueprint";
}

/** Viewer choice wins; otherwise the page's own default; otherwise the OS setting. */
export function resolveTheme(pref: Theme | null, fallback: Theme | undefined, systemDark: boolean): Theme {
  return pref ?? fallback ?? (systemDark ? "blueprint" : "sheet");
}

export function readPref(): Theme | null {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return isTheme(value) ? value : null;
  } catch {
    return null; // storage blocked (private mode, sandbox): behave as "no choice yet"
  }
}

/** Saves the choice, applies it to the page and every scope, and notifies subscribers. */
export function setPref(theme: Theme): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // not persisted, but still applied for this page view
  }
  document.documentElement.dataset.theme = theme;
  document.querySelectorAll<HTMLElement>(`[${SCOPE_ATTR}]`).forEach((el) => (el.dataset.theme = theme));
  window.dispatchEvent(new Event(THEME_EVENT));
}

export function subscribePref(onChange: () => void): () => void {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  window.addEventListener(THEME_EVENT, onChange);
  window.addEventListener("storage", onChange); // another tab changed it
  media.addEventListener("change", onChange);
  return () => {
    window.removeEventListener(THEME_EVENT, onChange);
    window.removeEventListener("storage", onChange);
    media.removeEventListener("change", onChange);
  };
}

export function systemPrefersDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/**
 * Inline script for <head>: sets the page theme before first paint (no flash).
 * Kept dependency-free because it runs before any bundle loads.
 */
export const ROOT_THEME_SCRIPT = `(function(){try{var p=localStorage.getItem("${THEME_KEY}");var t=(p==="sheet"||p==="blueprint")?p:(matchMedia("(prefers-color-scheme: dark)").matches?"blueprint":"sheet");document.documentElement.dataset.theme=t;}catch(e){}})();`;

/** Inline script placed first inside a scope: applies the viewer's choice to that wrapper before it paints. */
export const SCOPE_THEME_SCRIPT = `(function(){try{var p=localStorage.getItem("${THEME_KEY}");if(p==="sheet"||p==="blueprint"){document.currentScript.parentElement.dataset.theme=p;}}catch(e){}})();`;
