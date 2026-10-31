import { CollectionNameSchema, Slug, UserPlan, type CollectionName } from "../content/schemas";
import { ACTIVITY_TYPES, type ActivityType } from "./activity-types";

/*
 * Reading an admin page's filters from its URL. Everything comes in as text a person can edit, so each value is checked
 * and anything unrecognised is dropped rather than trusted. Pure and free of server code, so it is easy to test.
 */

export type SearchParams = Record<string, string | string[] | undefined>;

export const PAGE_SIZE = 25;

const first = (value: string | string[] | undefined): string | undefined =>
  (Array.isArray(value) ? value[0] : value)?.trim() || undefined;

const text = (value: string | string[] | undefined, max = 100): string | undefined => first(value)?.slice(0, max);

/** The URL's page is 1-based; the code's is 0-based. Anything that is not a positive whole number is the first page. */
export function pageOf(sp: SearchParams): number {
  const n = Number(first(sp.page));
  return Number.isInteger(n) && n >= 1 && n <= 10_000 ? n - 1 : 0;
}

const slugOf = (value: string | string[] | undefined) => {
  const parsed = Slug.safeParse(first(value));
  return parsed.success ? parsed.data : undefined;
};

const STATUSES = ["live", "changes", "unpublished", "suspended"] as const;
export type StatusFilter = (typeof STATUSES)[number];

export function usersQuery(sp: SearchParams) {
  const status = first(sp.status);
  const role = first(sp.role);
  const plan = UserPlan.safeParse(first(sp.plan));
  return {
    q: text(sp.q),
    plan: plan.success ? plan.data : undefined,
    status: STATUSES.find((s) => s === status),
    role: role === "admin" || role === "engineer" ? role : undefined,
    page: pageOf(sp),
  } as const;
}

export function contentQuery(sp: SearchParams): {
  collection: CollectionName;
  q?: string;
  slug?: string;
  page: number;
} {
  const collection = CollectionNameSchema.safeParse(first(sp.c));
  return {
    collection: collection.success ? collection.data : "projects",
    q: text(sp.q),
    slug: slugOf(sp.slug),
    page: pageOf(sp),
  };
}

export function leadsQuery(sp: SearchParams) {
  return { q: text(sp.q), slug: slugOf(sp.slug), unreadOnly: first(sp.unread) === "1", page: pageOf(sp) };
}

export function activityQuery(sp: SearchParams): { type?: ActivityType; slug?: string; page: number } {
  const type = first(sp.type);
  return { type: ACTIVITY_TYPES.find((t) => t === type), slug: slugOf(sp.slug), page: pageOf(sp) };
}

export function paginate<T>(items: readonly T[], page: number, size: number = PAGE_SIZE) {
  const pages = Math.max(1, Math.ceil(items.length / size));
  const safe = Math.min(page, pages - 1);
  return { rows: items.slice(safe * size, safe * size + size), page: safe, pages, total: items.length };
}

/** A link to another page of the same list, keeping the filters. */
export function pageHref(basePath: string, params: Record<string, string | undefined>, page: number): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) query.set(key, value);
  if (page > 0) query.set("page", String(page + 1));
  const qs = query.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
