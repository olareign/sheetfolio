import { z } from "zod";

/*
 * Single source of truth for every content type (PRD §4.2, §5).
 * These schemas drive server validation now, the generated CMS forms (Day 2)
 * and the types the public pages render (Day 3). Labels come from `.describe()`.
 *
 * Drafts must always be valid against `Site`, so optional-until-publish fields
 * default to empty values here; `PublishableSite` adds the publish-time rules.
 */

// ── Primitives ──────────────────────────────────────────────────────────────

export const CATEGORIES = [
  "building",
  "road",
  "external-works",
  "renovation",
  "community",
  "healthcare",
  "institutional",
] as const;
export const Category = z.enum(CATEGORIES);
export type Category = z.infer<typeof Category>;

export const CATEGORY_LABELS: Record<Category, string> = {
  building: "Building",
  road: "Road",
  "external-works": "External works",
  renovation: "Renovation",
  community: "Community",
  healthcare: "Healthcare",
  institutional: "Institutional",
};

const Id = z.string().min(1).max(64);
const Year = z.number().int().min(1950).max(2100);
const Text = (max: number) => z.string().trim().max(max);
const RequiredText = (max: number) => z.string().trim().min(1, "Required").max(max);

function endNotBeforeStart(v: { startYear: number; endYear?: number }, ctx: z.RefinementCtx) {
  if (v.endYear !== undefined && v.endYear < v.startYear) {
    ctx.addIssue({ code: "custom", path: ["endYear"], message: "End year is before start year" });
  }
}

// ── Slug ────────────────────────────────────────────────────────────────────

// Top-level routes and words we may want later. A slug must never shadow an app route.
// TODO(product): review the reserved list before public signup opens.
export const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "app",
  "auth",
  "dashboard",
  "login",
  "logout",
  "onboarding",
  "settings",
  "signup",
  "signin",
  "sitemap",
  "robots",
  "static",
  "public",
  "assets",
  "help",
  "about",
  "pricing",
  "terms",
  "privacy",
  "blog",
  "www",
  "siteproof",
  "_next",
  "favicon.ico",
]);

export const Slug = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "At least 3 characters")
  .max(40, "At most 40 characters")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers and single hyphens only")
  .refine((s) => !RESERVED_SLUGS.has(s), "This address is reserved");
export type Slug = z.infer<typeof Slug>;

// ── Collection items ────────────────────────────────────────────────────────

export const Experience = z
  .object({
    id: Id,
    company: RequiredText(120).describe("Company"),
    role: RequiredText(120).describe("Role"),
    startYear: Year.describe("Start year"),
    endYear: Year.optional().describe("End year (leave empty if current)"),
    notes: Text(1000).optional().describe("Notes"),
  })
  .superRefine(endNotBeforeStart);
export type Experience = z.infer<typeof Experience>;

export const ProjectImage = z.object({
  url: z.url().describe("Photo"),
  caption: Text(200).optional().describe("Caption"),
  isCover: z.boolean().default(false).describe("Cover photo"),
});
export type ProjectImage = z.infer<typeof ProjectImage>;

export const DrawingNo = z.string().regex(/^SP-\d{3,}$/, "Format SP-001");

export const Project = z
  .object({
    id: Id,
    drawingNo: DrawingNo.describe("Drawing no."),
    title: RequiredText(160).describe("Project title"),
    client: Text(160).optional().describe("Client"),
    experienceId: Id.optional().describe("Employer"),
    location: RequiredText(160).describe("Location"),
    lat: z.number().min(-90).max(90).optional().describe("Latitude"),
    lng: z.number().min(-180).max(180).optional().describe("Longitude"),
    category: Category.describe("Category"),
    role: RequiredText(120).describe("Your role"),
    scope: Text(2000).default("").describe("Scope of work"),
    startYear: Year.describe("Start year"),
    endYear: Year.optional().describe("End year"),
    status: z.enum(["completed", "ongoing"]).describe("Status"),
    images: z.array(ProjectImage).max(12, "At most 12 photos").default([]).describe("Site photos"),
    featured: z.boolean().default(false).describe("Featured"),
  })
  .superRefine((p, ctx) => {
    endNotBeforeStart(p, ctx);
    if (p.images.filter((i) => i.isCover).length > 1) {
      ctx.addIssue({ code: "custom", path: ["images"], message: "Only one photo can be the cover" });
    }
  });
