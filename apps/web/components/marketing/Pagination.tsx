import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

/** Page numbers to show: the first, the last, and a window around the current one, with gaps marked as null. */
export function pageWindow(current: number, pages: number, around = 1): (number | null)[] {
  const show = new Set([1, pages, ...Array.from({ length: around * 2 + 1 }, (_, i) => current - around + i)]);
  const numbers = [...show].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  const out: (number | null)[] = [];
  numbers.forEach((n, i) => {
    const previous = numbers[i - 1];
    if (previous !== undefined && n - previous > 1) out.push(null);
    out.push(n);
  });
  return out;
}

/** Previous / numbered / next links. Plain links, so every page of results has its own address. */
export function Pagination({ page, pages, href }: { page: number; pages: number; href: (page: number) => string }) {
  if (pages <= 1) return null;
  return (
    <nav className="mk-pager" aria-label="Pages of results">
      {page > 1 ? (
        <Link href={href(page - 1)} rel="prev" className="mk-pager-step">
          <ArrowLeft size={16} aria-hidden="true" /> Previous
        </Link>
      ) : (
        <span className="mk-pager-step is-off">
          <ArrowLeft size={16} aria-hidden="true" /> Previous
        </span>
      )}
      <ol>
        {pageWindow(page, pages).map((n, i) =>
          n === null ? (
            <li key={`gap-${i}`} aria-hidden="true" className="mk-pager-gap">
              …
            </li>
          ) : (
            <li key={n}>
              <Link href={href(n)} aria-current={n === page ? "page" : undefined} aria-label={`Page ${n}`}>
                {n}
              </Link>
            </li>
          ),
        )}
      </ol>
      {page < pages ? (
        <Link href={href(page + 1)} rel="next" className="mk-pager-step">
          Next <ArrowRight size={16} aria-hidden="true" />
        </Link>
      ) : (
        <span className="mk-pager-step is-off">
          Next <ArrowRight size={16} aria-hidden="true" />
        </span>
      )}
    </nav>
  );
}
