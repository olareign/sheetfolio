import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  chainageRange,
  currentRole,
  heroFigures,
  initials,
  isServiceRole,
  projectYears,
  publishedDate,
  revision,
  scopeOfWork,
  stampText,
  statesWorked,
  visiblePrivate,
  visibleReferees,
} from "./derive";
import { PublishableSite, type Site } from "./schemas";

// The real seed (PRD §9) doubles as the fixture, so these tests also guard the seed file.
const seed = JSON.parse(readFileSync("seed/idris.json", "utf8")) as { site: object };
const idris = (): Site => PublishableSite.parse({ ...seed.site, updatedAt: "2026-09-28T00:00:00.000Z" });

describe("statesWorked", () => {
  it("finds distinct states in project locations and skips unknowns", () => {
    expect(statesWorked(idris().projects)).toEqual(["Ondo", "Enugu", "Lagos"]);
  });
  it("matches whole words only (Niger is not Nigeria) and maps Abuja to FCT", () => {
    expect(statesWorked([{ location: "Lagos, Nigeria" }, { location: "Garki, Abuja" }])).toEqual(["Lagos", "FCT"]);
  });
  it("is empty with no recognisable locations", () => expect(statesWorked([{ location: "TBC" }])).toEqual([]));
});

describe("heroFigures", () => {
  it("computes Idris's figures from data (7+ · 9 · 3)", () => {
    expect(heroFigures(idris())).toEqual([
      { figure: "7+", caption: "Years on site" },
      { figure: "9", caption: "Projects" },
      { figure: "3", caption: "States worked" },
    ]);
  });
  it("leaves out figures that would be zero instead of inventing them", () => {
    const site = idris();
    site.profile.yearsExperience = 0;
    site.projects = [];
    expect(heroFigures(site)).toEqual([]);
  });
});

describe("projectYears", () => {
  it.each([
    [{ startYear: 2026, status: "ongoing" as const }, "2026 – now"],
    [{ startYear: 2024, status: "completed" as const }, "2024"],
    [{ startYear: 2024, endYear: 2024, status: "completed" as const }, "2024"],
    [{ startYear: 2020, endYear: 2021, status: "completed" as const }, "2020 – 2021"],
  ])("%o → %s", (p, out) => expect(projectYears(p)).toBe(out));
});

describe("title block values", () => {
  it("lists categories once in display order", () => {
    expect(scopeOfWork(idris())).toBe(
      "Institutional · Building · Healthcare · External works · Renovation · Community · Road",
    );
  });
  it("finds the current role and the chainage span", () => {
    expect(currentRole(idris())?.company).toBe("IJUNT Construction Limited");
    expect(chainageRange(idris())).toEqual({ from: 2016, to: 2026 });
    expect(chainageRange({ experiences: [] })).toBeNull();
  });
  it("recognises national service roles", () => {
    expect(isServiceRole({ role: "Corps Member (Planning Dept.)", company: "Ministry" })).toBe(true);
    expect(isServiceRole({ role: "Site Engineer", company: "IJUNT" })).toBe(false);
  });
  it("formats revision and publish date in UTC", () => {
    expect(revision("2026-09-28T23:30:00.000Z")).toBe("2026.09");
    expect(publishedDate("2026-09-28T23:30:00.000Z")).toBe("28 Sep 2026");
  });
  it("builds initials and stamp text", () => {
    expect(initials("Rasaq Idris Olawale")).toBe("RO");
    expect(initials("Idris")).toBe("I");
    expect(stampText("B.Tech, Engineering")).toBe("B.Tech,");
  });
});

describe("privacy (PRD §8.1)", () => {
  it("shows no private details or referees by default, even though they are stored", () => {
    const site = idris();
    expect(site.profile.private.dateOfBirth).toBe("29 Aug 1992");
    expect(visiblePrivate(site)).toEqual([]);
    expect(visibleReferees(site)).toEqual([]);
  });
  it("shows only the fields switched on", () => {
    const site = idris();
    site.profile.visibility.nationality = true;
    site.profile.visibility.referees = true;
    expect(visiblePrivate(site)).toEqual([{ label: "Nationality", value: "Nigerian" }]);
    expect(visibleReferees(site)).toHaveLength(3);
  });
  it("skips a visible field that is empty", () => {
    const site = idris();
    site.profile.visibility.placeOfBirth = true;
    site.profile.private.placeOfBirth = undefined;
    expect(visiblePrivate(site)).toEqual([]);
  });
});