export type Project = z.infer<typeof Project>;

export const Certification = z.object({
  id: Id,
  title: RequiredText(160).describe("Certificate title"),
  shortTitle: RequiredText(7).describe("Stamp text (max 7 characters)"),
  issuer: RequiredText(160).describe("Issuer"),
  year: Year.describe("Year"),
  fileUrl: z.url().optional().describe("Certificate scan"),
});
export type Certification = z.infer<typeof Certification>;

export const Education = z
  .object({
    id: Id,
    institution: RequiredText(160).describe("Institution"),
    qualification: RequiredText(120).describe("Qualification"),
    startYear: Year.describe("Start year"),
    endYear: Year.describe("End year"),
  })
  .superRefine(endNotBeforeStart);
export type Education = z.infer<typeof Education>;

export const Research = z.object({
  title: RequiredText(300).describe("Title"),
  year: Year.describe("Year"),
  summary: Text(2000).default("").describe("Summary"),
});
export type Research = z.infer<typeof Research>;

export const Referee = z.object({
  id: Id,
  name: RequiredText(120).describe("Name"),
  role: RequiredText(160).describe("Role"),
  organisation: Text(160).optional().describe("Organisation"),
  phone: Text(40).optional().describe("Phone"),
});
export type Referee = z.infer<typeof Referee>;

export const Testimonial = z.object({
  id: Id,
  author: RequiredText(120).describe("Author"),
  role: RequiredText(120).describe("Role"),
  company: Text(160).optional().describe("Company"),
  body: RequiredText(1200).describe("Testimonial"),
});
export type Testimonial = z.infer<typeof Testimonial>;

// ── Profile ─────────────────────────────────────────────────────────────────

export const PRIVATE_FIELDS = ["dateOfBirth", "placeOfBirth", "stateOfOrigin", "maritalStatus", "nationality"] as const;
export type PrivateField = (typeof PRIVATE_FIELDS)[number];

/** Every flag defaults to false: private details are hidden until the engineer opts in (PRD §8.1). */
export const Visibility = z.object({
  dateOfBirth: z.boolean().default(false),
  placeOfBirth: z.boolean().default(false),
  stateOfOrigin: z.boolean().default(false),
  maritalStatus: z.boolean().default(false),
  nationality: z.boolean().default(false),
  referees: z.boolean().default(false),
});
export type Visibility = z.infer<typeof Visibility>;

export const Profile = z.object({
  name: RequiredText(120).describe("Full name"),
  firstName: RequiredText(60).describe("First name (used in buttons)"),
  headline: RequiredText(80).describe("Headline"),
  summary: Text(1200).default("").describe("Summary"),
  location: Text(120).default("").describe("Base location"),
  availability: Text(80).optional().describe("Availability"),
  yearsExperience: z.number().int().min(0).max(70).default(0).describe("Years of experience"),
  avatar: z.url().optional().describe("Photo"),
  // E.164 digits without "+". Empty until the engineer sets it.
  whatsapp: z
    .string()
    .regex(/^(\d{8,15})?$/, "Digits only, with country code, e.g. 2347033435818")
    .default("")
    .describe("WhatsApp number"),
  whatsappMessage: Text(500).default("").describe("Prefilled WhatsApp message"),
  phone: Text(40).optional().describe("Phone"),
  publicEmail: z.email().describe("Public email"),
  private: z
    .object({
      dateOfBirth: Text(40).optional(),
      placeOfBirth: Text(120).optional(),
      stateOfOrigin: Text(120).optional(),
      maritalStatus: Text(40).optional(),
      nationality: Text(80).optional(),
    })
    .prefault({}),
  visibility: Visibility.prefault({}),
});
export type Profile = z.infer<typeof Profile>;

