import { describe, expect, it } from "vitest";
import { cms, issueHref, listRows, publishState, relationOptions, yearRange } from "./cms";
import { collections, createEmptySite } from "./schemas";

const now = new Date("2026-09-28T10:00:00.000Z");
const site = () =>
  createEmptySite({
    name: "Rasaq Idris Olawale",
    firstName: "Idris",
    headline: "Site Engineer",
    publicEmail: "i@example.com",
    now,
  });

describe("yearRange", () => {
  it("formats open, single and closed ranges", () => {
    expect(yearRange(2026)).toBe("2026 – now");
    expect(yearRange(2024, 2024)).toBe("2024");
    expect(yearRange(2019, 2022)).toBe("2019 – 2022");
  });
});

describe("publishState", () => {
  const draft = {
    updatedAt: "2026-09-28T10:00:00.000Z",
    settings: {
      theme: "sheet" as const,
      status: "draft" as const,
      cvTemplate: "modern" as const,
      cvTemplates: ["modern" as const],
    },
  };
  const pub = (publishedAt: string, status: "published" | "suspended" = "published") => ({
    publishedAt,
    settings: { theme: "sheet" as const, status, cvTemplate: "modern" as const, cvTemplates: ["modern" as const] },
  });
  it("is unpublished without a published doc", () => expect(publishState(draft, null)).toBe("unpublished"));
  it("is live when the draft is not newer", () => {
    expect(publishState(draft, pub("2026-09-28T10:00:00.000Z"))).toBe("live");
  });
  it("shows changes when the draft was saved after publishing", () => {
    expect(publishState(draft, pub("2026-09-28T09:59:59.000Z"))).toBe("changes");
  });
  it("reports suspension above everything else", () => {
    expect(publishState(draft, pub("2026-09-28T10:00:00.000Z", "suspended"))).toBe("suspended");
    expect(publishState({ ...draft, settings: { ...draft.settings, status: "suspended" } }, null)).toBe("suspended");
  });
});

describe("issueHref", () => {
  it("sends contact fields to settings and the rest of the profile to profile", () => {
    expect(issueHref("profile.whatsapp")).toBe("/dashboard/settings");
    expect(issueHref("profile.summary")).toBe("/dashboard/profile");
    expect(issueHref("projects.2.title")).toBe("/dashboard/projects");
    expect(issueHref("")).toBe("/dashboard");
  });
});

describe("new item defaults", () => {
  it("are valid for every collection once the user fills required text", () => {
    for (const name of Object.keys(collections) as (keyof typeof collections)[]) {
      const defaults = cms[name].newItem(site(), now);
      const result = collections[name].schema.safeParse({ ...defaults, id: "x" });
      // Defaults never produce errors on fields they set.
      const bad = result.success ? [] : result.error.issues.filter((i) => String(i.path[0]) in defaults);
      expect(bad, name).toEqual([]);
    }
  });

  it("pre-fills a project's role and start year", () => {
    const s = site();
    expect(cms.projects.newItem(s, now)).toMatchObject({ role: "Site Engineer", startYear: 2026 });
  });
});

describe("listRows / relationOptions", () => {
  it("shows the subtitle and status for projects", () => {
    const rows = listRows("projects", [
      {
        id: "p",
        title: "Geriatric Centre",
        location: "Surulere",
        category: "healthcare",
        role: "Site Engineer",
        scope: "",
        startYear: 2024,
        status: "completed",
        images: [],
        featured: false,
      },
    ]);
    expect(rows[0]).toMatchObject({ id: "p", subtitle: "Healthcare · 2024", status: { tone: "done" } });
  });

  it("nudges a project that has no cover, and stops once it has a website picture or a photo", () => {
    const item = {
      id: "p",
      title: "Clinic",
      location: "Lagos",
      category: "healthcare" as const,
      role: "Site Engineer",
      scope: "",
      startYear: 2024,
      status: "completed" as const,
      images: [],
      featured: false,
    };
    const preview = { sourceUrl: "https://a.test/", image: "https://b.test/i.png", fetchedAt: "2026-10-22T10:00:00.000Z" };
    expect(listRows("projects", [item])[0]?.note).toMatch(/Needs a cover/);
    expect(listRows("projects", [{ ...item, websiteUrl: "https://a.test/", preview }])[0]?.note).toBeUndefined();
    expect(listRows("projects", [{ ...item, images: [{ url: "https://b.test/p.jpg", isCover: true }] }])[0]?.note).toBeUndefined();
  });

  it("marks the current role and labels employers for the project select", () => {
    const s = site();
    s.experiences = [{ id: "e1", company: "IJUNT", role: "Site Engineer", startYear: 2026 }];
    expect(listRows("experiences", s.experiences)[0]?.status?.label).toBe("Current");
    expect(relationOptions(s, "experiences")).toEqual([{ value: "e1", label: "IJUNT · Site Engineer · 2026 – now" }]);
  });
});
