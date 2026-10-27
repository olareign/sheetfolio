import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { cvFileName, cvModel, cvYears, leadProjects, noteLines } from "./cv";
import { PublishableSite, type Site } from "./schemas";

const seed = JSON.parse(readFileSync("seed/idris.json", "utf8")) as { site: object };
const idris = (): Site =>
  PublishableSite.parse({
    ...seed.site,
    updatedAt: "2026-09-28T00:00:00.000Z",
    publishedAt: "2026-09-28T10:00:00.000Z",
  });
const URL_ = "https://dosinex.example/idris-rasaq";
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
  it("mirrors the page: 9 projects and every job, newest first as entered", () => {
    const cv = cvModel(idris(), URL_);
    expect(cv.projects).toHaveLength(9);
    expect(cv.experience[0]).toMatchObject({ company: "IJUNT Construction Limited", years: "2026 – Present" });
    expect(cv.experience).toHaveLength(6);
    expect(cv.contact).toContainEqual({ label: "Portfolio", value: URL_ });
  });

  it("carries what a recruiter reads: each project's role, employer, dates and scope of work", () => {
    const abdulrasaq = JSON.parse(readFileSync("seed/abdulrasaq.json", "utf8")) as { site: object };
    const site = PublishableSite.parse({ ...abdulrasaq.site, updatedAt: "2026-10-21T00:00:00.000Z" });
    const safepick = cvModel(site, URL_).projects.find((p) => p.title === "SafePick");
    expect(safepick).toMatchObject({
      role: "Owner: backend architecture, system design and frontend",
      employer: "Pacifylabs Technologies Limited",
      years: "2023 – Present",
      featured: true,
    });
    expect(safepick?.scope).toContain("Child pickup authorization platform");
  });

  it("has no Dosinex-only furniture: no drawing numbers, revision stamp or category tags", () => {
    const text = JSON.stringify(cvModel(idris(), URL_));
    expect(text).not.toMatch(/SP-\d{3}/);
    expect(text).not.toMatch(/Rev\.|Published|Sheet SP|Drawn on/);
  });

  it("lists WhatsApp only when it is a different number from the phone", () => {
    const site = idris();
    expect(cvModel(site, URL_).contact.map((c) => c.label)).not.toContain("WhatsApp");
    site.profile.whatsapp = "2348012345678";
    expect(cvModel(site, URL_).contact).toContainEqual({ label: "WhatsApp", value: "+2348012345678" });
  });
});

describe("cvYears", () => {
  it("writes ongoing work as Present and collapses a single year", () => {
    expect(cvYears(2023)).toBe("2023 – Present");
    expect(cvYears(2019, 2022)).toBe("2019 – 2022");
    expect(cvYears(2024, 2024)).toBe("2024");
    expect(cvYears(2024, undefined, false)).toBe("2024");
  });
});

describe("noteLines", () => {
  it("makes a bullet per line and strips bullet characters, keeping a paragraph whole", () => {
    expect(noteLines("- Led a team\n• Cut costs 20%\n\n  Mentored juniors  ")).toEqual([
      "Led a team",
      "Cut costs 20%",
      "Mentored juniors",
    ]);
    expect(noteLines("One paragraph. Two sentences.")).toEqual(["One paragraph. Two sentences."]);
    expect(noteLines(undefined)).toEqual([]);
    expect(noteLines("  \n ")).toEqual([]);
  });
});

describe("leadProjects", () => {
  const p = (title: string, featured: boolean) => ({ title, featured }) as never;

  it("puts featured projects first, then the rest in page order, and splits at the limit", () => {
    const cv = { projects: [p("a", false), p("b", true), p("c", false), p("d", true), p("e", false)] };
    const { lead, rest } = leadProjects(cv, 3);
    expect(lead.map((x) => x.title)).toEqual(["b", "d", "a"]);
    expect(rest.map((x) => x.title)).toEqual(["c", "e"]);
  });

  it("keeps everything in lead when there are fewer projects than the limit", () => {
    expect(leadProjects({ projects: [p("a", false)] }, 6)).toMatchObject({ rest: [] });
    expect(leadProjects({ projects: [] }, 6)).toEqual({ lead: [], rest: [] });
  });
});

describe("cvFileName", () => {
  it("is ASCII and header-safe", () => {
    expect(cvFileName("Rasaq Idris Olawale")).toBe("Rasaq-Idris-Olawale-CV.pdf");
    expect(cvFileName("Rasaq Idris Olawale", "projects")).toBe("Rasaq-Idris-Olawale-CV-Projects-first.pdf");
    expect(cvFileName("Ada Lovelace", "classic")).toBe("Ada-Lovelace-CV-Classic.pdf");
    expect(cvFileName('Ọlá "Test"; x')).toBe("Ola-Test-x-CV.pdf");
    expect(cvFileName("   ")).toBe("CV-CV.pdf");
  });
});
