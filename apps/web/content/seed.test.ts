import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PublishableSite, Slug } from "./schemas";

const files = readdirSync("seed").filter((f) => f.endsWith(".json"));

describe.each(files)("seed/%s", (file) => {
  const { slug, site } = JSON.parse(readFileSync(`seed/${file}`, "utf8")) as { slug: string; site: unknown };

  it("has a valid slug and a publishable site", () => {
    expect(Slug.safeParse(slug).success).toBe(true);
    const parsed = PublishableSite.safeParse({ ...(site as object), updatedAt: new Date().toISOString() });
    expect(parsed.error?.issues ?? []).toEqual([]);
  });

  it("gives every project a unique id, and links only to real employers", () => {
    const parsed = PublishableSite.parse({ ...(site as object), updatedAt: new Date().toISOString() });
    const ids = parsed.projects.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    const employers = new Set(parsed.experiences.map((e) => e.id));
    for (const p of parsed.projects) if (p.experienceId) expect(employers.has(p.experienceId)).toBe(true);
  });
});
