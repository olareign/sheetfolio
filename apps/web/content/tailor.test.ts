import { describe, expect, it } from "vitest";
import { cvModel } from "./cv";
import { createEmptySite, Site } from "./schemas";
import {
  applyOverlayToSite,
  cvSite,
  finishTailoring,
  inventedFigures,
  overlayFromSite,
  pickEngine,
  reconcileOverlay,
  sourceText,
  tailoredFileName,
  TailorOverlay,
  type AiTailoring,
} from "./tailor";

const base = createEmptySite({
  name: "Ada Obi",
  firstName: "Ada",
  headline: "Software Engineer",
  publicEmail: "ada@example.com",
  now: new Date("2026-10-01T10:00:00.000Z"),
});

const site: Site = Site.parse({
  ...base,
  profile: { ...base.profile, summary: "Builds web products for 4 years.", location: "Lagos", yearsExperience: 4 },
  competencies: ["React", "Node.js"],
  experiences: [
    {
      id: "e1",
      company: "Acme",
      role: "Frontend Engineer",
      startYear: 2022,
      endYear: 2024,
      notes: "Built the dashboard.\nCut load time by 30%.",
    },
    { id: "e2", company: "Beta", role: "Backend Engineer", startYear: 2020, endYear: 2022, notes: "Wrote APIs." },
  ],
  projects: [
    {
      id: "p1",
      title: "Shop",
      experienceId: "e2",
      location: "Lagos",
      category: "website",
      role: "Dev",
      scope: "A shop.",
      startYear: 2021,
      status: "completed",
    },
    {
      id: "p2",
      title: "Blog",
      location: "Lagos",
      category: "website",
      role: "Dev",
      scope: "A blog.",
      startYear: 2023,
      status: "completed",
    },
  ],
  certifications: [
    { id: "c1", title: "AWS Cloud Practitioner", shortTitle: "AWS", issuer: "Amazon", year: 2023 },
    { id: "c2", title: "Scrum Master", shortTitle: "PSM", issuer: "Scrum.org", year: 2022 },
  ],
});

const ai = (over: Partial<AiTailoring> = {}): AiTailoring => ({
  job: { title: "Frontend Developer", company: "Globex" },
  headline: "Frontend Engineer",
  summary: "Builds fast web interfaces.",
  competencies: ["React", "Performance"],
  experiences: [{ id: "e1", notes: "Built the dashboard.\nCut load time by 30%." }],
  projects: ["p2"],
  certifications: [],
  matched: ["React"],
  gaps: ["GraphQL"],
  ...over,
});

describe("overlayFromSite / applyOverlayToSite", () => {
  it("reproduces the page exactly", () => {
    expect(applyOverlayToSite(site, overlayFromSite(site))).toEqual(site);
  });

  it("never removes anything: what the version leaves out moves to the end", () => {
    const applied = applyOverlayToSite(site, {
      ...overlayFromSite(site),
      experiences: [{ id: "e2", notes: "Wrote APIs for shops." }],
      projects: ["p2"],
      certifications: ["c2"],
    });
    expect(applied.experiences.map((e) => e.id)).toEqual(["e2", "e1"]);
    expect(applied.experiences[0]?.notes).toBe("Wrote APIs for shops.");
    expect(applied.experiences[1]?.notes).toBe(site.experiences[0]?.notes);
    expect(applied.projects.map((p) => p.id)).toEqual(["p2", "p1"]);
    expect(applied.certifications.map((c) => c.id)).toEqual(["c2", "c1"]);
  });

  it("round-trips through a snapshot, so applying can be undone", () => {
    const snapshot = overlayFromSite(site);
    const changed = applyOverlayToSite(site, {
      ...snapshot,
      headline: "Other",
      competencies: [],
      experiences: [{ id: "e2", notes: "x" }],
    });
    expect(applyOverlayToSite(changed, snapshot)).toEqual(site);
  });
});

describe("reconcileOverlay", () => {
  it("drops ids the page no longer has and repeats", () => {
    const o = reconcileOverlay(site, {
      ...overlayFromSite(site),
      experiences: [
        { id: "e1", notes: "a" },
        { id: "gone", notes: "b" },
        { id: "e1", notes: "c" },
      ],
      projects: ["p1", "p1", "nope"],
      certifications: ["zzz"],
    });
    expect(o.experiences).toEqual([{ id: "e1", notes: "a" }]);
    expect(o.projects).toEqual(["p1"]);
    expect(o.certifications).toEqual([]);
  });
});

