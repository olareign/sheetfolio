import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { revalidateTag } from "next/cache";
import { FakeRedis } from "@/test/fake-redis";

const state = vi.hoisted(() => ({ redis: undefined as unknown }));
vi.mock("@/lib/redis", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/redis")>();
  return { ...actual, redis: () => state.redis };
});
vi.mock("next/cache", () => ({ unstable_cache: <T>(fn: () => Promise<T>) => fn, revalidateTag: vi.fn() }));

const { listSignups, listSites, setSuspended } = await import("./admin");
const { onboard } = await import("./accounts");
const { addLead, getPublished, publish, saveDraft, getDraft } = await import("./site");

const seed = JSON.parse(readFileSync("seed/idris.json", "utf8")) as { site: Record<string, unknown> };
const SLUG = "idris-rasaq";
const signup = new Date("2026-09-28T10:00:00.000Z");
let fake: FakeRedis;

async function onboardAndPublish(minutesLater: number) {
  await onboard({
    userId: "u1",
    email: "idris@example.com",
    role: "engineer",
    input: { slug: SLUG, name: "Rasaq Idris Olawale", firstName: "Idris", headline: "Site Engineer" },
    now: signup,
  });
  await saveDraft(SLUG, { ...(seed.site as object), updatedAt: signup.toISOString() } as never, signup);
  await publish(SLUG, new Date(signup.getTime() + minutesLater * 60_000));
}

beforeEach(() => {
  fake = new FakeRedis();
  state.redis = fake;
  vi.mocked(revalidateTag).mockClear();
});

describe("listSites (PRD §11 metrics)", () => {
  it("reports status, minutes to first publish, projects, certificates and leads", async () => {
    await onboardAndPublish(18);
    await addLead(SLUG, { name: "A", email: "a@example.com", message: "Hi" });
    const [row] = await listSites();
    expect(row).toMatchObject({
      slug: SLUG,
      status: "live",
      owner: "idris@example.com",
      minutesToFirstPublish: 18,
      projects: 9,
      certifications: 1,
      leads: 1,
      unread: 1,
    });
  });

  it("keeps the first publish time when republishing", async () => {
    await onboardAndPublish(18);
    await publish(SLUG, new Date(signup.getTime() + 90 * 60_000));
    expect((await listSites())[0]?.minutesToFirstPublish).toBe(18);
  });

  it("lists a site that was never published", async () => {
    await onboard({
      userId: "u2",
      email: "new@example.com",
      role: "engineer",
      input: { slug: "new-one", name: "New One", firstName: "New", headline: "Engineer" },
      now: signup,
    });
    expect((await listSites())[0]).toMatchObject({
      slug: "new-one",
      status: "unpublished",
      minutesToFirstPublish: undefined,
    });
  });
});

describe("listSignups", () => {
  it("returns app accounts newest first and ignores other keys", async () => {
    await onboardAndPublish(5);
    fake.strings.set("auth:user:xyz", JSON.stringify({ id: "xyz" })); // adapter key: not matched
    const signups = await listSignups();
    expect(signups).toEqual([expect.objectContaining({ email: "idris@example.com", slug: SLUG, role: "engineer" })]);
  });

  it("fails loudly on a malformed account record", async () => {
    fake.strings.set("user:broken@example.com", JSON.stringify({ nope: true }));
    await expect(listSignups()).rejects.toMatchObject({ code: "INVALID" });
  });
});

describe("setSuspended", () => {
  it("hides the public page, blocks publishing, keeps editing, and purges the cache", async () => {
    await onboardAndPublish(5);
    const before = (await getDraft(SLUG))?.updatedAt;
    await setSuspended(SLUG, true);
    expect(await getPublished(SLUG)).toBeNull();
    expect(revalidateTag).toHaveBeenCalledWith(`site:${SLUG}`, { expire: 0 });
    await expect(publish(SLUG)).rejects.toMatchObject({ code: "SUSPENDED" });
    expect((await getDraft(SLUG))?.updatedAt).toBe(before); // suspension isn't an engineer edit
    expect((await listSites())[0]?.status).toBe("suspended");
  });

  it("restores the page exactly as it was", async () => {
    await onboardAndPublish(5);
    await setSuspended(SLUG, true);
    await setSuspended(SLUG, false);
    expect((await getPublished(SLUG))?.settings.status).toBe("published");
    expect((await listSites())[0]?.status).toBe("live");
    await expect(publish(SLUG)).resolves.toBeTruthy();
  });

  it("suspends a site that was never published", async () => {
    await onboard({
      userId: "u2",
      email: "new@example.com",
      role: "engineer",
      input: { slug: "new-one", name: "New One", firstName: "New", headline: "Engineer" },
      now: signup,
    });
    await setSuspended("new-one", true);
    expect((await listSites())[0]?.status).toBe("suspended");
  });

  it("throws NOT_FOUND for an unknown site", async () => {
    await expect(setSuspended("ghost-site", true)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
