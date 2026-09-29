"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";
import { isTheme, readPref, SCOPE_ATTR, subscribePref } from "@/lib/theme";

/** Keeps every theme scope on the viewer's choice (or its own default) across navigations. */
export function ThemeScopeSync() {
  const pref = useSyncExternalStore(subscribePref, readPref, () => null);
  useLayoutEffect(() => {
    // Read storage directly: during hydration `pref` is the server snapshot (null), and using it
    // would flash the default theme for a frame before the real choice is re-applied.
    const choice = readPref();
    document.querySelectorAll<HTMLElement>(`[${SCOPE_ATTR}]`).forEach((el) => {
      const fallback = el.dataset.defaultTheme;
      el.dataset.theme = choice ?? (isTheme(fallback) ? fallback : "sheet");
    });
  }, [pref]);
  return null;
}
