/*
 * The CV layouts a page can offer (one PDF renderer per id lives in lib/cv-templates/). Kept free of
 * imports so the schemas can use the ids. All four follow the same ATS rules: one column, real text,
 * built-in fonts, standard section names, no photos, icons, tables or text boxes.
 */

export const CV_TEMPLATE_IDS = ["classic", "modern", "projects", "minimal"] as const;
export type CvTemplateId = (typeof CV_TEMPLATE_IDS)[number];

export const DEFAULT_CV_TEMPLATE: CvTemplateId = "modern";

export const CV_TEMPLATES: Record<CvTemplateId, { label: string; description: string }> = {
  classic: {
    label: "Classic",
    description: "Traditional serif. Government, law, academia, engineering.",
  },
  modern: {
    label: "Modern",
    description: "Clean sans-serif with one accent colour. Tech and most professions.",
  },
  projects: {
    label: "Projects first",
    description: "Leads with your projects. Engineers, freelancers, career changers.",
  },
  minimal: {
    label: "Minimal",
    description: "Plain sans-serif, no lines or colour. Maximum compatibility.",
  },
};

/** The id for a query-string value, or null when it is missing or unknown. */
export function parseCvTemplate(value: unknown): CvTemplateId | null {
  return CV_TEMPLATE_IDS.find((id) => id === value) ?? null;
}
