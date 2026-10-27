import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { MobileMenu } from "@/components/MobileMenu";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { NAV } from "@/content/marketing";
import { MarketingNav } from "./MarketingNav";

export function MarketingHeader() {
  return (
    <header className="mk-header">
      <div className="mk-wrap mk-header-inner">
        <Link href="/" className="mk-brand">
          <Logo height={28} />
        </Link>
        <MarketingNav />
        <div className="mk-header-actions">
          <ThemeToggle />
          <Link href="/login" className="mk-signin">
            Sign in
          </Link>
          <Link href="/signup" className="mk-btn mk-btn--primary mk-btn--sm mk-header-cta">
            Create your page
          </Link>
          <MobileMenu
            className="mk-menu"
            links={NAV}
            footer={
              <>
                <Link href="/signup" className="mk-btn mk-btn--primary">
                  Create your page
                </Link>
                <Link href="/login" className="mk-btn mk-btn--ghost">
                  Sign in
                </Link>
              </>
            }
          />
        </div>
      </div>
    </header>
  );
}
