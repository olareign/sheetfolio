import { yearRange } from "./cms";
import { employerOf, projectYears, publishedDate, revision, visiblePrivate, visibleReferees } from "./derive";
import { CATEGORY_LABELS, type Site } from "./schemas";

/*
 * What goes on the CV, computed from the published site with the page's visibility rules
 * (PRD §3.5, §8.1). Pure, so privacy is unit-tested here rather than by reading PDFs.
 */

export type CvModel = {
  name: string;
  headline: string;
  location: string;
  contact: { label: string; value: string }[];
  summary: string;
  details: { label: string; value: string }[];
  competencies: string[];
  experience: { company: string; role: string; years: string; projects: string[] }[];
  projects: { no: string; title: string; meta: string; years: string; status: string }[];
  certifications: { title: string; issuer: string; year: number }[];
  education: { qualification: string; institution: string; years: string }[];
  research?: { title: string; year: number; summary: string };
  /** Null → "References available on request". */
  referees: { name: string; line: string }[] | null;
  footer: string;
};

export function cvModel(site: Site, pageUrl: string): CvModel {
  const { profile } = site;
  const referees = visibleReferees(site);
  const published = site.publishedAt;
  return {
    name: profile.name,
    headline: profile.headline,
    location: profile.location,
    contact: [
      { label: "Email", value: profile.publicEmail },
      ...(profile.phone ? [{ label: "Phone", value: profile.phone }] : []),
      ...(profile.whatsapp ? [{ label: "WhatsApp", value: `+${profile.whatsapp}` }] : []),
      { label: "Portfolio", value: pageUrl },
    ],
    summary: profile.summary,
    details: visiblePrivate(site),
    competencies: site.competencies,
    experience: site.experiences.map((e) => ({
      company: e.company,
      role: e.role,
      years: yearRange(e.startYear, e.endYear),
      projects: site.projects.filter((p) => p.experienceId === e.id).map((p) => `${p.drawingNo} ${p.title}`),
    })),
    projects: site.projects.map((p) => ({
      no: p.drawingNo,
      title: p.title,
      meta: [CATEGORY_LABELS[p.category], employerOf(site, p)?.company ?? p.client, p.location]
        .filter(Boolean)
        .join(" · "),
      years: projectYears(p),
      status: p.status === "ongoing" ? "Ongoing" : "Completed",
    })),
    certifications: site.certifications.map((c) => ({ title: c.title, issuer: c.issuer, year: c.year })),
    education: site.education.map((e) => ({
      qualification: e.qualification,
      institution: e.institution,
      years: yearRange(e.startYear, e.endYear),
    })),
    research: site.research,
    referees: referees.length
      ? referees.map((r) => ({ name: r.name, line: [r.role, r.organisation, r.phone].filter(Boolean).join(" · ") }))
      : null,
    footer: published ? `Rev. ${revision(published)} · Published ${publishedDate(published)}` : "Draft",
  };
}

/** "Rasaq Idris Olawale" → "Rasaq-Idris-Olawale-CV.pdf" (ASCII only, safe for Content-Disposition). */
export function cvFileName(name: string): string {
  const base = name
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  return `${base || "CV"}-CV.pdf`;
}
