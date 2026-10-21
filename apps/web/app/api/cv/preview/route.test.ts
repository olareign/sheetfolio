import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PublishableSite, type Site } from "@/content/schemas";
import { pdfPages } from "@/test/pdf-text";

const state = vi.hoisted(() => ({
  email: undefined as string | undefined,
  account: undefined as unknown,
  draft: undefined as unknown,
}));
vi.mock("@/lib/auth", () => ({ auth: async () => (state.email ? { user: { email: state.email } } : null) }));
vi.mock("@/lib/accounts", () => ({ getUserRecord: async () => state.account }));
vi.mock("@/lib/site", () => ({ getDraft: async () => state.draft }));
vi.mock("@/lib/env", () => ({ env: () => ({ NEXT_PUBLIC_SITE_URL: "https://sheetfolio.example" }) }));

const { GET } = await import("./route");

const load = (summary?: string): Site => {
  const file = JSON.parse(readFileSync("seed/abdulrasaq.json", "utf8")) as { site: { profile: object } };
  const profile = summary ? { ...file.site.profile, summary } : file.site.profile;
  return PublishableSite.parse({ ...file.site, profile, updatedAt: "2026-10-21T00:00:00.000Z" });
};
const get = (query = "") => GET(new Request(`https://sheetfolio.example/api/cv/preview${query}`));
const textOf = async (res: Response) => (await pdfPages(Buffer.from(await res.arrayBuffer()))).join(" ");

beforeEach(() => {
  state.email = "Owner@Example.com";
  state.account = {
    id: "u1",
    slug: "taofeeq-abdulrasaq",
    role: "engineer",
    name: "A",
    createdAt: "2026-01-01T00:00:00.000Z",
  };
  state.draft = load();
});

describe("GET /api/cv/preview", () => {
  it("refuses a visitor who is not signed in", async () => {
    state.email = undefined;
    expect((await get()).status).toBe(401);
  });

  it("returns 404 for a signed-in person with no page or no draft", async () => {
    state.account = null;
    expect((await get()).status).toBe(404);
    state.account = { slug: "x" };
    state.draft = null;
    expect((await get()).status).toBe(404);
  });

  it("shows the saved DRAFT inline, private and uncached", async () => {
    state.draft = load("An unpublished draft sentence only the owner has written.");
    const res = await get("?template=classic");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    expect(res.headers.get("Content-Disposition")).toBe(
      'inline; filename="Abdulrasaq-Taofeeq-Olarewaju-CV-Classic.pdf"',
    );
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    expect(res.headers.get("X-Robots-Tag")).toBe("noindex");
    expect(await textOf(res)).toContain("An unpublished draft sentence");
  }, 60_000);

  it("previews any layout, even one the owner does not offer", async () => {
    const draft = load();
    draft.settings.cvTemplates = ["classic"];
    state.draft = draft;
    expect(await textOf(await get("?template=projects"))).toContain("SELECTED PROJECTS");
  }, 60_000);

  it("falls back to the owner's default layout for a missing or unknown template", async () => {
    const draft = load();
    draft.settings.cvTemplate = "minimal";
    state.draft = draft;
    for (const query of ["", "?template=fancy"]) {
      expect((await get(query)).headers.get("Content-Disposition")).toContain("-CV-Minimal.pdf");
    }
  }, 60_000);
});
