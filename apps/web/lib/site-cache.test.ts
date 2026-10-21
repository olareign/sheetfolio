import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { offeredCvTemplates } from "@/content/cv-templates";

// The data cache outlives deployments: this is an entry written before newer settings existed.
const state = vi.hoisted(() => ({ stale: undefined as unknown }));
vi.mock("next/cache", () => ({
  unstable_cache: () => async () => state.stale,
  revalidateTag: vi.fn(),
}));
vi.mock("@/lib/redis", () => ({ redis: () => ({}), keys: {} }));

const { getPublished } = await import("./site");

function staleEntry(): unknown {
  const file = JSON.parse(readFileSync("seed/idris.json", "utf8")) as { site: { settings?: object } };
  return {
    ...file.site,
    settings: { theme: "sheet", status: "published" }, // no cvTemplate, no cvTemplates
    updatedAt: "2026-09-29T08:55:22.754Z",
    publishedAt: "2026-09-29T08:55:22.754Z",
  };
}

describe("getPublished with a cache entry from before a schema change", () => {
  it("fills in settings added since, so pages built on them do not crash", async () => {
    state.stale = staleEntry();
    const site = await getPublished("idris-rasaq");

    expect(site?.settings.cvTemplates).toEqual(["classic", "modern", "projects", "minimal"]);
    expect(site?.settings.cvTemplate).toBe("modern");
    expect(site && offeredCvTemplates(site.settings)).toEqual(["modern", "classic", "projects", "minimal"]);
  });

  it("still returns null when the cache says there is no published page", async () => {
    state.stale = null;
    expect(await getPublished("idris-rasaq")).toBeNull();
  });
});
