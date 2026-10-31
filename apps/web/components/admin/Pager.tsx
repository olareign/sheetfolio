import Link from "next/link";
import { pageHref } from "@/lib/admin-query";

/** Previous and next links for a list, keeping the filters in the address. */
export function Pager({
  basePath,
  params,
  page,
  pages,
  total,
  noun,
}: {
  basePath: string;
  params: Record<string, string | undefined>;
  page: number;
  pages: number;
  total: number;
  noun: string;
}) {
  return (
    <nav className="ad-pager" aria-label="Pages">
      <span>
        {total.toLocaleString("en")} {noun}
        {pages > 1 && ` · page ${page + 1} of ${pages}`}
      </span>
      {pages > 1 && (
        <span className="ad-pager-links">
          {page > 0 ? (
            <Link className="sp-btn sp-btn--sm" href={pageHref(basePath, params, page - 1)} rel="prev">
              Previous
            </Link>
          ) : (
            <span className="sp-btn sp-btn--sm" aria-disabled="true">
              Previous
            </span>
          )}
          {page < pages - 1 ? (
            <Link className="sp-btn sp-btn--sm" href={pageHref(basePath, params, page + 1)} rel="next">
              Next
            </Link>
          ) : (
            <span className="sp-btn sp-btn--sm" aria-disabled="true">
              Next
            </span>
          )}
        </span>
      )}
    </nav>
  );
}
