import { describe, expect, it } from "vitest";
import type { FeaturedUser } from "./showcase";
import {
  featuredFacets,
  featuredHref,
  filterFeatured,
  paginate,
  parseFeaturedQuery,
  placeOf,
  type FeaturedQuery,
} from "./featured-query";

const user = (over: Partial<FeaturedUser> & Pick<FeaturedUser, "slug" | "name">): FeaturedUser => ({
  headline: "Engineer",
  location: "Lagos, Nigeria",
  cover: { url: "/x.jpg", alt: "", kind: "stock" },
  isPerson: false,
  views: 0,
  projectViews: 0,
  projects: 0,
  categories: [],
  publishedAt: "2026-10-01T00:00:00.000Z",
  ...over,
});

const base: FeaturedQuery = { q: "", place: "", category: "", sort: "views", page: 1 };

const users = [
  user({
    slug: "ada",
    name: "Ada Obi",
    headline: "Site Engineer",
    categories: ["building", "road"],
    projects: 5,
    publishedAt: "2026-10-03T00:00:00.000Z",
  }),
  user({
    slug: "kofi",
    name: "Kofi Mensah",
    location: "Accra, Ghana",
    categories: ["education"],
    projects: 2,
    publishedAt: "2026-10-05T00:00:00.000Z",
  }),
  user({
    slug: "zed",
    name: "Zed Ali",
    headline: "Nurse",
    location: "Lagos, nigeria",
    categories: ["healthcare"],
    projects: 9,
    publishedAt: "2026-10-01T00:00:00.000Z",
  }),
];

describe("parseFeaturedQuery", () => {
  it("reads filters and ignores anything invalid", () => {
    expect(parseFeaturedQuery({ q: "  ada ", place: "Nigeria", category: "road", sort: "new", page: "3" })).toEqual({
      q: "ada",
      place: "Nigeria",
      category: "road",
      sort: "new",
      page: 3,
    });
    expect(parseFeaturedQuery({ category: "nonsense", sort: "random", page: "-4" })).toEqual(base);
    expect(parseFeaturedQuery({ page: "abc" }).page).toBe(1);
    expect(parseFeaturedQuery({ q: ["first", "second"] }).q).toBe("first");
  });

  it("caps the search text", () => {
    expect(parseFeaturedQuery({ q: "x".repeat(500) }).q).toHaveLength(60);
  });
});

describe("placeOf", () => {
  it("is the country, or the whole place when there is no comma", () => {
    expect(placeOf("Ilorin, Kwara State, Nigeria")).toBe("Nigeria");
    expect(placeOf("Accra")).toBe("Accra");
    expect(placeOf("")).toBe("");
  });
});

describe("filterFeatured", () => {
  it("keeps the ranking order by default", () => {
    expect(filterFeatured(users, base).map((u) => u.slug)).toEqual(["ada", "kofi", "zed"]);
  });

  it("searches name, headline, place and address, ignoring case", () => {
    expect(filterFeatured(users, { ...base, q: "NURSE" }).map((u) => u.slug)).toEqual(["zed"]);
    expect(filterFeatured(users, { ...base, q: "accra" }).map((u) => u.slug)).toEqual(["kofi"]);
    expect(filterFeatured(users, { ...base, q: "kofi" }).map((u) => u.slug)).toEqual(["kofi"]);
  });

  it("filters by country without caring about case, and by project type", () => {
    expect(filterFeatured(users, { ...base, place: "Nigeria" }).map((u) => u.slug)).toEqual(["ada", "zed"]);
    expect(filterFeatured(users, { ...base, category: "road" }).map((u) => u.slug)).toEqual(["ada"]);
    expect(filterFeatured(users, { ...base, place: "Nigeria", category: "healthcare" }).map((u) => u.slug)).toEqual([
      "zed",
    ]);
  });

  it("sorts by newest or by number of projects without changing the input", () => {
    expect(filterFeatured(users, { ...base, sort: "new" }).map((u) => u.slug)).toEqual(["kofi", "ada", "zed"]);
    expect(filterFeatured(users, { ...base, sort: "projects" }).map((u) => u.slug)).toEqual(["zed", "ada", "kofi"]);
    expect(users.map((u) => u.slug)).toEqual(["ada", "kofi", "zed"]);
  });

  it("returns nothing when nothing matches", () => {
    expect(filterFeatured(users, { ...base, q: "nobody" })).toEqual([]);
  });
});

describe("paginate", () => {
  const items = Array.from({ length: 45 }, (_, i) => i + 1);

  it("slices 20 at a time and reports where it is", () => {
    const p = paginate(items, 2);
    expect(p.items).toEqual(items.slice(20, 40));
    expect(p).toMatchObject({ page: 2, pages: 3, total: 45, from: 21, to: 40 });
    expect(paginate(items, 3).items).toHaveLength(5);
  });

  it("lands on the last page for a number past the end, and the first for a bad one", () => {
    expect(paginate(items, 99).page).toBe(3);
    expect(paginate(items, 0).page).toBe(1);
  });

  it("handles an empty list", () => {
    expect(paginate([], 1)).toEqual({ items: [], page: 1, pages: 1, total: 0, from: 0, to: 0 });
  });
});

describe("featuredFacets", () => {
  it("counts countries (merging case) and project types, most common first", () => {
    const f = featuredFacets(users);
    expect(f.places).toEqual([
      { name: "Nigeria", count: 2 },
      { name: "Ghana", count: 1 },
    ]);
    expect(f.categories.map((c) => [c.value, c.count])).toEqual([
      ["building", 1],
      ["education", 1],
      ["healthcare", 1],
      ["road", 1],
    ]);
  });
});

describe("featuredHref", () => {
  it("leaves out defaults and keeps the rest", () => {
    expect(featuredHref({})).toBe("/featured");
    expect(featuredHref({ ...base, page: 1 })).toBe("/featured");
    expect(featuredHref({ q: "ada", place: "Nigeria", category: "road", sort: "new", page: 2 })).toBe(
      "/featured?q=ada&place=Nigeria&category=road&sort=new&page=2",
    );
  });
});
