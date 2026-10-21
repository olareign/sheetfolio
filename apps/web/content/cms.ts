import { needsCover } from "./covers";
import { describeFields, type DescribeOptions, type FieldSpec } from "./form-spec";
import { CATEGORY_LABELS, collections, type CollectionItem, type CollectionName, type Site } from "./schemas";

/*
 * How each collection appears in the CMS: list rows, special fields, defaults for "+ New".
 * Validation stays in schemas.ts; this file is presentation only and safe on the client.
 */

export type RowStatus = { label: string; tone: "done" | "ongoing" | "default" };
export type ListRow = { id: string; title: string; subtitle?: string; status?: RowStatus; /** A nudge shown under the title, e.g. a missing picture. */ note?: string };

type Config<N extends CollectionName> = {
  singular: string;
  /** Field shown as the editor heading. */
  titleField: string;
  empty: string;
  row: (item: CollectionItem<N>) => Omit<ListRow, "id">;
  fieldOptions?: DescribeOptions;
  /** Help text under specific fields. */
  hints?: Record<string, string>;
  newItem: (site: Site, now: Date) => Record<string, unknown>;
};

export function yearRange(start: number, end?: number, current = "now"): string {
  if (end === undefined) return `${start} – ${current}`;
  return start === end ? String(start) : `${start} – ${end}`;
}

export const cms: { [N in CollectionName]: Config<N> } = {
  experiences: {
    singular: "role",
    titleField: "company",
    hints: { endYear: "Leave empty if this is your current role" },
    empty: "Add your first role, most recent first.",
    row: (e) => ({
      title: e.company,
      subtitle: `${e.role} · ${yearRange(e.startYear, e.endYear)}`,
      status: e.endYear === undefined ? { label: "Current", tone: "ongoing" } : undefined,
    }),
    newItem: (site, now) => ({ role: site.profile.headline, startYear: now.getFullYear() }),
  },
  projects: {
    singular: "project",
    titleField: "title",
    empty: "Add your first project. Photos can come later.",
    row: (p) => ({
      title: p.title,
      subtitle: `${CATEGORY_LABELS[p.category]} · ${yearRange(p.startYear, p.endYear, "")}`.replace(/ – $/, ""),
      status: p.status === "ongoing" ? { label: "Ongoing", tone: "ongoing" } : { label: "Completed", tone: "done" },
      note: needsCover(p) ? "Needs a cover: add a website link or a photo" : undefined,
    }),
    hints: {
      websiteUrl: "Optional. We read the site's title, description and picture to fill in your project page for you.",
      images: "Optional. Your own photos replace the website picture.",
    },
    fieldOptions: { relations: { experienceId: "experiences" }, links: ["websiteUrl"] },
    newItem: (site, now) => ({
      role: site.profile.headline,
      category: "building",
      status: "completed",
      startYear: now.getFullYear(),
      images: [],
      featured: false,
    }),
  },
  certifications: {
    singular: "certification",
    titleField: "title",
    empty: "Add a certification. It appears as a stamp on your page.",
    row: (c) => ({ title: c.title, subtitle: `${c.issuer} · ${c.year}` }),
    fieldOptions: { uploads: { fileUrl: "document" } },
    newItem: (_site, now) => ({ year: now.getFullYear() }),
  },
  education: {
    singular: "qualification",
    titleField: "qualification",
    empty: "Add your degrees and school certificates.",
    row: (e) => ({
      title: e.qualification,
      subtitle: `${e.institution} · ${yearRange(e.startYear, e.endYear)}`,
    }),
    newItem: () => ({}),
  },
  testimonials: {
    singular: "testimonial",
    titleField: "author",
    empty: "Add a testimonial from a client or employer.",
    row: (t) => ({ title: t.author, subtitle: [t.role, t.company].filter(Boolean).join(" · ") }),
    newItem: () => ({}),
  },
  referees: {
    singular: "referee",
    titleField: "name",
    empty: "Add referees. They stay private unless you show them in Profile.",
    row: (r) => ({ title: r.name, subtitle: [r.role, r.organisation].filter(Boolean).join(" · ") }),
    newItem: () => ({}),
  },
};

export function collectionFields(name: CollectionName): FieldSpec[] {
  return describeFields(collections[name].schema, { skip: ["id"], ...cms[name].fieldOptions });
}

export function listRows<N extends CollectionName>(name: N, items: readonly CollectionItem<N>[]): ListRow[] {
  const config = cms[name] as Config<N>;
  return items.map((item) => ({ id: item.id, ...config.row(item) }));
}

/** Options for a relation select, e.g. a project's employer. */
export function relationOptions(site: Site, name: CollectionName): { value: string; label: string }[] {
  return listRows(name, site[name]).map((r) => ({
    value: r.id,
    label: r.subtitle ? `${r.title} · ${r.subtitle}` : r.title,
  }));
}

export type PublishState = "live" | "changes" | "unpublished" | "suspended";

/** "Unpublished changes" when the draft was saved after the last publish (PRD §4.3). */
export function publishState(
  draft: Pick<Site, "updatedAt" | "settings">,
  published: Pick<Site, "publishedAt" | "settings"> | null,
): PublishState {
  if (draft.settings.status === "suspended" || published?.settings.status === "suspended") return "suspended";
  if (!published?.publishedAt) return "unpublished";
  return Date.parse(draft.updatedAt) > Date.parse(published.publishedAt) ? "changes" : "live";
}

const SETTINGS_FIELDS = new Set(["whatsapp", "whatsappMessage", "publicEmail"]);

/** Where to fix a validation problem reported at publish time, e.g. "profile.whatsapp" → settings. */
export function issueHref(path: string): string {
  const [head, field] = path.split(".");
  if (head === "profile") return SETTINGS_FIELDS.has(field ?? "") ? "/dashboard/settings" : "/dashboard/profile";
  if (head && head in collections) return `/dashboard/${head}`;
  return "/dashboard";
}
