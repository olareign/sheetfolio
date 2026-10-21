import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { cvModel } from "@/content/cv";
import { CV_TEMPLATE_IDS, type CvTemplateId } from "@/content/cv-templates";
import { PublishableSite, type Site } from "@/content/schemas";
import { pdfPages } from "@/test/pdf-text";
import { CV_LAYOUTS } from "./cv-layouts";
import { cvStyles, renderCv } from "./cv-pdf";

const load = (seed: "abdulrasaq" | "idris"): { slug: string; site: Site } => {
  const file = JSON.parse(readFileSync(`seed/${seed}.json`, "utf8")) as { slug: string; site: object };
  return { slug: file.slug, site: PublishableSite.parse({ ...file.site, updatedAt: "2026-10-21T00:00:00.000Z" }) };
};
const URL_ = (slug: string) => `https://sheetfolio.example/${slug}`;

/** Renders and reads back, like an ATS: the text of every page, in reading order. */
async function readCv(site: Site, slug: string, template: CvTemplateId, layout = CV_LAYOUTS[template]) {
  const pdf = await renderCv(cvModel(site, URL_(slug)), template, layout);
  return { pdf, pages: await pdfPages(pdf) };
}
const compact = (text: string) => text.replace(/\s+/g, "");
const has = (text: string, needle: string) => compact(text).includes(compact(needle));

describe.each(CV_TEMPLATE_IDS)("%s template", (template) => {
  it("renders a short PDF with text on every page, for both seeded people", async () => {
    for (const seed of ["abdulrasaq", "idris"] as const) {
      const { slug, site } = load(seed);
      const { pdf, pages } = await readCv(site, slug, template);
      expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
      expect(pages.length).toBeGreaterThanOrEqual(1);
      expect(pages.length).toBeLessThanOrEqual(3);
      for (const page of pages) expect(page.length, `${seed}: a page has no text`).toBeGreaterThan(50);
    }
  }, 60_000);

  it("puts the person's details in the body as plain text a parser can read", async () => {
    const { slug, site } = load("abdulrasaq");
    const text = (await readCv(site, slug, template)).pages.join(" ");
    for (const must of [
      "Abdulrasaq Taofeeq Olarewaju",
      "abdulrasaqolarewaju88@gmail.com",
      "+234 706 978 6151",
      "sheetfolio.example/taofeeq-abdulrasaq",
      "Tobams Group",
      "Pacifylabs Technologies Limited",
      "B.Sc. (Hons) Chemistry",
    ]) {
      expect(has(text, must), must).toBe(true);
    }
    // Skills survive intact: no word is split by hyphenation or dropped.
    for (const skill of site.competencies) expect(has(text, skill), skill).toBe(true);
  }, 60_000);

  it("uses standard section headings and none of Sheetfolio's own furniture", async () => {
    const { slug, site } = load("abdulrasaq");
    const text = (await readCv(site, slug, template)).pages.join(" ");
    for (const heading of ["SUMMARY", "EXPERIENCE", "EDUCATION", "SKILLS"]) expect(text).toContain(heading);
    expect(text).not.toMatch(/SP-\d{3}/);
    expect(text).not.toMatch(/Curriculum vitae|Sheet SP|Rev\.|Drawn on|Published/);
  }, 60_000);

  it("keeps private details and referee phone numbers off the CV unless switched on", async () => {
    const { slug, site } = load("idris");
    const hidden = (await readCv(site, slug, template)).pages.join(" ");
    for (const secret of ["29 Aug 1992", "Ile-Ife", "Married", "0806 006 2556", "Ogundowole"]) {
      expect(hidden).not.toContain(secret);
    }
    expect(hidden).toContain("References available on request");

    site.profile.visibility.stateOfOrigin = true;
    const shown = (await readCv(site, slug, template)).pages.join(" ");
    expect(has(shown, "State of origin: Osun (Iwo LGA)")).toBe(true);
    expect(shown).not.toContain("29 Aug 1992");
  }, 60_000);

  it("prints Yoruba letters, the Naira sign and quotes correctly, and drops what no font here can draw", async () => {
    const { slug, site } = load("abdulrasaq");
    site.profile.name = "Ọlá Ẹkún Adéyẹmí";
    site.profile.summary = "Raised ₦500,000 for a school in Ìbàdàn: “great work” — Ṣadé. 🙂 ✓ 日本語";
    const text = (await readCv(site, slug, template)).pages.join(" ");
    expect(has(text, "Ọlá Ẹkún Adéyẹmí")).toBe(true);
    expect(has(text, "Raised ₦500,000 for a school in Ìbàdàn: “great work” — Ṣadé.")).toBe(true);
    expect(text).not.toMatch(/🙂|✓|日本語/u);
  }, 60_000);
});

