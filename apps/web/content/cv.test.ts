import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { cvFileName, cvModel } from "./cv";
import { PublishableSite, type Site } from "./schemas";

const seed = JSON.parse(readFileSync("seed/idris.json", "utf8")) as { site: object };
const idris = (): Site =>
  PublishableSite.parse({
    ...seed.site,
    updatedAt: "2026-09-28T00:00:00.000Z",
    publishedAt: "2026-09-28T10:00:00.000Z",
  });
const URL_ = "https://sheetfolio.example/idris-rasaq";
const PRIVATE_VALUES = ["29 Aug 1992", "Ile-Ife", "Osun (Iwo LGA)", "Married", "Nigerian"];
const REFEREE_PHONES = ["0806 006 2556", "0703 987 7853", "0806 225 3706"];

describe("cvModel privacy (PRD §8.1)", () => {
  it("contains no private detail or referee anywhere by default", () => {
    const text = JSON.stringify(cvModel(idris(), URL_));
    for (const v of [...PRIVATE_VALUES, ...REFEREE_PHONES, "Ogundowole"]) expect(text).not.toContain(v);
    expect(cvModel(idris(), URL_).referees).toBeNull();
  });

  it("includes exactly the details switched on", () => {
    const site = idris();
    site.profile.visibility.stateOfOrigin = true;
    const cv = cvModel(site, URL_);
    expect(cv.details).toEqual([{ label: "State of origin", value: "Osun (Iwo LGA)" }]);
    expect(JSON.stringify(cv)).not.toContain("29 Aug 1992");
  });

  it("lists referees with phones only when referees are visible", () => {
    const site = idris();
    site.profile.visibility.referees = true;
    const cv = cvModel(site, URL_);
    expect(cv.referees?.[0]).toEqual({
      name: "Engr. Sogo Ogundowole",
      line: "Head of Works and Services · Federal Polytechnic Ile-Oluji · 0806 006 2556",
    });
    expect(cv.referees?.[2]?.line).toBe("ENLG Engineering Ltd · 0806 225 3706"); // no role on file
  });
});

describe("cvModel content", () => {
  it("mirrors the page: 9 projects, experience with delivered projects, footer revision", () => {
    const cv = cvModel(idris(), URL_);
    expect(cv.projects).toHaveLength(9);
    expect(cv.experience[0]).toMatchObject({ company: "IJUNT Construction Limited", years: "2026 – now" });
    expect(cv.experience.find((e) => e.company.startsWith("Eniot"))?.projects).toHaveLength(4);
    expect(cv.contact).toContainEqual({ label: "WhatsApp", value: "+2347033435818" });
    expect(cv.contact).toContainEqual({ label: "Portfolio", value: URL_ });
    expect(cv.footer).toBe("Rev. 2026.09 · Published 28 Sep 2026");
  });
});

describe("cvFileName", () => {
  it("is ASCII and header-safe", () => {
    expect(cvFileName("Rasaq Idris Olawale")).toBe("Rasaq-Idris-Olawale-CV.pdf");
    expect(cvFileName('Ọlá "Test"; x')).toBe("Ola-Test-x-CV.pdf");
    expect(cvFileName("   ")).toBe("CV-CV.pdf");
  });
});
