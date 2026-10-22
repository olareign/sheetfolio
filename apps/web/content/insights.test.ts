import { describe, expect, it } from "vitest";
import { ago, changeLabel, monthChange, weeklyViews } from "./insights";

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
