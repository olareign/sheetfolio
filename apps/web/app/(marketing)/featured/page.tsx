import type { Metadata } from "next";
import Link from "next/link";
import { FeaturedCard } from "@/components/marketing/FeaturedCard";
import { FeaturedFilters } from "@/components/marketing/FeaturedFilters";
import { MarketingButton } from "@/components/marketing/MarketingButton";
import { Pagination } from "@/components/marketing/Pagination";
import { CtaBand, PageHead, Section } from "@/components/marketing/Sections";
import { CATEGORY_LABELS } from "@/content/schemas";
import {
  FEATURED_MAX,
  featuredFacets,
  featuredHref,
  filterFeatured,
  isFiltered,
  paginate,
  parseFeaturedQuery,
} from "@/lib/featured-query";
import { getFeaturedUsersCached } from "@/lib/showcase";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const query = parseFeaturedQuery(await searchParams);
  return {
    title: "Featured",
    description: "Real Sheetfolio pages, ranked by how many people viewed them in the last 30 days.",
    // Every filter and page number is a different view of the same list: search engines index the list itself.
    alternates: { canonical: "/featured" },
    ...(isFiltered(query) && { robots: { index: false, follow: true } }),
  };
}

export default async function FeaturedPage({ searchParams }: Props) {
  const query = parseFeaturedQuery(await searchParams);
  // The ranking is computed once a minute (or when a page goes live) and shared; filtering a hundred rows is cheap.
  const ranked = await getFeaturedUsersCached(FEATURED_MAX);
  const rankOf = new Map(ranked.map((u, i) => [u.slug, i + 1]));
  const view = paginate(filterFeatured(ranked, query), query.page);
  const chips = [
    query.q && { label: `“${query.q}”`, href: featuredHref({ ...query, q: "", page: 1 }) },
    query.place && { label: query.place, href: featuredHref({ ...query, place: "", page: 1 }) },
    query.category && {
      label: CATEGORY_LABELS[query.category],
      href: featuredHref({ ...query, category: "", page: 1 }),
    },
  ].filter((c): c is { label: string; href: string } => Boolean(c));

  return (
    <>
      <PageHead
        eyebrow="Featured"
        title="Pages people are visiting"
        lead="Real Sheetfolio pages, most viewed first, counted over the last 30 days. Owners can leave this list any time in Settings."
      />
      <Section>
        {ranked.length > 0 ? (
          <>
            <FeaturedFilters query={query} facets={featuredFacets(ranked)} />
            <div className="mk-results-head" aria-live="polite">
              <p>
                {view.total === 0
                  ? "No pages match."
                  : `Showing ${view.from}–${view.to} of ${view.total} ${view.total === 1 ? "page" : "pages"}`}
              </p>
              {chips.length > 0 && (
                <ul className="mk-chips" aria-label="Active filters">
                  {chips.map((c) => (
                    <li key={c.label}>
                      <Link href={c.href} aria-label={`Remove filter ${c.label}`}>
                        {c.label} <span aria-hidden="true">×</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {view.items.length > 0 ? (
              <ul className="mk-cards mk-cards--fill mk-cards--results">
                {view.items.map((u) => (
                  <li key={u.slug}>
                    <FeaturedCard user={u} rank={rankOf.get(u.slug) ?? 0} />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mk-empty">
                <h2>Nothing matches those filters</h2>
                <p>Try a different word, or clear the filters to see every featured page.</p>
                <MarketingButton href={featuredHref({})}>Clear filters</MarketingButton>
              </div>
            )}
            <Pagination page={view.page} pages={view.pages} href={(page) => featuredHref({ ...query, page })} />
          </>
        ) : (
          <div className="mk-empty">
            <h2>Be the first featured page</h2>
            <p>Pages appear here once they are published. The most viewed come first.</p>
            <MarketingButton href="/signup">Create your page</MarketingButton>
          </div>
        )}
      </Section>
      <CtaBand />
    </>
  );
}
