import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptySite } from "@/content/schemas";
import { FakeRedis } from "@/test/fake-redis";

const state = vi.hoisted(() => ({ redis: undefined as unknown }));
vi.mock("@/lib/redis", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/redis")>();
  return { ...actual, redis: () => state.redis };
});
vi.mock("next/cache", () => ({ unstable_cache: <T>(fn: () => Promise<T>) => fn, revalidateTag: vi.fn() }));

const { deleteItem, reorderItems, saveProfile, saveSettings, upsertItem } = await import("./collections");
const { getDraft } = await import("./site");

const SLUG = "idris-rasaq";
const t0 = new Date("2026-09-28T10:00:00.000Z");
let fake: FakeRedis;

const project = (over: Record<string, unknown> = {}) => ({
  drawingNo: "SP-001",
  title: "Geriatric Centre",
  location: "Surulere, Lagos",
  category: "healthcare",
  role: "Site Engineer",
  startYear: 2024,
  status: "completed",
  ...over,
});
const experience = (over: Record<string, unknown> = {}) => ({
  company: "Bolaji",
  role: "Site Engineer",
  startYear: 2024,
  ...over,
});
const draft = async () => (await getDraft(SLUG))!;

beforeEach(() => {
  fake = new FakeRedis();
  state.redis = fake;
  const site = createEmptySite({
    name: "Rasaq Idris Olawale",
    firstName: "Idris",
    headline: "Site Engineer",
    publicEmail: "i@example.com",
    now: t0,
  });
  fake.strings.set(`site:${SLUG}:draft`, JSON.stringify(site));
});

