import Link from "next/link";
import { FOOTER_COLUMNS } from "@/content/marketing";
import { Deco } from "./Deco";
import { MarketingButton } from "./MarketingButton";

export function MarketingFooter() {
  return (
    <footer className="mk-footer">
      <Deco kinds={["lines", "waves"]} tone="white" />
      <div className="mk-wrap">
        <div className="mk-footer-top">
          <div>
            <h2>Your work deserves a proper page</h2>
            <p>Create yours in a few minutes. It is free while we test, and no card is needed.</p>
          </div>
          <MarketingButton href="/signup">Create your page</MarketingButton>
        </div>
        <div className="mk-footer-grid">
          <div className="mk-footer-brand">
            <Link href="/" className="mk-brand">
              <span className="mk-brand-mark" aria-hidden="true">
                S
              </span>
              Sheetfolio
            </Link>
            <p>
              One link for your projects, your CV and your enquiries. Built for anyone whose work deserves a proper
              page.
            </p>
          </div>
          {FOOTER_COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title} className="mk-footer-col">
              <b>{col.title}</b>
              {col.links.map((l) => (
                <Link key={l.label} href={l.href}>
                  {l.label}
                </Link>
              ))}
            </nav>
          ))}
        </div>
        <div className="mk-footer-bar">
          <span>© {new Date().getFullYear()} Sheetfolio. All rights reserved.</span>
          <Link href="/privacy">Privacy policy</Link>
        </div>
      </div>
      <div className="mk-wordmark" aria-hidden="true">
        Sheetfolio
      </div>
    </footer>
  );
}
