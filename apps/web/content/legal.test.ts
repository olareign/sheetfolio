import { describe, expect, it } from "vitest";
import { FOOTER_COLUMNS } from "./marketing";
import { PRIVACY, PRIVACY_UPDATED } from "./privacy";
import { RESERVED_SLUGS } from "./schemas";
import { TERMS, TERMS_UPDATED } from "./terms";

describe.each([
  ["privacy policy", PRIVACY, PRIVACY_UPDATED],
  ["terms of service", TERMS, TERMS_UPDATED],
])("the %s", (_name, sections, updated) => {
  it("has sections with unique ids, titles and some text", () => {
    const ids = sections.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).not.toContain("contact"); // the page adds its own contact section with that id
    for (const s of sections) {
      expect(s.title.trim()).not.toBe("");
      expect(s.blocks.length).toBeGreaterThan(0);
    }
  });

  it("is dated, in the form the other pages use", () => {
    expect(updated).toMatch(/^\d{1,2} [A-Z][a-z]+ 20\d\d$/);
  });
});

describe("agreeing at sign-up", () => {
  it("is covered by both documents", () => {
    expect(PRIVACY.some((s) => s.id === "agreement")).toBe(true);
    expect(TERMS.some((s) => s.id === "agreeing")).toBe(true);
  });

  it("links to both documents from the site footer, and keeps their addresses for the site itself", () => {
    const hrefs = FOOTER_COLUMNS.flatMap((c) => c.links.map((l): string => l.href));
    expect(hrefs).toContain("/terms");
    expect(hrefs).toContain("/privacy");
    expect(RESERVED_SLUGS.has("terms")).toBe(true);
    expect(RESERVED_SLUGS.has("privacy")).toBe(true);
  });
});
