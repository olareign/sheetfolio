import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptySite, type Site } from "@/content/schemas";
import { FakeRedis } from "@/test/fake-redis";
import { seedPage } from "@/test/pages";

const state = vi.hoisted(() => ({ redis: undefined as unknown }));
vi.mock("@/lib/redis", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/redis")>();
  return { ...actual, redis: () => state.redis };
});
vi.mock("next/cache", () => ({ unstable_cache: <T>(fn: () => Promise<T>) => fn, revalidateTag: vi.fn() }));

const { applyCvImport } = await import("./apply");
const { getDraft, SiteError } = await import("../site");

const SLUG = "ada-obi";
let fake: FakeRedis;

async function seed(): Promise<Site> {
  const site = createEmptySite({
    name: "Ada Obi",
    firstName: "Ada",
    headline: "Engineer",
    publicEmail: "ada@example.com",
    now: new Date("2026-10-01T00:00:00.000Z"),
  });
  await seedPage(SLUG, { draft: site });
  return site;
}

const blankProfile = { name: "", headline: "", summary: "", location: "", phone: "", yearsExperience: "" };
const input = (over: Record<string, unknown> = {}) => ({
  profile: blankProfile,
  experiences: [],
  education: [],
  certifications: [],
  ...over,
});

beforeEach(async () => {
  fake = new FakeRedis();
  state.redis = fake;
  await seed();
});

describe("applyCvImport", () => {
  it("adds roles, qualifications and certifications to the draft", async () => {
    const result = await applyCvImport(
      SLUG,
      input({
        experiences: [
          { role: "Site Engineer", company: "IJUNT", startYear: "2023", endYear: "", notes: "Led the site." },
        ],
        education: [
          {
            qualification: "B.Sc. Civil Engineering",
            institution: "University of Lagos",
            startYear: "2016",
            endYear: "2021",
          },
        ],
        certifications: [{ title: "AWS Certified Developer", issuer: "Amazon", year: "2022" }],
      }),
    );
    expect(result).toEqual({ experiences: 1, education: 1, certifications: 1, profile: false });
    const draft = await getDraft(SLUG);
    expect(draft?.experiences[0]).toMatchObject({
      role: "Site Engineer",
      company: "IJUNT",
      startYear: 2023,
      notes: "Led the site.",
    });
    expect(draft?.experiences[0]?.endYear).toBeUndefined();
    expect(draft?.education[0]).toMatchObject({ institution: "University of Lagos", startYear: 2016, endYear: 2021 });
    expect(draft?.certifications[0]).toMatchObject({ title: "AWS Certified Developer", shortTitle: "ACD", year: 2022 });
    expect(draft?.experiences[0]?.id).toBeTruthy();
  });

  it("fills the profile from what was filled in and leaves blank boxes alone", async () => {
    await applyCvImport(
      SLUG,
      input({
        profile: { ...blankProfile, summary: "Builds roads.", location: "Lagos, Nigeria", yearsExperience: "5" },
      }),
    );
    const draft = await getDraft(SLUG);
    expect(draft?.profile).toMatchObject({
      name: "Ada Obi",
      headline: "Engineer",
      summary: "Builds roads.",
      location: "Lagos, Nigeria",
      yearsExperience: 5,
    });
  });

  it("updates the first name when the name changes", async () => {
    await applyCvImport(SLUG, input({ profile: { ...blankProfile, name: "Adaeze Obi" } }));
    expect((await getDraft(SLUG))?.profile).toMatchObject({ name: "Adaeze Obi", firstName: "Adaeze" });
  });

  it("does not add the same role, qualification or certification twice", async () => {
    const data = input({
      experiences: [{ role: "Site Engineer", company: "IJUNT", startYear: "2023", endYear: "", notes: "" }],
      education: [{ qualification: "B.Sc.", institution: "UNILAG", startYear: "2016", endYear: "2021" }],
      certifications: [{ title: "COREN", issuer: "COREN Council", year: "2024" }],
    });
    await applyCvImport(SLUG, data);
    const again = await applyCvImport(SLUG, data);
    expect(again).toEqual({ experiences: 0, education: 0, certifications: 0, profile: false });
    const draft = await getDraft(SLUG);
    expect([draft?.experiences.length, draft?.education.length, draft?.certifications.length]).toEqual([1, 1, 1]);
  });

  it("refuses invalid entries and says which box is wrong, saving nothing", async () => {
    const err = await applyCvImport(
      SLUG,
      input({
        experiences: [
          { role: "Engineer", company: "A", startYear: "2020", endYear: "", notes: "" },
          { role: "Intern", company: "B", startYear: "abc", endYear: "", notes: "" },
        ],
        certifications: [{ title: "COREN", issuer: "", year: "" }],
      }),
    ).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(SiteError);
    const paths = (err as InstanceType<typeof SiteError>).issues.map((i) => i.path.join("."));
    expect(paths).toContain("experiences.1.startYear");
    expect(paths).toContain("certifications.0.year");
    expect((await getDraft(SLUG))?.experiences).toEqual([]);
  });

  it("rejects an end year before the start year", async () => {
    const err = await applyCvImport(
      SLUG,
      input({ experiences: [{ role: "Engineer", company: "A", startYear: "2022", endYear: "2020", notes: "" }] }),
    ).catch((e: unknown) => e);
    expect((err as InstanceType<typeof SiteError>).issues.map((i) => i.path.join("."))).toContain(
      "experiences.0.endYear",
    );
  });

  it("rejects a malformed request", async () => {
    await expect(applyCvImport(SLUG, { nonsense: true })).rejects.toBeInstanceOf(SiteError);
  });
});
