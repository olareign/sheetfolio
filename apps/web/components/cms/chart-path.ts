export type Point = readonly [x: number, y: number];

/**
 * A smooth SVG path through the points (a Catmull-Rom curve written as cubic Béziers). Control points are held inside
 * the y range of the data, so a sharp drop to zero never swings the line below the baseline.
 */
export function smoothPath(points: readonly Point[]): string {
  const first = points[0];
  if (!first) return "";
  const ys = points.map((p) => p[1]);
  const [lo, hi] = [Math.min(...ys), Math.max(...ys)];
  const clamp = (y: number) => Math.min(hi, Math.max(lo, y));
  let d = `M${first[0]},${first[1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i] as Point;
    const p2 = points[i + 1] as Point;
    const p0 = points[i - 1] ?? p1;
    const p3 = points[i + 2] ?? p2;
    const c1: Point = [p1[0] + (p2[0] - p0[0]) / 6, clamp(p1[1] + (p2[1] - p0[1]) / 6)];
    const c2: Point = [p2[0] - (p3[0] - p1[0]) / 6, clamp(p2[1] - (p3[1] - p1[1]) / 6)];
    d += ` C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p2[0]},${p2[1]}`;
  }
  return d;
}

/**
 * Points for a series drawn in a 100 × 100 box, newest on the right. Each value sits in the middle of its own slot, so
 * the columns that carry hover labels line up with the line. Zero is the bottom edge; the largest value reaches `top`.
 */
export function seriesPoints(values: readonly number[], top = 6): Point[] {
  const max = Math.max(1, ...values);
  return values.map((v, i) => [((i + 0.5) / values.length) * 100, 100 - (v / max) * (100 - top)] as const);
}
