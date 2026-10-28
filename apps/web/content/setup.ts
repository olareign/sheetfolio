import type { CvTemplateId } from "./cv-templates";

/*
 * What the setup guide and the dashboard menu share. Kept free of React so server components (the dashboard layout
 * and the guide's page) can import it; the guide itself is a client component and cannot be called from the server.
 */

export type SetupData = {
  slug: string;
  /** The page's full address, for copying and sharing. */
  pageUrl: string;
  headline: string;
  summary: string;
  location: string;
  availability: string;
  yearsExperience: string;
  avatar: string;
  whatsapp: string;
  publicEmail: string;
  phone: string;
  cvTemplate: CvTemplateId;
  counts: { projects: number; experiences: number; education: number; certifications: number };
  projects: { id: string; title: string }[];
  published: boolean;
  /** Changes whenever the draft is saved, so each step's boxes start again from what is stored. */
  version: string;
};

export const STEP_IDS = ["start", "about", "contact", "work", "cv", "publish"] as const;
export type StepId = (typeof STEP_IDS)[number];

/** What a page needs before it can go live: the same three things the publish check asks for. */
export function missingRequired(d: Pick<SetupData, "summary" | "location" | "whatsapp">) {
  return [
    !d.summary.trim() && { step: "about" as StepId, label: "A short summary of who you are" },
    !d.location.trim() && { step: "about" as StepId, label: "Your base location" },
    !d.whatsapp.trim() && { step: "contact" as StepId, label: "A WhatsApp number" },
  ].filter((x): x is { step: StepId; label: string } => Boolean(x));
}

/**
 * A new page is held on the setup guide until it has what it needs to go live. Skipping lifts the hold, and a page
 * that is already live never gets locked behind the guide.
 */
export function setupLocked(
  d: Pick<SetupData, "summary" | "location" | "whatsapp" | "published"> & { skipped: boolean },
) {
  return !d.skipped && !d.published && missingRequired(d).length > 0;
}
