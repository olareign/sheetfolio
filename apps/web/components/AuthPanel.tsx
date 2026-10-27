import type { ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

/** Single centred card for simple screens (sign-in, onboarding, not-found). */
export function AuthPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="sp-auth">
      <section className="sp-auth-panel" aria-labelledby="auth-title">
        <div className="sp-auth-head">
          <Logo height={22} />
          <span className="sp-auth-head-end">
            <ThemeToggle />
          </span>
        </div>
        <div className="sp-auth-body">
          <h1 id="auth-title" className="sp-heading">
            {title}
          </h1>
          {children}
        </div>
      </section>
    </main>
  );
}
