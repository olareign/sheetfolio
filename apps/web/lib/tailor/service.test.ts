import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptySite, Site } from "@/content/schemas";
import { overlayFromSite, type TailorOverlay } from "@/content/tailor";
import { FakeRedis } from "@/test/fake-redis";
import { seedPage } from "@/test/pages";

const state = vi.hoisted(() => ({ redis: undefined as unknown }));
vi.mock("@/lib/redis", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/redis")>();
  return { ...actual, redis: () => state.redis };
});
vi.mock("next/cache", () => ({ unstable_cache: <T>(fn: () => Promise<T>) => fn, revalidateTag: vi.fn() }));

const {
  applyTailored,
  deleteTailored,
  discardUndo,
  listTailored,
  saveTailored,
  tailoredUndo,
  undoApply,
  updateTailored,
} = await import("./service");
const { getDraft, SiteError } = await import("@/lib/site");

const SLUG = "ada-obi";
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
  competencies: ["React", "Node.js"],
  experiences: [
    { id: "e1", company: "Acme", role: "Frontend Engineer", startYear: 2022, notes: "Built the dashboard." },
    { id: "e2", company: "Beta", role: "Backend Engineer", startYear: 2020, endYear: 2022, notes: "Wrote APIs." },
  ],
});

const backend = (): TailorOverlay => ({
  headline: "Backend Engineer",
  summary: "Designs reliable APIs.",
  competencies: ["Node.js"],
  experiences: [{ id: "e2", notes: "Wrote APIs for shops." }],
  projects: [],
  certifications: [],
});

beforeEach(async () => {
  state.redis = new FakeRedis();
  await seedPage(SLUG, { draft: site });
});

describe("saving versions", () => {
  it("keeps up to three and then says so", async () => {
    for (const n of ["Front", "Back", "Full"]) await saveTailored(SLUG, { name: n, overlay: backend() });
    await expect(saveTailored(SLUG, { name: "Fourth", overlay: backend() })).rejects.toThrow(/already have 3/);
    expect(await listTailored(SLUG)).toHaveLength(3);
  });

  it("needs a name", async () => {
    await expect(saveTailored(SLUG, { name: "  ", overlay: backend() })).rejects.toBeInstanceOf(SiteError);
  });

  it("refuses an overlay that does not fit the page's limits", async () => {
    await expect(
      saveTailored(SLUG, { name: "x", overlay: { ...backend(), headline: "H".repeat(200) } }),
    ).rejects.toBeInstanceOf(SiteError);
  });

  it("forgets ids the page does not have", async () => {
    const saved = await saveTailored(SLUG, {
      name: "x",
      overlay: {
        ...backend(),
        experiences: [
          { id: "e2", notes: "a" },
          { id: "ghost", notes: "b" },
        ],
        projects: ["nope"],
      },
    });
    expect(saved.overlay.experiences.map((e) => e.id)).toEqual(["e2"]);
    expect(saved.overlay.projects).toEqual([]);
  });

  it("never changes the page", async () => {
    const before = await getDraft(SLUG);
    const saved = await saveTailored(SLUG, { name: "Back", overlay: backend() });
    await updateTailored(SLUG, saved.id, { name: "Back 2", overlay: backend() });
    await deleteTailored(SLUG, saved.id);
    expect(await getDraft(SLUG)).toEqual(before);
  });

  it("updates and deletes only what exists", async () => {
    await expect(updateTailored(SLUG, "missing", { name: "x", overlay: backend() })).rejects.toBeInstanceOf(SiteError);
    await expect(deleteTailored(SLUG, "missing")).rejects.toBeInstanceOf(SiteError);
  });
});

describe("using a version on the page", () => {
  it("puts its wording and order on the page and removes nothing", async () => {
    const saved = await saveTailored(SLUG, { name: "Back", overlay: backend() });
    await applyTailored(SLUG, saved.id);
    const draft = await getDraft(SLUG);
    expect(draft?.profile.headline).toBe("Backend Engineer");
    expect(draft?.profile.summary).toBe("Designs reliable APIs.");
    expect(draft?.competencies).toEqual(["Node.js"]);
    expect(draft?.experiences.map((e) => e.id)).toEqual(["e2", "e1"]);
    expect(draft?.experiences[0]?.notes).toBe("Wrote APIs for shops.");
    expect(draft?.experiences[1]?.notes).toBe("Built the dashboard.");
  });

  it("can be undone, back to exactly what the page said", async () => {
    const saved = await saveTailored(SLUG, { name: "Back", overlay: backend() });
    await applyTailored(SLUG, saved.id);
    expect((await tailoredUndo(SLUG))?.label).toBe("Back");
    await undoApply(SLUG);
    const draft = await getDraft(SLUG);
    expect(overlayFromSite(draft!)).toEqual(overlayFromSite(site));
    expect(await tailoredUndo(SLUG)).toBeNull();
  });

  it("restores the page's own wording however many versions were tried", async () => {
    const a = await saveTailored(SLUG, { name: "A", overlay: backend() });
    const b = await saveTailored(SLUG, { name: "B", overlay: { ...backend(), headline: "Platform Engineer" } });
    await applyTailored(SLUG, a.id);
    await applyTailored(SLUG, b.id);
    expect((await getDraft(SLUG))?.profile.headline).toBe("Platform Engineer");
    await undoApply(SLUG);
    expect(overlayFromSite((await getDraft(SLUG))!)).toEqual(overlayFromSite(site));
  });

  it("can forget the wording to restore", async () => {
    const a = await saveTailored(SLUG, { name: "A", overlay: backend() });
    await applyTailored(SLUG, a.id);
    await discardUndo(SLUG);
    expect(await tailoredUndo(SLUG)).toBeNull();
    expect((await getDraft(SLUG))?.profile.headline).toBe("Backend Engineer");
  });

  it("has nothing to undo before anything is applied", async () => {
    await expect(undoApply(SLUG)).rejects.toBeInstanceOf(SiteError);
  });

  it("will not apply a version that is not there", async () => {
    await expect(applyTailored(SLUG, "missing")).rejects.toBeInstanceOf(SiteError);
    expect(await tailoredUndo(SLUG)).toBeNull();
  });
});
