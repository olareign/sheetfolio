import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptySite } from "@/content/schemas";
import { FakeRedis } from "@/test/fake-redis";
import { seedPage } from "@/test/pages";

const state = vi.hoisted(() => ({ redis: undefined as unknown }));
vi.mock("@/lib/redis", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/redis")>();
  return { ...actual, redis: () => state.redis };
});
vi.mock("next/cache", () => ({ unstable_cache: <T>(fn: () => Promise<T>) => fn, revalidateTag: vi.fn() }));

const { saveSetupProfile } = await import("./setup");
const { getDraft, SiteError } = await import("./site");

const SLUG = "ada-obi";
let fake: FakeRedis;

beforeEach(async () => {
  fake = new FakeRedis();
  state.redis = fake;
  const site = createEmptySite({
    name: "Ada Obi",
    firstName: "Ada",
    headline: "Engineer",
    publicEmail: "ada@example.com",
    now: new Date(),
  });
  site.profile = { ...site.profile, availability: "Open to work", yearsExperience: 4, phone: "0801" };
  await seedPage(SLUG, { draft: site });
});

describe("saveSetupProfile", () => {
  it("saves the About step and leaves the rest of the profile alone", async () => {
    await saveSetupProfile(SLUG, "about", {
      headline: "Site Engineer",
      summary: "Builds roads.",
      location: "Lagos, Nigeria",
      availability: "",
      avatar: "https://res.cloudinary.com/demo/image/upload/a.jpg",
      yearsExperience: "6",
    });
    const { profile } = (await getDraft(SLUG))!;
    expect(profile).toMatchObject({
      name: "Ada Obi",
      headline: "Site Engineer",
      summary: "Builds roads.",
      location: "Lagos, Nigeria",
      avatar: "https://res.cloudinary.com/demo/image/upload/a.jpg",
      yearsExperience: 6,
      publicEmail: "ada@example.com",
      phone: "0801",
    });
  });

  it("clears an optional box that was emptied, and keeps years when that box is blank", async () => {
    await saveSetupProfile(SLUG, "about", {
      headline: "Engineer",
      summary: "x",
      location: "Lagos",
      availability: "",
      avatar: "",
      yearsExperience: "",
    });
    const { profile } = (await getDraft(SLUG))!;
    expect(profile.availability).toBeUndefined();
    expect(profile.avatar).toBeUndefined();
    expect(profile.yearsExperience).toBe(4);
  });

  it("saves the contact step", async () => {
    await saveSetupProfile(SLUG, "contact", {
      whatsapp: "2348012345678",
      publicEmail: "ada.public@example.com",
      phone: "",
    });
    const { profile } = (await getDraft(SLUG))!;
    expect(profile).toMatchObject({
      whatsapp: "2348012345678",
      publicEmail: "ada.public@example.com",
      headline: "Engineer",
    });
    expect(profile.phone).toBeUndefined();
  });

  it("refuses a bad WhatsApp number or email, with the field named", async () => {
    const err = await saveSetupProfile(SLUG, "contact", { whatsapp: "+234 801", publicEmail: "nope" }).catch(
      (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(SiteError);
    expect((err as InstanceType<typeof SiteError>).issues.map((i) => i.path.join("."))).toEqual(
      expect.arrayContaining(["whatsapp", "publicEmail"]),
    );
    expect((await getDraft(SLUG))?.profile.whatsapp).toBe("");
  });

  it("refuses an empty headline and an out-of-range number of years", async () => {
    await expect(
      saveSetupProfile(SLUG, "about", { headline: "", summary: "", location: "", yearsExperience: "5" }),
    ).rejects.toBeInstanceOf(SiteError);
    await expect(
      saveSetupProfile(SLUG, "about", { headline: "x", summary: "", location: "", yearsExperience: "99" }),
    ).rejects.toBeInstanceOf(SiteError);
  });
});
