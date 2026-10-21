import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PublishableSite, type Site } from "@/content/schemas";
import { pdfPages } from "@/test/pdf-text";

const state = vi.hoisted(() => ({ site: null as unknown }));
vi.mock("@/lib/site", () => ({ getPublished: async () => state.site }));
vi.mock("@/lib/env", () => ({ env: () => ({ NEXT_PUBLIC_SITE_URL: "https://sheetfolio.example" }) }));

const { GET } = await import("./route");

const PUBLISHED_AT = "2026-10-21T10:00:00.000Z";
function site(over: Partial<Site["settings"]> = {}): Site {
  const file = JSON.parse(readFileSync("seed/abdulrasaq.json", "utf8")) as { site: { settings?: object } };
  return PublishableSite.parse({
    ...file.site,
    settings: { ...file.site.settings, ...over },
    updatedAt: PUBLISHED_AT,
    publishedAt: PUBLISHED_AT,
  });
}
const get = (query = "") =>
  GET(new Request(`https://sheetfolio.example/api/cv/taofeeq-abdulrasaq${query}`), {
    params: Promise.resolve({ slug: "taofeeq-abdulrasaq" }),
  });
const textOf = async (res: Response) => (await pdfPages(Buffer.from(await res.arrayBuffer()))).join(" ");

beforeEach(() => {
  state.site = site();
});

describe("GET /api/cv/[slug]", () => {
  it("serves a PDF download named for the person and the layout", async () => {
    const res = await get("?template=classic");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    expect(res.headers.get("Content-Disposition")).toBe(
      'attachment; filename="Abdulrasaq-Taofeeq-Olarewaju-CV-Classic.pdf"',
    );
  }, 60_000);

  it("uses the layout asked for in ?template= when the owner offers it", async () => {
    const projectsFirst = await textOf(await get("?template=projects"));
    expect(projectsFirst).toContain("SELECTED PROJECTS");
    const classic = await textOf(await get("?template=classic"));
    expect(classic).not.toContain("SELECTED PROJECTS");
  }, 60_000);

  it("serves the owner's default when no template is given", async () => {
    state.site = site({ cvTemplate: "projects" });
    expect(await textOf(await get())).toContain("SELECTED PROJECTS");
    state.site = site({ cvTemplate: "classic" });
    expect(await textOf(await get())).not.toContain("SELECTED PROJECTS");
  }, 60_000);

  it("never serves a layout the owner did not choose to offer, falling back to their default", async () => {
    state.site = site({ cvTemplates: ["classic", "minimal"], cvTemplate: "classic" });
    const res = await get("?template=projects");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Disposition")).toContain("-CV-Classic.pdf");
    expect(await textOf(res)).not.toContain("SELECTED PROJECTS");

    // ...while one they do offer is still served.
    expect((await get("?template=minimal")).headers.get("Content-Disposition")).toContain("-CV-Minimal.pdf");
  }, 60_000);

  it.each(["fancy", "", "CLASSIC", "../../etc/passwd"])(
    "treats the unknown template %j as the owner's default",
    async (bad) => {
      const res = await get(`?template=${encodeURIComponent(bad)}`);
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Disposition")).toContain("-CV-Modern.pdf"); // the seed's default
    },
    60_000,
  );

  it("links the portfolio page in the CV using the configured site address", async () => {
    expect(await textOf(await get())).toContain("sheetfolio.example/taofeeq-abdulrasaq");
  }, 60_000);

  it("caches the current version forever, and anything else briefly", async () => {
    const current = await get(`?v=${encodeURIComponent(PUBLISHED_AT)}`);
    expect(current.headers.get("Cache-Control")).toBe("public, max-age=31536000, immutable");
    const stale = await get("?v=2020-01-01T00:00:00.000Z");
    expect(stale.headers.get("Cache-Control")).toBe("public, max-age=0, s-maxage=300");
  }, 60_000);

  it("returns 404 when the page is not published", async () => {
    state.site = null;
    expect((await get()).status).toBe(404);
  });
});