describe("cvSite", () => {
  it("shows only the listed items, in order, with the version's wording", () => {
    const tailored = cvSite(site, {
      headline: "Frontend Engineer",
      summary: "Fast interfaces.",
      competencies: ["React"],
      experiences: [{ id: "e1", notes: "Built the dashboard." }],
      projects: ["p2"],
      certifications: ["c1"],
    });
    const cv = cvModel(tailored, "https://dosinex.test/ada");
    expect(cv.headline).toBe("Frontend Engineer");
    expect(cv.summary).toBe("Fast interfaces.");
    expect(cv.competencies).toEqual(["React"]);
    expect(cv.experience.map((e) => e.company)).toEqual(["Acme"]);
    expect(cv.experience[0]?.notes).toEqual(["Built the dashboard."]);
    expect(cv.projects.map((p) => p.title)).toEqual(["Blog"]);
    expect(cv.certifications.map((c) => c.title)).toEqual(["AWS Cloud Practitioner"]);
  });

  it("keeps a project's employer when that experience is left off the CV", () => {
    const tailored = cvSite(site, {
      ...overlayFromSite(site),
      experiences: [{ id: "e1", notes: "" }],
      projects: ["p1"],
    });
    expect(cvModel(tailored, "https://dosinex.test/ada").projects[0]?.employer).toBe("Beta");
  });

  it("leaves the page itself untouched", () => {
    const before = structuredClone(site);
    cvSite(site, { ...overlayFromSite(site), headline: "Changed", experiences: [] });
    expect(site).toEqual(before);
  });

  it("keeps education, contact details and referees as they are on the page", () => {
    const tailored = cvSite(site, { ...overlayFromSite(site), headline: "Other" });
    expect(tailored.education).toBe(site.education);
    expect(tailored.profile.publicEmail).toBe(site.profile.publicEmail);
    expect(tailored.referees).toBe(site.referees);
  });
});

describe("inventedFigures", () => {
  it("finds figures that are not in the source", () => {
    expect(inventedFigures("Cut costs by 40% in 2023.", "Worked in 2023.")).toEqual(["40%"]);
  });

  it("ignores figures the source has, however they are written", () => {
    expect(inventedFigures("Served 12,000 users", "12000 users served")).toEqual([]);
  });

  it("ignores single digits, which are usually counts of things", () => {
    expect(inventedFigures("Led 3 teams", "Led teams")).toEqual([]);
  });
});

describe("finishTailoring", () => {
  it("returns the overlay with the model's wording and order", () => {
    const result = finishTailoring(site, ai());
    expect(result.job).toEqual({ title: "Frontend Developer", company: "Globex" });
    expect(result.overlay.headline).toBe("Frontend Engineer");
    expect(result.overlay.experiences.map((e) => e.id)).toEqual(["e1"]);
    expect(result.overlay.projects).toEqual(["p2"]);
    expect(result.matched).toEqual(["React"]);
    expect(result.gaps).toEqual(["GraphQL"]);
    expect(result.warnings).toEqual([]);
  });

  it("drops ids the model made up", () => {
    const result = finishTailoring(
      site,
      ai({
        experiences: [
          { id: "e9", notes: "x" },
          { id: "e2", notes: "Wrote APIs." },
        ],
        projects: ["p9"],
      }),
    );
    expect(result.overlay.experiences.map((e) => e.id)).toEqual(["e2"]);
    // Nothing valid listed for projects: fall back to the page's own, rather than an empty section.
    expect(result.overlay.projects).toEqual(["p1", "p2"]);
  });

  it("falls back to the page's own text when the model leaves a field blank", () => {
    const result = finishTailoring(site, ai({ headline: "  ", summary: "", experiences: [{ id: "e1", notes: "" }] }));
    expect(result.overlay.headline).toBe(site.profile.headline);
    expect(result.overlay.summary).toBe(site.profile.summary);
    expect(result.overlay.experiences[0]?.notes).toBe(site.experiences[0]?.notes);
  });

  it("cuts text to the page's limits so the result always validates", () => {
    const result = finishTailoring(
      site,
      ai({
        headline: "H".repeat(200),
        summary: "word ".repeat(500),
        competencies: Array.from({ length: 9 }, (_, i) => `Skill ${i}`),
      }),
    );
    expect(TailorOverlay.safeParse(result.overlay).success).toBe(true);
    expect(result.overlay.competencies).toHaveLength(6);
  });

  it("warns about a figure that is not on the page", () => {
    const result = finishTailoring(site, ai({ summary: "Grew revenue by 250% across 12 markets." }));
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toMatch(/250%/);
    expect(result.warnings[0]).toMatch(/12/);
  });

  it("does not warn about figures the page already has", () => {
    const result = finishTailoring(site, ai({ summary: "Four years of work. Cut load time by 30% in 2022." }));
    expect(result.warnings).toEqual([]);
  });
});

describe("sourceText", () => {
  it("includes the page's own figures", () => {
    expect(sourceText(site)).toContain("30%");
    expect(sourceText(site)).toContain("2022");
  });
});

describe("tailoredFileName", () => {
  it("is ASCII and ends in .pdf", () => {
    expect(tailoredFileName("Adé Obi", "Front end / Globex")).toBe("Ade-Obi-CV-Front-end-Globex.pdf");
    expect(tailoredFileName("", "")).toBe("CV-CV.pdf");
  });
});

describe("pickEngine", () => {
  const on = { claude: true, groq: true };
  it("gives free accounts the standard engine and Pro accounts Claude", () => {
    expect(pickEngine("free", on)).toBe("groq");
    expect(pickEngine("pro", on)).toBe("claude");
  });
  it("never gives a free account Claude, even when only Claude is switched on", () => {
    expect(pickEngine("free", { claude: true, groq: false })).toBeNull();
  });
  it("falls back to the standard engine for a Pro account while Claude is off", () => {
    expect(pickEngine("pro", { claude: false, groq: true })).toBe("groq");
  });
  it("is null when nothing is switched on", () => {
    expect(pickEngine("pro", { claude: false, groq: false })).toBeNull();
  });
});