describe("upsertItem", () => {
  it("creates with a server-generated id, appending in order", async () => {
    const a = await upsertItem(SLUG, "projects", "new", project({ id: "client-chosen" }));
    const b = await upsertItem(SLUG, "projects", "new", project({ drawingNo: "SP-002", title: "Canteen" }));
    expect(a).not.toBe("client-chosen");
    expect((await draft()).projects.map((p) => p.id)).toEqual([a, b]);
  });

  it("edits in place and keeps position", async () => {
    const a = await upsertItem(SLUG, "projects", "new", project());
    await upsertItem(SLUG, "projects", "new", project({ drawingNo: "SP-002" }));
    await upsertItem(SLUG, "projects", a, project({ title: "Renamed" }));
    const d = await draft();
    expect(d.projects[0]).toMatchObject({ id: a, title: "Renamed" });
    expect(d.projects).toHaveLength(2);
  });

  it("clears optional fields that are left out on edit", async () => {
    const a = await upsertItem(SLUG, "projects", "new", project({ client: "LUTH" }));
    await upsertItem(SLUG, "projects", a, project());
    expect((await draft()).projects[0]?.client).toBeUndefined();
  });

  it("rejects invalid data with field paths and saves nothing", async () => {
    await expect(upsertItem(SLUG, "projects", "new", project({ title: "", startYear: "abc" }))).rejects.toMatchObject({
      code: "INVALID",
      issues: expect.arrayContaining([
        expect.objectContaining({ path: ["title"] }),
        expect.objectContaining({ path: ["startYear"] }),
      ]),
    });
    expect((await draft()).projects).toEqual([]);
  });

  it("rejects a duplicate drawing number", async () => {
    await upsertItem(SLUG, "projects", "new", project());
    await expect(upsertItem(SLUG, "projects", "new", project())).rejects.toMatchObject({
      code: "INVALID",
      issues: [expect.objectContaining({ path: ["drawingNo"] })],
    });
  });

  it("rejects a link to an employer that doesn't exist", async () => {
    await expect(upsertItem(SLUG, "projects", "new", project({ experienceId: "ghost" }))).rejects.toMatchObject({
      issues: [expect.objectContaining({ path: ["experienceId"] })],
    });
  });

  it("makes the first photo the cover whatever the client sent", async () => {
    const images = [
      { url: "https://x.public.blob.vercel-storage.com/a.jpg", isCover: false },
      { url: "https://x.public.blob.vercel-storage.com/b.jpg", isCover: true },
    ];
    await upsertItem(SLUG, "projects", "new", project({ images }));
    expect((await draft()).projects[0]?.images.map((i) => i.isCover)).toEqual([true, false]);
  });

  it("throws NOT_FOUND when editing an item that was deleted", async () => {
    await expect(upsertItem(SLUG, "projects", "gone", project())).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("throws NOT_FOUND without a draft", async () => {
    fake.strings.clear();
    await expect(upsertItem(SLUG, "projects", "new", project())).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("works for every collection", async () => {
    await upsertItem(SLUG, "experiences", "new", experience());
    await upsertItem(SLUG, "certifications", "new", {
      title: "HSE Management",
      shortTitle: "HSE",
      issuer: "IIPSM",
      year: 2020,
    });
    await upsertItem(SLUG, "education", "new", {
      institution: "LAUTECH",
      qualification: "B.Tech",
      startYear: 2012,
      endYear: 2018,
    });
    await upsertItem(SLUG, "testimonials", "new", { author: "A", role: "PM", body: "Reliable." });
    await upsertItem(SLUG, "referees", "new", { name: "Engr. S", role: "Head of Works" });
    const d = await draft();
    expect([d.experiences, d.certifications, d.education, d.testimonials, d.referees].map((l) => l.length)).toEqual([
      1, 1, 1, 1, 1,
    ]);
  });
});

describe("deleteItem", () => {
  it("removes the item", async () => {
    const a = await upsertItem(SLUG, "referees", "new", { name: "A", role: "R" });
    await deleteItem(SLUG, "referees", a);
    expect((await draft()).referees).toEqual([]);
  });

  it("unlinks projects when their employer is deleted", async () => {
    const e = await upsertItem(SLUG, "experiences", "new", experience());
    await upsertItem(SLUG, "projects", "new", project({ experienceId: e }));
    await deleteItem(SLUG, "experiences", e);
    const d = await draft();
    expect(d.projects).toHaveLength(1);
    expect(d.projects[0]?.experienceId).toBeUndefined();
  });

  it("throws NOT_FOUND for an unknown id", async () => {
    await expect(deleteItem(SLUG, "projects", "nope")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("reorderItems", () => {
  it("applies the new order", async () => {
    const a = await upsertItem(SLUG, "experiences", "new", experience({ company: "A" }));
    const b = await upsertItem(SLUG, "experiences", "new", experience({ company: "B" }));
    const c = await upsertItem(SLUG, "experiences", "new", experience({ company: "C" }));
    await reorderItems(SLUG, "experiences", [c, a, b]);
    expect((await draft()).experiences.map((e) => e.company)).toEqual(["C", "A", "B"]);
  });

  it.each([
    ["a missing id", (a: string) => [a]],
    ["an unknown id", (a: string, b: string) => [a, b, "x"]],
    ["a duplicate", (a: string) => [a, a]],
    ["a non-array", () => "nope"],
  ])("refuses %s and leaves the order alone", async (_label, make) => {
    const a = await upsertItem(SLUG, "experiences", "new", experience({ company: "A" }));
    const b = await upsertItem(SLUG, "experiences", "new", experience({ company: "B" }));
    await expect(reorderItems(SLUG, "experiences", make(a, b))).rejects.toMatchObject({ code: "INVALID" });
    expect((await draft()).experiences.map((e) => e.id)).toEqual([a, b]);
  });
});

describe("saveProfile", () => {
  const base = async () => {
    const d = await draft();
    const { name, firstName, headline, summary, location, yearsExperience } = d.profile;
    return {
      profile: {
        name,
        firstName,
        headline,
        summary,
        location,
        yearsExperience,
        private: {},
        visibility: d.profile.visibility,
      },
      competencies: ["", "", "", "", "", ""],
      research: { title: "", summary: "" },
    };
  };

  it("saves identity, private details and visibility, and drops blank competencies and research", async () => {
    const input = await base();
    input.profile.summary = "Site engineer.";
    input.profile.private = { dateOfBirth: "29 Aug 1992" };
    input.profile.visibility = { ...input.profile.visibility, nationality: true };
    input.competencies = ["Site supervision", "", "HSE compliance", "", "", ""];
    await saveProfile(SLUG, input, t0);
    const d = await draft();
    expect(d.profile.summary).toBe("Site engineer.");
    expect(d.profile.private.dateOfBirth).toBe("29 Aug 1992");
    expect(d.profile.visibility).toMatchObject({ nationality: true, dateOfBirth: false });
    expect(d.competencies).toEqual(["Site supervision", "HSE compliance"]);
    expect(d.research).toBeUndefined();
  });

  it("clears an optional field that was removed (regression: spread kept the old value)", async () => {
    const input = await base();
    await saveProfile(SLUG, { ...input, profile: { ...input.profile, phone: "0703", availability: "Available" } });
    await saveProfile(SLUG, input);
    const d = await draft();
    expect(d.profile.phone).toBeUndefined();
    expect(d.profile.availability).toBeUndefined();
  });

  it("does not touch contact fields owned by Settings", async () => {
    const input = await base();
    await saveProfile(SLUG, {
      ...input,
      profile: { ...input.profile, publicEmail: "hijack@example.com", whatsapp: "999" },
    });
    const d = await draft();
    expect(d.profile.publicEmail).toBe("i@example.com");
    expect(d.profile.whatsapp).toBe("");
  });

  it("requires a research year once a title is given", async () => {
    const input = await base();
    await expect(
      saveProfile(SLUG, { ...input, research: { title: "Cow-bone ash", summary: "" } }),
    ).rejects.toMatchObject({
      issues: [expect.objectContaining({ path: ["research", "year"] })],
    });
  });
});

describe("saveSettings", () => {
  it("updates contact channels and theme", async () => {
    await saveSettings(SLUG, {
      theme: "blueprint",
      whatsapp: "2347033435818",
      whatsappMessage: "Hi",
      publicEmail: "r@example.com",
    });
    const d = await draft();
    expect(d.settings.theme).toBe("blueprint");
    expect(d.profile).toMatchObject({
      whatsapp: "2347033435818",
      publicEmail: "r@example.com",
      name: "Rasaq Idris Olawale",
    });
  });

  it("rejects a WhatsApp number with a plus or spaces", async () => {
    await expect(
      saveSettings(SLUG, { theme: "sheet", whatsapp: "+234 703", whatsappMessage: "", publicEmail: "r@example.com" }),
    ).rejects.toMatchObject({ issues: [expect.objectContaining({ path: ["whatsapp"] })] });
  });
});
