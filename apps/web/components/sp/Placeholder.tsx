import type { Category } from "@/content/schemas";

/** DESIGN §8: line drawing per category, shown until a project has photos. */
export const PLACEHOLDER_PATHS: Record<Category, string[]> = {
  building: [
    "M60 240h280M90 240V130h220v110M78 130h244",
    "M100 130l20-30h160l20 30",
    "M114 156h52v34h-52zM234 156h52v34h-52z",
    "M180 240v-70h40v70",
  ],
  institutional: [
    "M30 240h340M50 240V130h300v110",
    "M40 130h320l-24-34H64z",
    "M80 130v110M120 130v110M160 130v110M240 130v110M280 130v110M320 130v110",
    "M176 240v-60h48v60",
  ],
  healthcare: [
    "M50 240h300M90 240V100h220v140",
    "M90 146h220M90 192h220",
    "M116 112h28v24h-28zM160 112h28v24h-28zM212 112h28v24h-28zM256 112h28v24h-28zM116 158h28v24h-28zM256 158h28v24h-28zM116 204h28v24h-28zM256 204h28v24h-28z",
    "M176 240v-40h48v40",
  ],
  "external-works": ["M140 70h120v84H140z", "M60 186h280M60 234h280", "M186 154v32M214 154v32"],
  renovation: [
    "M80 250V140h240v110M60 250h280",
    "M80 140l120-40 120 40",
    "M70 250V120M330 250V120M70 170h260M70 210h260",
  ],
  community: [
    "M40 240h320",
    "M60 240v-70l50-36 50 36v70M70 200h24v40H70z",
    "M170 240v-86l60-40 60 40v86M214 190h32v50h-32z",
    "M300 240v-56l36-26 36 26v56",
  ],
  road: ["M30 190l60-20h220l60 20", "M30 190v20h340v-20"],
  // Software categories: a window / diagram line drawing in the same single-stroke style.
  platform: ["M60 70h280v160H60zM60 104h280", "M92 150h80v56H92zM196 150h112M196 174h112M196 198h84"],
  website: [
    "M50 80h300v150H50zM50 112h300",
    "M72 96h8M92 96h8M112 96h8",
    "M82 140h150M82 164h110M82 188h130M262 140h64v64h-64z",
  ],
  commerce: ["M60 100h40l30 100h160l24-76H112", "M148 232h8M276 232h8"],
  fintech: ["M60 100h280v130H60zM60 140h280", "M90 190h60M270 190h40"],
  education: ["M200 80L60 140l140 60 140-60z", "M110 168v50c28 20 152 20 180 0v-50", "M340 140v70"],
  "data-ai": [
    "M60 230h280M60 230V90",
    "M90 200v-40M140 200v-70M190 200v-96M240 200v-56M290 200v-86",
    "M90 130l50-26 50 40 50-30 50 12",
  ],
};

const HEALTHCARE_CROSS = "M186 150h28v8h8v12h-8v8h-28v-8h-8v-12h8z";
const DASHED: Partial<Record<Category, string>> = { "external-works": "M60 210h280", road: "M90 170h220" };
const TREES = [
  [80, 160],
  [110, 150],
  [290, 150],
  [320, 160],
] as const;

export function Placeholder({ category }: { category: Category }) {
  return (
    <svg
      className="sp-ph"
      viewBox="0 0 400 300"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      {PLACEHOLDER_PATHS[category].map((d) => (
        <path key={d} d={d} />
      ))}
      {DASHED[category] && <path d={DASHED[category]} className="sp-ph-dash" />}
      {category === "external-works" && TREES.map(([cx, cy]) => <circle key={cx} cx={cx} cy={cy} r={14} />)}
      {category === "healthcare" && <path d={HEALTHCARE_CROSS} className="sp-ph-accent" />}
    </svg>
  );
}
