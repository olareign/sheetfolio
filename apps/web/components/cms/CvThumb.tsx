import type { CvTemplateId } from "@/content/cv-templates";

type Spec = {
  align: "center" | "left";
  accent: string;
  rules: boolean;
  order: ("summary" | "experience" | "projects" | "skills")[];
};

// Mirrors lib/cv-layouts.ts: alignment, accent colour, whether headings are underlined, and section order.
const SPECS: Record<CvTemplateId, Spec> = {
  classic: { align: "center", accent: "#111111", rules: true, order: ["summary", "experience", "projects", "skills"] },
  modern: { align: "left", accent: "#1F3A5F", rules: true, order: ["summary", "skills", "experience", "projects"] },
  projects: { align: "left", accent: "#111111", rules: true, order: ["summary", "projects", "experience", "skills"] },
  minimal: { align: "left", accent: "#111111", rules: false, order: ["summary", "experience", "projects", "skills"] },
};

const W = 90;
const MARGIN = 9;
const LINE = "#c4c4c0";

/** A tiny drawing of a CV layout: enough to tell the four apart at a glance. Decorative; the label names it. */
export function CvThumb({ id }: { id: CvTemplateId }) {
  const spec = SPECS[id];
  const inner = W - MARGIN * 2;
  const center = (width: number) => (spec.align === "center" ? (W - width) / 2 : MARGIN);
  const rects: { x: number; y: number; w: number; h: number; fill: string }[] = [];

  rects.push({ x: center(46), y: 9, w: 46, h: 5.5, fill: spec.accent }); // name
  rects.push({ x: center(32), y: 17, w: 32, h: 2.5, fill: LINE }); // headline

  let y = 27;
  for (const section of spec.order) {
    rects.push({ x: MARGIN, y, w: 22, h: 3, fill: spec.accent }); // heading
    y += 5;
    if (spec.rules) rects.push({ x: MARGIN, y, w: inner, h: 0.8, fill: spec.accent });
    y += 3;
    const lines = section === "skills" ? 2 : 3;
    for (let i = 0; i < lines; i += 1) {
      rects.push({ x: MARGIN, y, w: i === lines - 1 ? inner * 0.6 : inner, h: 2, fill: LINE });
      y += 4;
    }
    y += 4;
  }

  return (
    <svg className="cms-cv-thumb" viewBox={`0 0 ${W} 127`} aria-hidden="true" focusable="false">
      <rect x="0.5" y="0.5" width={W - 1} height="126" fill="#ffffff" stroke="#b9b9b3" />
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} fill={r.fill} />
      ))}
    </svg>
  );
}
