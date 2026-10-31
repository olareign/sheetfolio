import { describe, expect, it } from "vitest";
import { activityQuery, contentQuery, leadsQuery, pageHref, pageOf, paginate, usersQuery } from "./admin-query";

describe("pageOf", () => {
  it("turns the 1-based page in the URL into a 0-based page, and distrusts anything else", () => {
    expect(pageOf({ page: "3" })).toBe(2);
    expect(pageOf({})).toBe(0);
    for (const bad of ["0", "-2", "1.5", "abc", "99999999", "", ["x"]]) expect(pageOf({ page: bad })).toBe(0);
    expect(pageOf({ page: ["2", "9"] })).toBe(1);
  });
});

describe("usersQuery", () => {
  it("keeps valid filters and drops invalid ones", () => {
    expect(usersQuery({ q: " ada ", plan: "pro", status: "live", role: "admin", page: "2" })).toEqual({
      q: "ada",
      plan: "pro",
      status: "live",
      role: "admin",
      page: 1,
    });
    expect(usersQuery({ plan: "gold", status: "deleted", role: "root", q: "" })).toEqual({
      q: undefined,
      plan: undefined,
      status: undefined,
      role: undefined,
      page: 0,
    });
  });

  it("caps how much search text it keeps", () => {
    expect(usersQuery({ q: "x".repeat(500) }).q).toHaveLength(100);
  });
});

describe("contentQuery, leadsQuery and activityQuery", () => {
  it("defaults to projects and ignores a collection that does not exist", () => {
    expect(contentQuery({}).collection).toBe("projects");
    expect(contentQuery({ c: "testimonials" }).collection).toBe("testimonials");
    expect(contentQuery({ c: "passwords" }).collection).toBe("projects");
  });

  it("only accepts a real page address", () => {
    expect(contentQuery({ slug: "ada-obi" }).slug).toBe("ada-obi");
    expect(contentQuery({ slug: "../etc/passwd" }).slug).toBeUndefined();
    expect(leadsQuery({ slug: "Bad Slug" }).slug).toBeUndefined();
  });

  it("reads the unread switch and the activity type", () => {
    expect(leadsQuery({ unread: "1" }).unreadOnly).toBe(true);
    expect(leadsQuery({ unread: "yes" }).unreadOnly).toBe(false);
    expect(activityQuery({ type: "lead" }).type).toBe("lead");
    expect(activityQuery({ type: "nope" }).type).toBeUndefined();
  });
});

describe("paginate and pageHref", () => {
  it("slices a list into pages and clamps a page that is too far", () => {
    const items = Array.from({ length: 60 }, (_, i) => i);
    expect(paginate(items, 0).rows).toHaveLength(25);
    expect(paginate(items, 2)).toMatchObject({ pages: 3, page: 2, total: 60 });
    expect(paginate(items, 2).rows).toHaveLength(10);
    expect(paginate(items, 99).page).toBe(2);
    expect(paginate([], 0)).toEqual({ rows: [], page: 0, pages: 1, total: 0 });
  });

  it("builds a link that keeps the filters and drops empty ones", () => {
    expect(pageHref("/admin/users", { q: "ada", plan: undefined }, 0)).toBe("/admin/users?q=ada");
    expect(pageHref("/admin/users", { q: "ada" }, 2)).toBe("/admin/users?q=ada&page=3");
    expect(pageHref("/admin/users", {}, 0)).toBe("/admin/users");
  });
});
