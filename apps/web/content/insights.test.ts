import { describe, expect, it } from "vitest";
import { ago, changeLabel, monthChange, profileStrength, weeklyViews } from "./insights";

const days = (counts: number[]) => counts.map((views, i) => ({ date: `d${String(i).padStart(2, "0")}`, views }));

describe("weeklyViews", () => {
  it("groups days into weeks ending on the last day, oldest first", () => {
    const w = weeklyViews(days([1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2]));
    expect(w).toEqual([
      { start: "d00", views: 7 },
      { start: "d07", views: 14 },
    ]);
  });
  it("drops leftover days that do not fill a week", () => {
    expect(weeklyViews(days([9, 1, 1, 1, 1, 1, 1, 1]))).toEqual([{ start: "d01", views: 7 }]);
  });
  it("makes twelve weeks from 84 days", () => {
    expect(weeklyViews(days(Array(84).fill(1)))).toHaveLength(12);
  });
});

describe("monthChange", () => {
  it("compares the last 30 days with the 30 before", () => {
    const r = monthChange(days([...Array(30).fill(1), ...Array(30).fill(2)]));
    expect(r).toEqual({ current: 60, previous: 30, change: 100 });
  });
  it("has no change to report when the earlier month had no views", () => {
    expect(monthChange(days([...Array(30).fill(0), ...Array(30).fill(3)])).change).toBeNull();
  });
  it("labels the result plainly", () => {
    expect(changeLabel({ current: 120, change: 18 })).toBe("+18% this month");
    expect(changeLabel({ current: 80, change: -20 })).toBe("-20% this month");
    expect(changeLabel({ current: 5, change: null })).toBe("New this month");
    expect(changeLabel({ current: 0, change: null })).toBe("No views yet");
    expect(changeLabel({ current: 10, change: 0 })).toBe("Same as last month");
  });
});

describe("ago", () => {
  const now = new Date("2026-10-22T12:00:00.000Z");
  it.each([
    ["2026-10-22T11:59:40.000Z", "now"],
    ["2026-10-22T11:15:00.000Z", "45m"],
    ["2026-10-22T10:00:00.000Z", "2h"],
    ["2026-10-19T12:00:00.000Z", "3d"],
    ["2026-09-22T12:00:00.000Z", "4w"],
    ["2026-10-23T12:00:00.000Z", "now"],
  ])("%s is %s", (iso, label) => expect(ago(iso, now)).toBe(label));
});

describe("profileStrength", () => {
  const complete = {
    avatar: "https://img.example/a.jpg",
    headline: "Site engineer",
    summary: "Ten years on site.",
    location: "Ibadan",
    whatsapp: "2348000000000",
    projects: 4,
    projectsWithPhotos: 4,
    experiences: 2,
    certifications: 1,
    published: true,
  };
  it("is 100% when everything is in place", () => {
    const r = profileStrength(complete);
    expect(r.percent).toBe(100);
    expect(r.items.every((i) => i.done)).toBe(true);
  });
  it("counts each missing item equally and names it", () => {
    const r = profileStrength({ ...complete, avatar: undefined, summary: "  ", published: false });
    expect(r.percent).toBe(70);
    expect(r.items.filter((i) => !i.done).map((i) => i.id)).toEqual(["photo", "summary", "live"]);
  });
  it("needs three projects, and a photo on each of them", () => {
    expect(
      profileStrength({ ...complete, projects: 2, projectsWithPhotos: 2 }).items.find((i) => i.id === "projects")?.done,
    ).toBe(false);
    expect(profileStrength({ ...complete, projectsWithPhotos: 3 }).items.find((i) => i.id === "photos")?.done).toBe(
      false,
    );
    expect(
      profileStrength({ ...complete, projects: 0, projectsWithPhotos: 0 }).items.find((i) => i.id === "photos")?.done,
    ).toBe(false);
  });
  it("sends WhatsApp to settings and the rest of the profile to the profile screen", () => {
    const r = profileStrength({ ...complete, whatsapp: "", location: "" });
    expect(r.items.find((i) => i.id === "whatsapp")?.href).toBe("/dashboard/settings");
    expect(r.items.find((i) => i.id === "location")?.href).toBe("/dashboard/profile");
  });
});
