import type { ReactNode } from "react";
import { SCOPE_ATTR, SCOPE_THEME_SCRIPT, type Theme } from "@/lib/theme";
import { ThemeScopeSync } from "./ThemeScopeSync";

/**
 * Themed wrapper for a public page: the engineer's default theme unless the visitor chose one.
 * The inline script applies the choice before first paint; ThemeScopeSync re-applies it after
 * client-side navigation (React never runs scripts it renders on the client).
 */
export function ThemeScope({
  defaultTheme,
  className,
  children,
}: {
  defaultTheme: Theme;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={className}
      data-theme={defaultTheme}
      data-default-theme={defaultTheme}
      {...{ [SCOPE_ATTR]: "" }}
      suppressHydrationWarning
    >
      <script dangerouslySetInnerHTML={{ __html: SCOPE_THEME_SCRIPT }} suppressHydrationWarning />
      <ThemeScopeSync />
      {children}
    </div>
  );
}
