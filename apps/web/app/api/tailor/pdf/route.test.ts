import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptySite, Site } from "@/content/schemas";
import { overlayFromSite, type TailorOverlay } from "@/content/tailor";

const base = createEmptySite({
  name: "Ada Obi",
  firstName: "Ada",
  headline: "Software Engineer",
  publicEmail: "ada@example.com",
  now: new Date("2026-10-01T10:00:00.000Z"),
});
const site = Site.parse({
  ...base,
  profile: { ...base.profile, summary: "Builds web products.", location: "Lagos" },
  experiences: [{ id: "e1", company: "Acme", role: "Frontend Engineer", startYear: 2022, notes: "Built it." }],
});
const overlay: TailorOverlay = { ...overlayFromSite(site), headline: "Frontend Engineer" };

const state = vi.hoisted(() => ({
  email: "ada@example.com" as string | null,
  slug: "ada-obi" as string | null,
  saved: new Map<string, unknown>(),
}));
vi.mock("@/lib/auth", () => ({ auth: async () => (state.email ? { user: { email: state.email } } : null) }));
vi.mock("@/lib/accounts", () => ({ getUserRecord: async () => (state.slug ? { slug: state.slug } : null) }));
vi.mock("@/lib/site", () => ({ getDraft: async () => site }));
vi.mock("@/lib/store", () => ({
  tailored: () => ({ get: async (_slug: string, id: string) => state.saved.get(id) ?? null }),
}));

const { POST } = await import("./route");
const post = (body: unknown) =>
  POST(new Request("https://dosinex.example/api/tailor/pdf", { method: "POST", body: JSON.stringify(body) }));

beforeEach(() => {
  state.email = "ada@example.com";
  state.slug = "ada-obi";
  state.saved.clear();
});

describe("POST /api/tailor/pdf", () => {
  it("renders a version that is still being reviewed", async () => {
    const res = await post({ overlay, label: "Frontend", template: "modern" });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(res.headers.get("content-disposition")).toBe('attachment; filename="Ada-Obi-CV-Frontend.pdf"');
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(new TextDecoder().decode((await res.arrayBuffer()).slice(0, 5))).toBe("%PDF-");
  }, 60_000);

  it("renders a saved version under its own name", async () => {
    state.saved.set("v1", { id: "v1", name: "Backend", overlay });
    const res = await post({ id: "v1", template: "classic" });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-disposition")).toContain("Ada-Obi-CV-Backend.pdf");
  }, 60_000);

  it("needs a signed-in owner", async () => {
    state.email = null;
    expect((await post({ overlay })).status).toBe(401);
  });

  it("will not render a version that is not there", async () => {
    expect((await post({ id: "ghost" })).status).toBe(404);
  });

  it("refuses an overlay that does not read", async () => {
    expect((await post({ overlay: { headline: 5 } })).status).toBe(400);
    expect((await post("nope")).status).toBe(400);
  });
});
