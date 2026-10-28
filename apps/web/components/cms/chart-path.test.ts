import { describe, expect, it } from "vitest";
import { seriesPoints, smoothPath } from "./chart-path";

describe("seriesPoints", () => {
  it("puts each value in the middle of its slot and the largest near the top", () => {
    const pts = seriesPoints([0, 5, 10], 10);
    pts.map((p) => p[0]).forEach((x, i) => expect(x).toBeCloseTo([100 / 6, 50, 500 / 6][i] as number, 6));
    expect(pts.map((p) => p[1])).toEqual([100, 55, 10]);
  });
  it("keeps an all-zero series on the baseline", () => {
    expect(seriesPoints([0, 0, 0]).every((p) => p[1] === 100)).toBe(true);
  });
});

describe("smoothPath", () => {
  it("is empty without points and a lone move with one", () => {
    expect(smoothPath([])).toBe("");
    expect(smoothPath([[10, 20]])).toBe("M10,20");
  });
  it("draws one curve per gap between points", () => {
    expect(
      smoothPath([
        [0, 0],
        [10, 10],
        [20, 0],
      ]).match(/C/g),
    ).toHaveLength(2);
  });
  it("never swings a control point outside the data's own range", () => {
    const d = smoothPath([
      [0, 100],
      [10, 100],
      [20, 10],
      [30, 100],
      [40, 100],
    ]);
    const ys = [...d.matchAll(/-?\d+(?:\.\d+)?,(-?\d+(?:\.\d+)?)/g)].map((m) => Number(m[1]));
    expect(Math.max(...ys)).toBeLessThanOrEqual(100);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(10);
  });
});
