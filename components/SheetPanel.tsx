import type { ReactNode } from "react";

/** Single drawing-sheet panel for simple screens (landing, sign-in, onboarding). */
export function SheetPanel({ sheet, title, children }: { sheet: string; title: string; children: ReactNode }) {
  return (
    <main className="sp-auth sp-grid-bg">
      <section className="sp-auth-panel" aria-labelledby="auth-title">
        <div className="sp-auth-head">
          <span className="sp-label">Sheetfolio</span>
          <span className="sp-label">Sheet {sheet}</span>
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