describe("template differences", () => {
  const order = async (template: CvTemplateId, headings: string[]) => {
    const { slug, site } = load("abdulrasaq");
    const text = (await readCv(site, slug, template)).pages.join(" ");
    const at = headings.map((h) => text.indexOf(h));
    expect(
      at.every((i) => i >= 0),
      `${template}: ${headings.join(", ")} -> ${at.join(", ")}`,
    ).toBe(true);
    expect(
      [...at].sort((a, b) => a - b),
      `${template} order`,
    ).toEqual(at);
  };

  it(
    "classic reads summary, experience, projects, education, certifications, skills",
    () => order("classic", ["SUMMARY", "EXPERIENCE", "PROJECTS", "EDUCATION", "CERTIFICATIONS", "SKILLS"]),
    60_000,
  );
  it(
    "modern reads summary, skills, experience, projects, education, certifications",
    () => order("modern", ["SUMMARY", "SKILLS", "EXPERIENCE", "PROJECTS", "EDUCATION", "CERTIFICATIONS"]),
    60_000,
  );
  it(
    "projects-first leads with projects, before experience",
    () => order("projects", ["SUMMARY", "SELECTED PROJECTS", "EXPERIENCE", "SKILLS", "EDUCATION", "CERTIFICATIONS"]),
    60_000,
  );
  it(
    "minimal reads summary, experience, projects, skills, education, certifications",
    () => order("minimal", ["SUMMARY", "EXPERIENCE", "PROJECTS", "SKILLS", "EDUCATION", "CERTIFICATIONS"]),
    60_000,
  );

  it("only projects-first describes each project in full; the others list one line each", async () => {
    const { slug, site } = load("abdulrasaq");
    const scope = "Child pickup authorization platform";
    expect(has((await readCv(site, slug, "projects")).pages.join(" "), scope)).toBe(true);
    for (const t of ["classic", "modern", "minimal"] as const) {
      expect(has((await readCv(site, slug, t)).pages.join(" "), scope), t).toBe(false);
    }
  }, 60_000);

  it("minimal draws no underline or rule anywhere; the others underline their section headings", () => {
    const border = (t: CvTemplateId) =>
      Object.keys(cvStyles(CV_LAYOUTS[t]).heading).filter((key) => key.startsWith("border"));
    expect(border("minimal")).toEqual([]);
    expect(CV_LAYOUTS.minimal.headingRule).toBe(false);
    for (const t of ["classic", "modern", "projects"] as const) expect(border(t).length, t).toBeGreaterThan(0);
  });

  it("keeps every template to the ATS basics: embedded Arimo or Tinos, near-black text, one accent at most", () => {
    for (const t of CV_TEMPLATE_IDS) {
      const layout = CV_LAYOUTS[t];
      expect(["Arimo", "Tinos"]).toContain(layout.font);
      expect(layout.accent).toMatch(/^#(000000|1F3A5F)$/);
    }
    expect(CV_LAYOUTS.classic.font).toBe("Tinos");
    expect(CV_LAYOUTS.modern.accent).toBe("#1F3A5F");
  });
});

describe("page edges", () => {
  it("never ends in an empty page, however the content lands against the bottom margin", async () => {
    // Content ending exactly at the margin used to make react-pdf emit a blank extra page (trailing margins).
    const { slug, site } = load("abdulrasaq");
    for (let padding = 30; padding <= 60; padding += 3) {
      const { pages } = await readCv(site, slug, "projects", { ...CV_LAYOUTS.projects, padding });
      for (const page of pages) expect(page.length, `padding ${padding}: a page is empty`).toBeGreaterThan(0);
    }
  }, 120_000);
});
