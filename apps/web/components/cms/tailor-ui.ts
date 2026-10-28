import type { CvTemplateId } from "@/content/cv-templates";
import type { TailorOverlay, TailorResult } from "@/content/tailor";

/** The shapes the tailoring screens share. Plain data, so the server page can build them for the client. */

/** What the person's page says today, to label the items and to offer "use my own wording". */
export type TailorFacts = {
  headline: string;
  summary: string;
  experiences: { id: string; title: string; sub: string; notes: string }[];
  projects: { id: string; title: string; sub: string }[];
  certifications: { id: string; title: string; sub: string }[];
};

export type BankItem = {
  id: string;
  name: string;
  jobTitle: string;
  jobCompany: string;
  jobSource: string;
  updatedAt: string;
  overlay: TailorOverlay;
};

export type Review = {
  /** Set when a saved version is being edited, absent for a fresh result. */
  editingId?: string;
  name: string;
  overlay: TailorOverlay;
  /** The job as the AI read it (absent when editing a saved version, which keeps its own job details). */
  result?: TailorResult;
  job: { title: string; company: string; source: string };
};

export type TemplateChoice = { id: CvTemplateId; label: string };

export const defaultName = (job: { title: string; company: string }): string =>
  ([job.company, job.title].filter(Boolean).join(" · ") || "Tailored CV").slice(0, 40);
