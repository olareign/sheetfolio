import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { RESERVED_SLUGS } from "./schemas";
import { FOOTER_COLUMNS, marketingImagePaths, NAV, USE_CASES } from "./marketing";

describe("marketing content", () => {
  it("only points at pictures that exist in /public", () => {
    const missing = marketingImagePaths().filter((p) => !existsSync(path.join(process.cwd(), "public", p)));
    expect(missing).toEqual([]);
  });

  it("keeps every page route out of the account address space", () => {
    for (const item of NAV) {
      const first = item.href.split("/")[1];
      if (first) expect(RESERVED_SLUGS.has(first)).toBe(true);
    }
    expect(RESERVED_SLUGS.has("privacy")).toBe(true);
  });

  it("describes groups of people, never an invented person, quote or result", () => {
    for (const u of USE_CASES) {
      expect(`${u.title} ${u.text}`).not.toMatch(/\d+ (enquiries|new clients|interview calls)/i);
      expect(u.puts.length).toBeGreaterThan(0);
    }
  });

  it("does not link to the hidden pricing page", () => {
    const navHrefs: string[] = NAV.map((n) => n.href);
    expect(navHrefs).not.toContain("/pricing");
    const footerHrefs = FOOTER_COLUMNS.flatMap((c) => c.links.map((l): string => l.href));
    expect(footerHrefs.some((h) => h.startsWith("/pricing"))).toBe(false);
  });
});
