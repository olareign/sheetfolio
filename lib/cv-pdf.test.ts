import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { cvModel } from "@/content/cv";
import { PublishableSite } from "@/content/schemas";
import { renderCv } from "./cv-pdf";

describe("renderCv", () => {
  it("renders the seeded CV to a PDF", async () => {
    const seed = JSON.parse(readFileSync("seed/idris.json", "utf8")) as { site: object };
    const site = PublishableSite.parse({ ...seed.site, updatedAt: "2026-09-28T00:00:00.000Z" });
    const pdf = await renderCv(cvModel(site, "https://siteproof.example/idris-rasaq"));
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(2000);
  }, 30_000);
});
