import type { CvTemplateId } from "@/content/cv-templates";

/*
 * How each CV template looks, as plain data. One renderer (cv-pdf.tsx) draws all of them, so the four
 * can only differ in what is listed here and cannot drift apart on the ATS basics: one column, real text,
 * standard section names. Tinos and Arimo are metric twins of Times and Helvetica.
 */

export type CvSection =
  | "summary"
  | "skills"
  | "experience"
  | "projects"
  | "education"
  | "certifications"
  | "details"
  | "research"
  | "referees";

export type CvLayout = {
  /** An embedded family (lib/fonts); bold and italic come from its weight and style. */
  font: "Tinos" | "Arimo";
  /** Colour of the name and section headings. Body text is always near-black. */
  accent: string;
  nameSize: number;
  nameAlign: "left" | "center";
  headingSize: number;
  /** A thin line under each section heading. */
  headingRule: boolean;
  bodySize: number;
  lineHeight: number;
  padding: number;
  sections: CvSection[];
  /** How many projects get a full entry with their scope of work; the rest are one line each. */
  detailedProjects: number;
};

export const CV_LAYOUTS: Record<CvTemplateId, CvLayout> = {
  classic: {
    font: "Tinos",
    accent: "#000000",
    nameSize: 20,
    nameAlign: "center",
    headingSize: 11,
    headingRule: true,
    bodySize: 10.5,
    lineHeight: 1.35,
    padding: 48,
    sections: [
      "summary",
      "experience",
      "projects",
      "education",
      "certifications",
      "skills",
      "details",
      "research",
      "referees",
    ],
    detailedProjects: 0,
  },
  modern: {
    font: "Arimo",
    accent: "#1F3A5F",
    nameSize: 22,
    nameAlign: "left",
    headingSize: 10.5,
    headingRule: true,
    bodySize: 10,
    lineHeight: 1.4,
    padding: 46,
    sections: [
      "summary",
      "skills",
      "experience",
      "projects",
      "education",
      "certifications",
      "details",
      "research",
      "referees",
    ],
    detailedProjects: 0,
  },
  projects: {
    font: "Arimo",
    accent: "#000000",
    nameSize: 20,
    nameAlign: "left",
    headingSize: 10.5,
    headingRule: true,
    bodySize: 10,
    lineHeight: 1.4,
    padding: 46,
    sections: [
      "summary",
      "projects",
      "experience",
      "skills",
      "education",
      "certifications",
      "details",
      "research",
      "referees",
    ],
    detailedProjects: 6,
  },
  minimal: {
    font: "Arimo",
    accent: "#000000",
    nameSize: 20,
    nameAlign: "left",
    headingSize: 10.5,
    headingRule: false,
    bodySize: 10,
    lineHeight: 1.4,
    padding: 50,
    sections: [
      "summary",
      "experience",
      "projects",
      "skills",
      "education",
      "certifications",
      "details",
      "research",
      "referees",
    ],
    detailedProjects: 0,
  },
};
