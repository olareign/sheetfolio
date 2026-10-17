import Link from "next/link";
import { publishedDate, revision } from "@/content/derive";
import type { PageContext } from "./view-model";

export function SiteFooter({ site }: PageContext) {
  return (
    <footer className="pp-footer">
      <div className="pp-wrap pp-footer-inner sp-label">
        <span>
          {site.publishedAt
            ? `Rev. ${revision(site.publishedAt)} · Last published ${publishedDate(site.publishedAt)}`
            : "Draft · not yet published"}
        </span>
        <Link href="/">Drawn on Sheetfolio</Link>
      </div>
    </footer>
  );
}
