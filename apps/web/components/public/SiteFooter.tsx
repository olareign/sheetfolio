import Link from "next/link";
import { publishedDate } from "@/content/derive";
import type { PageContext } from "./view-model";

export function SiteFooter({ site }: PageContext) {
  return (
    <footer className="pp-footer">
      <div className="pp-wrap pp-footer-inner sp-label">
        <span>
          {site.publishedAt
            ? `Last published ${publishedDate(site.publishedAt)}`
            : "Draft · not yet published"}
        </span>
        <Link href="/">Made with Dosinex</Link>
      </div>
    </footer>
  );
}
