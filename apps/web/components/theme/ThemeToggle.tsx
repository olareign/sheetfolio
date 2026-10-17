"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { readPref, resolveTheme, setPref, subscribePref, systemPrefersDark, type Theme } from "@/lib/theme";

/** Sun/moon switch between the light (sheet) and dark (blueprint) themes. */
export function ThemeToggle({ fallback, className }: { fallback?: Theme; className?: string }) {
  const pref = useSyncExternalStore(subscribePref, readPref, () => null);
  const systemDark = useSyncExternalStore(subscribePref, systemPrefersDark, () => false);
  const current = resolveTheme(pref, fallback, systemDark);
  const next: Theme = current === "blueprint" ? "sheet" : "blueprint";
  const label = next === "blueprint" ? "Switch to dark mode" : "Switch to light mode";

  return (
    <button
      type="button"
      className={["sp-btn sp-btn--ghost sp-btn--sm sp-theme-toggle", className].filter(Boolean).join(" ")}
      onClick={() => setPref(next)}
      aria-label={label}
      title={label}
    >
      {current === "blueprint" ? (
        <Sun size={18} strokeWidth={1.5} aria-hidden="true" />
      ) : (
        <Moon size={18} strokeWidth={1.5} aria-hidden="true" />
      )}
    </button>
  );
}
