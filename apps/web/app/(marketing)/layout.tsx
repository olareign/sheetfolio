import type { ReactNode } from "react";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import "@/styles/marketing.css";

/** The public marketing site: Home, Product, Examples, Stories and Pricing share this frame. */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mk">
      <a href="#main" className="mk-skip">
        Skip to content
      </a>
      <MarketingHeader />
      <main id="main">{children}</main>
      <MarketingFooter />
    </div>
  );
}
