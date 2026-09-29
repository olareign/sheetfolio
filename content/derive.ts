import { yearRange } from "./cms";
import { CATEGORY_LABELS, PRIVATE_FIELDS, type Experience, type Project, type Site } from "./schemas";

/*
 * Values the public page shows but doesn't store. Everything is computed from the site document,
 * so figures are never invented (DESIGN §0.7).
 */

// TODO(product): only Nigerian states are recognised; widen when engineers from other countries sign up.
const NG_STATES = [
  "Abia",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Ebonyi",
  "Edo",
  "Ekiti",
  "Enugu",
  "Gombe",
  "Imo",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Kwara",
  "Lagos",
  "Nasarawa",
  "Niger",
  "Ogun",
  "Ondo",
  "Osun",
  "Oyo",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara",
];
const STATE_PATTERNS = [
  ...NG_STATES.map((s) => ({ state: s, re: new RegExp(`\\b${s}\\b`, "i") })),
  { state: "FCT", re: /\b(FCT|Abuja)\b/i },
];

/** Distinct states named in project locations, in first-seen order. Unrecognised locations are skipped. */
export function statesWorked(projects: readonly Pick<Project, "location">[]): string[] {
  const found = new Set<string>();
  for (const p of projects) {
    for (const { state, re } of STATE_PATTERNS) if (re.test(p.location)) found.add(state);
  }
  return [...found];
}

export type Figure = { figure: string; caption: string };

/** Hero dimension figures (max 3); a figure that would be zero is left out. */
export function heroFigures(site: Site): Figure[] {
  const out: Figure[] = [];
  if (site.profile.yearsExperience > 0)
    out.push({ figure: `${site.profile.yearsExperience}+`, caption: "Years on site" });
  if (site.projects.length > 0) out.push({ figure: String(site.projects.length), caption: "Projects" });
  const states = statesWorked(site.projects).length;
  if (states > 0) out.push({ figure: String(states), caption: states === 1 ? "State worked" : "States worked" });
  return out;
}

export function projectYears(p: Pick<Project, "startYear" | "endYear" | "status">): string {
  if (p.endYear === undefined) return p.status === "ongoing" ? yearRange(p.startYear) : String(p.startYear);
  return yearRange(p.startYear, p.endYear);
}

export function employerOf(site: Pick<Site, "experiences">, p: Pick<Project, "experienceId">): Experience | undefined {
  return p.experienceId ? site.experiences.find((e) => e.id === p.experienceId) : undefined;
}

/** Distinct project categories in display order, e.g. "Institutional · Building · Healthcare". */
export function scopeOfWork(site: Pick<Site, "projects">): string {
  return [...new Set(site.projects.map((p) => CATEGORY_LABELS[p.category]))].join(" · ");
}

export function currentRole(site: Pick<Site, "experiences">): Experience | undefined {
  return site.experiences.find((e) => e.endYear === undefined);
}

/** Chainage span of the experience timeline, e.g. { from: 2016, to: 2026 }. */
export function chainageRange(site: Pick<Site, "experiences">): { from: number; to: number } | null {
  if (site.experiences.length === 0) return null;
  const from = Math.min(...site.experiences.map((e) => e.startYear));
  const to = Math.max(...site.experiences.map((e) => e.endYear ?? e.startYear));
  return { from, to };
}

// TODO(product): mark national-service roles explicitly instead of matching the role name.
export function isServiceRole(e: Pick<Experience, "role" | "company">): boolean {
  return /\b(corps member|nysc|national service)\b/i.test(`${e.role} ${e.company}`);
}

const PRIVATE_LABELS: Record<(typeof PRIVATE_FIELDS)[number], string> = {
  dateOfBirth: "Date of birth",
  placeOfBirth: "Place of birth",
  stateOfOrigin: "State of origin",
  maritalStatus: "Marital status",
  nationality: "Nationality",
};

/** Private details the engineer chose to show. Hidden (the default) or empty fields never appear. */
export function visiblePrivate(site: Site): { label: string; value: string }[] {
  const { private: details, visibility } = site.profile;
  return PRIVATE_FIELDS.flatMap((key) => {
    const value = details[key];
    return visibility[key] && value ? [{ label: PRIVATE_LABELS[key], value }] : [];
  });
}

/** Referees shown publicly only when switched on; phones only then too. */
export function visibleReferees(site: Site): Site["referees"] {
  return site.profile.visibility.referees ? site.referees : [];
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

/** "Rev." value: publish month as YYYY.MM (DESIGN §7.4). */
export function revision(iso: string): string {
  return iso.slice(0, 7).replace("-", ".");
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "28 Sep 2026" in UTC. Built by hand: ICU's en-GB says "Sept", which the design doesn't use. */
export function publishedDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getUTCDate()).padStart(2, "0")} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** Stamp text: max 7 characters (DESIGN §7.3). */
export function stampText(text: string): string {
  return text.trim().slice(0, 7);
}
