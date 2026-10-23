import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { cvModel } from "@/content/cv";
import { CV_TEMPLATE_IDS } from "@/content/cv-templates";
import { PublishableSite, type Site } from "@/content/schemas";
import { CV_LAYOUTS } from "../cv-layouts";
import { renderCv } from "../cv-pdf";
import { parseCv } from "./parse";
import { MAX_PDF_BYTES, PdfReadError, pdfLines } from "./pdf-text";

const load = (seed: "abdulrasaq" | "idris"): Site => {
  const file = JSON.parse(readFileSync(`seed/${seed}.json`, "utf8")) as { site: object };
  return PublishableSite.parse({ ...file.site, updatedAt: "2026-10-21T00:00:00.000Z" });
};

// The app writes CVs; importing one it wrote should give back what was in the page. This is the closest thing to a
// real CV we have in the repository, in all four layouts.
describe.each(CV_TEMPLATE_IDS)("importing a %s CV made by the app", (template) => {
  for (const seed of ["abdulrasaq", "idris"] as const) {
    it(`recovers ${seed}'s details, roles and education`, async () => {
      const site = load(seed);
      const pdf = await renderCv(cvModel(site, "https://sheetfolio.example/x"), template, CV_LAYOUTS[template]);
      const cv = parseCv(await pdfLines(new Uint8Array(pdf)), new Date("2026-10-23T00:00:00.000Z"));

      expect(cv.name).toBe(site.profile.name);
      expect(cv.email).toBe(site.profile.publicEmail);
      expect(cv.headline).toBe(site.profile.headline);
      expect(cv.location).toBe(site.profile.location);
      expect(cv.summary.length).toBeGreaterThan(40);

      // Every role on the page comes back with its company and start year.
      for (const e of site.experiences) {
        const found = cv.experiences.find((x) => x.company === e.company && x.role === e.role);
        expect(found, `${e.role} at ${e.company}`).toBeDefined();
        expect(found?.startYear).toBe(String(e.startYear));
      }
      for (const ed of site.education) {
        const found = cv.education.find((x) => x.institution.includes(ed.institution.split(",")[0]!.trim()));
        expect(found, ed.institution).toBeDefined();
        expect(found?.startYear).toBe(String(ed.startYear));
        expect(found?.endYear).toBe(String(ed.endYear));
      }
      for (const c of site.certifications) {
        expect(
          cv.certifications.some((x) => x.title === c.title && x.year === String(c.year)),
          c.title,
        ).toBe(true);
      }
    }, 60_000);
  }
});

describe("pdfLines", () => {
  it("refuses something that is not a PDF", async () => {
    await expect(pdfLines(new TextEncoder().encode("hello, this is not a pdf"))).rejects.toMatchObject({
      reason: "NOT_PDF",
    });
    await expect(pdfLines(new Uint8Array())).rejects.toBeInstanceOf(PdfReadError);
  });

  it("refuses a damaged PDF", async () => {
    await expect(pdfLines(new TextEncoder().encode("%PDF-1.7\nnot really"))).rejects.toMatchObject({
      reason: "UNREADABLE",
    });
  });

  it("has a size limit that fits a serverless request", () => {
    expect(MAX_PDF_BYTES).toBeLessThanOrEqual(4.5 * 1024 * 1024);
  });
});
