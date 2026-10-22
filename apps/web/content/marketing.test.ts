import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { RESERVED_SLUGS } from "./schemas";
import { marketingImagePaths, NAV, PEOPLE, PROOF_FACES, QUOTES, STORIES } from "./marketing";

describe("marketing content", () => {
  it("only points at pictures that exist in /public", () => {
    const missing = marketingImagePaths().filter((p) => !existsSync(path.join(process.cwd(), "public", p)));
    expect(missing).toEqual([]);
  });

  it("marks every story and quote as a sample until it is replaced with a real one", () => {
    expect([...STORIES, ...QUOTES].filter((x) => !x.sample)).toEqual([]);
  });

  it("shows eight Black users to two white users in the testimonials, and in the early-user row", () => {
    const WHITE = new Set(["claire", "mark"]);
    const white = QUOTES.filter((q) => WHITE.has(q.person)).length;
    expect({ white, other: QUOTES.length - white }).toEqual({ white: 2, other: 8 });
    expect(PROOF_FACES.filter((p) => WHITE.has(p)).length).toBe(1);
    expect(PROOF_FACES.length).toBe(5);
  });

  it("gives every quote and story a known person", () => {
    for (const x of [...STORIES, ...QUOTES]) expect(PEOPLE[x.person]).toBeDefined();
  });

  it("keeps every page route out of the account address space", () => {
    for (const item of NAV) {
      const first = item.href.split("/")[1];
      if (first) expect(RESERVED_SLUGS.has(first)).toBe(true);
    }
  });
});
