"use client";

import Link from "next/link";
import { useRef } from "react";
import { SORT_LABELS, SORTS, featuredHref, type Facets, type FeaturedQuery } from "@/lib/featured-query";

/**
 * The Featured list's search and filters. It is an ordinary GET form, so it works without JavaScript (press Search);
 * with JavaScript, changing a menu applies it straight away. The address always shows the view, so it can be shared.
 */
export function FeaturedFilters({ query, facets }: { query: FeaturedQuery; facets: Facets }) {
  const form = useRef<HTMLFormElement>(null);
  const apply = () => form.current?.requestSubmit();
  const active = Boolean(query.q || query.place || query.category || query.sort !== "views");

  return (
    <form ref={form} method="get" action="/featured" className="mk-ff" role="search" aria-label="Filter featured pages">
      <label className="mk-ff-field mk-ff-search">
        <span>Search</span>
        <input
          type="search"
          name="q"
          defaultValue={query.q}
          placeholder="Name, job, place…"
          maxLength={60}
          autoComplete="off"
        />
      </label>
      <label className="mk-ff-field">
        <span>Country</span>
        <select name="place" defaultValue={query.place} onChange={apply}>
          <option value="">All countries</option>
          {facets.places.map((p) => (
            <option key={p.name} value={p.name}>
              {p.name} ({p.count})
            </option>
          ))}
        </select>
      </label>
      <label className="mk-ff-field">
        <span>Project type</span>
        <select name="category" defaultValue={query.category} onChange={apply}>
          <option value="">All types</option>
          {facets.categories.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label} ({c.count})
            </option>
          ))}
        </select>
      </label>
      <label className="mk-ff-field">
        <span>Sort by</span>
        <select name="sort" defaultValue={query.sort} onChange={apply}>
          {SORTS.map((s) => (
            <option key={s} value={s}>
              {SORT_LABELS[s]}
            </option>
          ))}
        </select>
      </label>
      <div className="mk-ff-actions">
        <button type="submit" className="mk-btn mk-btn--primary mk-btn--sm">
          Search
        </button>
        {active && (
          <Link href={featuredHref({})} className="mk-ff-clear">
            Clear
          </Link>
        )}
      </div>
    </form>
  );
}