// ── Site document ───────────────────────────────────────────────────────────

export const SiteSettings = z.object({
  theme: z.enum(["sheet", "blueprint"]).default("sheet"),
  status: z.enum(["draft", "published", "suspended"]).default("draft"),
});

export const Site = z.object({
  profile: Profile,
  competencies: z.array(RequiredText(80)).max(12).default([]),
  experiences: z.array(Experience).default([]),
  projects: z.array(Project).max(100).default([]),
  certifications: z.array(Certification).default([]),
  education: z.array(Education).default([]),
  research: Research.optional(),
  referees: z.array(Referee).default([]),
  testimonials: z.array(Testimonial).default([]),
  settings: SiteSettings.prefault({}),
  updatedAt: z.iso.datetime(),
  publishedAt: z.iso.datetime().optional(),
});
export type Site = z.infer<typeof Site>;
/** What callers may pass before defaults are applied. */
export type SiteInput = z.input<typeof Site>;

/**
 * Publish-time rules on top of `Site`: the public page cannot render without these.
 * TODO(product): confirm the minimum a page needs before it can go live.
 */
export const PublishableSite = Site.superRefine((site, ctx) => {
  const need: [keyof Profile, string][] = [
    ["summary", "Add a summary before publishing"],
    ["location", "Add your base location before publishing"],
    ["whatsapp", "Add a WhatsApp number before publishing"],
  ];
  for (const [field, message] of need) {
    if (!site.profile[field]) ctx.addIssue({ code: "custom", path: ["profile", field], message });
  }
});

// ── Collections registry (PRD §4.2) ─────────────────────────────────────────

export const collections = {
  experiences: { label: "Experience", schema: Experience, sortable: true },
  projects: { label: "Projects", schema: Project, sortable: true },
  certifications: { label: "Certifications", schema: Certification, sortable: true },
  education: { label: "Education", schema: Education, sortable: true },
  testimonials: { label: "Testimonials", schema: Testimonial, sortable: true },
  referees: { label: "Referees", schema: Referee, sortable: true },
} as const;
export type CollectionName = keyof typeof collections;
export type CollectionItem<N extends CollectionName> = z.infer<(typeof collections)[N]["schema"]>;
export const CollectionNameSchema = z.enum(Object.keys(collections) as [CollectionName, ...CollectionName[]]);

// ── Leads ───────────────────────────────────────────────────────────────────

export const LeadInput = z.object({
  name: RequiredText(120),
  email: z.email(),
  company: Text(160).optional(),
  message: RequiredText(4000),
});
export type LeadInput = z.infer<typeof LeadInput>;

export const Lead = LeadInput.extend({
  id: Id,
  createdAt: z.iso.datetime(),
  read: z.boolean().default(false),
});
export type Lead = z.infer<typeof Lead>;

// ── Accounts ────────────────────────────────────────────────────────────────

export const UserRecord = z.object({
  id: Id,
  slug: Slug,
  role: z.enum(["engineer", "admin"]),
  name: RequiredText(120),
  createdAt: z.iso.datetime(),
});
export type UserRecord = z.infer<typeof UserRecord>;

// ── Onboarding ──────────────────────────────────────────────────────────────

export const OnboardingInput = z.object({
  slug: Slug,
  name: RequiredText(120),
  firstName: RequiredText(60),
  headline: RequiredText(80),
});
export type OnboardingInput = z.infer<typeof OnboardingInput>;

/** A brand-new, valid draft: only the onboarding answers filled in, everything private hidden. */
export function createEmptySite(input: {
  name: string;
  firstName: string;
  headline: string;
  publicEmail: string;
  now: Date;
}): Site {
  return Site.parse({
    profile: {
      name: input.name,
      firstName: input.firstName,
      headline: input.headline,
      publicEmail: input.publicEmail,
      whatsappMessage: `Hi ${input.firstName}, I saw your profile on Siteproof and would like to discuss a project.`,
    },
    updatedAt: input.now.toISOString(),
  });
}
