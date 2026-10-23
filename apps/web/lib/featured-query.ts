import { CATEGORY_LABELS, type Category } from "@/content/schemas";
import type { FeaturedUser } from "./showcase";

/** How many ranked pages the Featured list holds, and how many show on one page of it. */
export const FEATURED_MAX = 100;
export const FEATURED_PAGE_SIZE = 20;

export const SORTS = ["views", "new", "projects"] as const;
export type FeaturedSort = (typeof SORTS)[number];
export const SORT_LABELS: Record<FeaturedSort, string> = {
  views: "Most viewed",
  new: "Newest",
  projects: "Most projects",
};

export type FeaturedQuery = { q: string; place: string; category: Category | ""; sort: FeaturedSort; page: number };

type Params = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined): string => (Array.isArray(v) ? (v[0] ?? "") : (v ?? ""));

/** Reads the address bar's filters. Anything unknown or out of range falls back to the default, so a bad link still works. */
export function parseFeaturedQuery(params: Params): FeaturedQuery {
  const category = first(params.category);
  const sort = first(params.sort);
  const page = Number.parseInt(first(params.page), 10);
  return {
    q: first(params.q).trim().slice(0, 60),
    place: first(params.place).trim().slice(0, 60),
    category: category in CATEGORY_LABELS ? (category as Category) : "",
    sort: (SORTS as readonly string[]).includes(sort) ? (sort as FeaturedSort) : "views",
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

/** The country (or the whole place when there is no comma): "Lagos, Nigeria" → "Nigeria". */
export function placeOf(location: string): string {
  const parts = location
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return parts[parts.length - 1] ?? "";
}

const norm = (s: string) => s.trim().toLowerCase();

export function filterFeatured(users: readonly FeaturedUser[], query: FeaturedQuery): FeaturedUser[] {
  const q = norm(query.q);
  const matches = users.filter((u) => {
    if (q && !norm(`${u.name} ${u.headline} ${u.location} ${u.slug}`).includes(q)) return false;
    if (query.place && norm(placeOf(u.location)) !== norm(query.place)) return false;
    if (query.category && !u.categories.includes(query.category)) return false;
    return true;
  });
  // `users` arrives ranked by views; "views" keeps that order, the others re-sort a copy.
  if (query.sort === "new")
    return [...matches].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.name.localeCompare(b.name));
  if (query.sort === "projects")
    return [...matches].sort((a, b) => b.projects - a.projects || a.name.localeCompare(b.name));
  return matches;
}

export type Page<T> = { items: T[]; page: number; pages: number; total: number; from: number; to: number };

/** One page of a list. A page number past the end lands on the last page instead of an empty one. */
export function paginate<T>(items: readonly T[], page: number, size = FEATURED_PAGE_SIZE): Page<T> {
  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / size));
  const current = Math.min(Math.max(1, page), pages);
  const start = (current - 1) * size;
  return {
    items: items.slice(start, start + size),
    page: current,
    pages,
    total,
    from: total === 0 ? 0 : start + 1,
    to: Math.min(total, start + size),
  };
}

export type Facets = {
  places: { name: string; count: number }[];
  categories: { value: Category; label: string; count: number }[];
};

/** The choices for the filter menus, counted over the whole ranked list so they do not shrink as you filter. */
export function featuredFacets(users: readonly FeaturedUser[]): Facets {
  const places = new Map<string, { name: string; count: number }>();
  const cats = new Map<Category, number>();
  for (const u of users) {
    const place = placeOf(u.location);
    if (place) {
      const entry = places.get(norm(place)) ?? { name: place, count: 0 };
      entry.count += 1;
      places.set(norm(place), entry);
    }
    for (const c of u.categories) cats.set(c, (cats.get(c) ?? 0) + 1);
  }
  return {
    places: [...places.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, 40),
    categories: [...cats.entries()]
      .map(([value, count]) => ({ value, label: CATEGORY_LABELS[value], count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
  };
}

/** The address for a view of the list, leaving out everything that is just the default. */
export function featuredHref(query: Partial<FeaturedQuery>): string {
  const p = new URLSearchParams();
  if (query.q) p.set("q", query.q);
  if (query.place) p.set("place", query.place);
  if (query.category) p.set("category", query.category);
  if (query.sort && query.sort !== "views") p.set("sort", query.sort);
  if (query.page && query.page > 1) p.set("page", String(query.page));
  const qs = p.toString();
  return qs ? `/featured?${qs}` : "/featured";
}

/** True when the view is anything other than the plain first page of the ranking. */
export function isFiltered(query: FeaturedQuery): boolean {
  return Boolean(query.q || query.place || query.category || query.sort !== "views" || query.page > 1);
}
