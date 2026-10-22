import Link from "next/link";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { MarketingNav } from "./MarketingNav";

export function MarketingHeader() {
  return (
    <header className="mk-header">
      <div className="mk-wrap mk-header-inner">
        <Link href="/" className="mk-brand">
          <span className="mk-brand-mark" aria-hidden="true">
            S
          </span>
          Sheetfolio
        </Link>
        <MarketingNav />
        <div className="mk-header-actions">
          <ThemeToggle />
          <Link href="/login" className="mk-signin">
            Sign in
          </Link>
          <Link href="/login" className="mk-btn mk-btn--primary mk-btn--sm">
            Create your page
          </Link>
        </div>
      </div>
    </header>
  );
}
