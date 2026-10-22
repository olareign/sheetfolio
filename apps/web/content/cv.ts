import { CV_TEMPLATES, type CvTemplateId } from "./cv-templates";
import { employerOf, visiblePrivate, visibleReferees } from "./derive";
import type { Project, Site } from "./schemas";

/*
 * What goes on the CV, computed from the published site with the page's visibility rules
 * (PRD §3.5, §8.1). Pure, so privacy is unit-tested here rather than by reading PDFs.
 * Deliberately free of Sheetfolio-only furniture (drawing numbers, revision stamps): a CV is read by
 * recruiters and parsed by ATS software, which only want the person's own content.
 */

export type CvProject = {
  title: string;
  role: string;
  employer: string;
  location: string;
  years: string;
  scope: string;
  featured: boolean;
};

export type CvModel = {
  name: string;
  headline: string;
  location: string;
  contact: { label: string; value: string }[];
  summary: string;
  details: { label: string; value: string }[];
  competencies: string[];
  experience: { company: string; role: string; years: string; notes: string[] }[];
  projects: CvProject[];
  certifications: { title: string; issuer: string; year: number }[];
  education: { qualification: string; institution: string; years: string }[];
  research?: { title: string; year: number; summary: string };
  /** Null → "References available on request". */
  referees: { name: string; line: string }[] | null;
};

/**
 * The characters the embedded CV fonts can draw (lib/fonts/README.md): Basic Latin, Latin-1, Latin Extended A and B,
 * combining marks, Latin Extended Additional (every Yoruba and Vietnamese letter), punctuation, currency (₦) and a few
 * signs. Keep in step with the subset the fonts were cut to.
 */
export const CV_GLYPH_RANGES: readonly (readonly [number, number])[] = [
  [0x20, 0x7e],
  [0xa0, 0x17f],
  [0x180, 0x24f],
  [0x300, 0x36f],
  [0x1e00, 0x1eff],
  [0x2010, 0x2027],
  [0x2030, 0x205e],
  [0x20a0, 0x20bf],
  [0x2212, 0x2212],
  [0x2122, 0x2122],
];

const drawable = (cp: number) => cp === 0x0a || CV_GLYPH_RANGES.some(([from, to]) => cp >= from && cp <= to);

/**
 * Text as the CV fonts can print it: composed (so "ẹ" is one letter, not "e" plus a mark), with emoji, symbols and
 * scripts the fonts lack removed rather than printed as junk. Spaces are tidied; line breaks are kept.
 */
export function pdfSafe(text: string): string {
  return Array.from(text.normalize("NFC"))
    .filter((ch) => drawable(ch.codePointAt(0) ?? 0))
    .join("")
    .replace(/[ \t\u00a0]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .trim();
}

function cleanDeep<T>(value: T): T {
  if (typeof value === "string") return pdfSafe(value) as T;
  if (Array.isArray(value)) return value.map(cleanDeep) as T;
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, v]) => [key, cleanDeep(v)])) as T;
  }
  return value;
}

/** "2023 – Present", "2019 – 2022" or just "2024". "Present" is the word ATS software expects. */
export function cvYears(start: number, end?: number, ongoing = true): string {
  if (end === undefined) return ongoing ? `${start} – Present` : String(start);
  return start === end ? String(start) : `${start} – ${end}`;
}

/** One bullet per line the person wrote; a single paragraph stays one entry. */
export function noteLines(notes: string | undefined): string[] {
  return (notes ?? "")
    .split(/\r?\n/)
    .map((l) => l.replace(/^[\s•\-*]+/, "").trim())
    .filter(Boolean);
}

const digits = (value: string) => value.replace(/\D/g, "");

export function cvModel(site: Site, pageUrl: string): CvModel {
  return cleanDeep(buildCvModel(site, pageUrl));
}

function buildCvModel(site: Site, pageUrl: string): CvModel {
  const { profile } = site;
  const referees = visibleReferees(site);
  const sameAsPhone = profile.phone && digits(profile.phone) === profile.whatsapp;
  return {
    name: profile.name,
    headline: profile.headline,
    location: profile.location,
    contact: [
      { label: "Email", value: profile.publicEmail },
      ...(profile.phone ? [{ label: "Phone", value: profile.phone }] : []),
      ...(profile.whatsapp && !sameAsPhone ? [{ label: "WhatsApp", value: `+${profile.whatsapp}` }] : []),
      { label: "Portfolio", value: pageUrl },
    ],
    summary: profile.summary,
    details: visiblePrivate(site),
    competencies: site.competencies,
    experience: site.experiences.map((e) => ({
      company: e.company,
      role: e.role,
      years: cvYears(e.startYear, e.endYear),
      notes: noteLines(e.notes),
    })),
    projects: site.projects.map((p) => cvProject(site, p)),
    certifications: site.certifications.map((c) => ({ title: c.title, issuer: c.issuer, year: c.year })),
    education: site.education.map((e) => ({
      qualification: e.qualification,
      institution: e.institution,
      years: cvYears(e.startYear, e.endYear),
    })),
    research: site.research,
    referees: referees.length
      ? referees.map((r) => ({ name: r.name, line: [r.role, r.organisation, r.phone].filter(Boolean).join(" · ") }))
      : null,
  };
}

function cvProject(site: Site, p: Project): CvProject {
  return {
    title: p.title,
    role: p.role,
    employer: employerOf(site, p)?.company ?? p.client ?? "",
    location: p.location,
    years: cvYears(p.startYear, p.endYear, p.status === "ongoing"),
    scope: p.scope,
    featured: p.featured,
  };
}

/** The projects to describe in full: featured first, then the rest in page order, up to `max`. */
export function leadProjects(cv: Pick<CvModel, "projects">, max: number): { lead: CvProject[]; rest: CvProject[] } {
  const ordered = [...cv.projects.filter((p) => p.featured), ...cv.projects.filter((p) => !p.featured)];
  return { lead: ordered.slice(0, max), rest: ordered.slice(max) };
}

/** "John Doe" → "John-Doe-CV.pdf" (ASCII only, safe for Content-Disposition). */
export function cvFileName(name: string, template?: CvTemplateId): string {
  const ascii = (text: string) =>
    text
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");
  const suffix = template ? `-${ascii(CV_TEMPLATES[template].label)}` : "";
  return `${ascii(name) || "CV"}-CV${suffix}.pdf`;
}
