import "server-only";
import { z } from "zod";
import { Certification, Education, Experience, Profile } from "@/content/schemas";
import { mutateDraft } from "../collections";
import { SiteError } from "../site";
import { stampFor } from "./parse";

// What the review screen sends back: everything as the text the person left in each box.
const Text = z.string().trim().max(2000);
const Years = z.object({ startYear: Text, endYear: Text });
export const CvImportApply = z.object({
  profile: z.object({
    name: Text,
    headline: Text,
    summary: Text,
    location: Text,
    phone: Text,
    yearsExperience: Text,
  }),
  experiences: z.array(z.object({ role: Text, company: Text, notes: Text }).and(Years)).max(30),
  education: z.array(z.object({ qualification: Text, institution: Text }).and(Years)).max(15),
  certifications: z.array(z.object({ title: Text, issuer: Text, year: Text })).max(30),
});
export type CvImportApply = z.infer<typeof CvImportApply>;

export type ApplyResult = { experiences: number; education: number; certifications: number; profile: boolean };

const num = (s: string): number | undefined => (s === "" ? undefined : Number(s));
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * Adds the reviewed entries to the draft in one write. The person's own words win: blank profile boxes change nothing,
 * and an entry already on the page (same role, employer and start year) is not added twice. Anything invalid is refused
 * with the box it belongs to, so the review screen can point at it.
 */
export async function applyCvImport(slug: string, data: unknown, now: Date = new Date()): Promise<ApplyResult> {
  const parsed = CvImportApply.safeParse(data);
  if (!parsed.success) throw new SiteError("INVALID", "Invalid import", parsed.error.issues);
  const input = parsed.data;
  const issues: z.core.$ZodIssue[] = [];

  const experiences = input.experiences.map((e, i) => {
    const r = Experience.safeParse({
      id: crypto.randomUUID(),
      role: e.role,
      company: e.company,
      startYear: num(e.startYear),
      endYear: num(e.endYear),
      ...(e.notes && { notes: e.notes }),
    });
    if (!r.success) for (const x of r.error.issues) issues.push({ ...x, path: ["experiences", i, ...x.path] });
    return r.success ? r.data : null;
  });
  const education = input.education.map((e, i) => {
    const r = Education.safeParse({
      id: crypto.randomUUID(),
      qualification: e.qualification,
      institution: e.institution,
      startYear: num(e.startYear),
      endYear: num(e.endYear),
    });
    if (!r.success) for (const x of r.error.issues) issues.push({ ...x, path: ["education", i, ...x.path] });
    return r.success ? r.data : null;
  });
  const certifications = input.certifications.map((c, i) => {
    const r = Certification.safeParse({
      id: crypto.randomUUID(),
      title: c.title,
      shortTitle: stampFor(c.title),
      issuer: c.issuer,
      year: num(c.year),
    });
    if (!r.success) for (const x of r.error.issues) issues.push({ ...x, path: ["certifications", i, ...x.path] });
    return r.success ? r.data : null;
  });
  if (issues.length) throw new SiteError("INVALID", "Some entries need fixing", issues);

  let added: ApplyResult = { experiences: 0, education: 0, certifications: 0, profile: false };
  await mutateDraft(
    slug,
    (draft) => {
      const nextExperiences = [...draft.experiences];
      for (const e of experiences) {
        if (
          e &&
          !nextExperiences.some(
            (x) => same(x.role, e.role) && same(x.company, e.company) && x.startYear === e.startYear,
          )
        ) {
          nextExperiences.push(e);
          added.experiences += 1;
        }
      }
      const nextEducation = [...draft.education];
      for (const e of education) {
        if (
          e &&
          !nextEducation.some((x) => same(x.qualification, e.qualification) && same(x.institution, e.institution))
        ) {
          nextEducation.push(e);
          added.education += 1;
        }
      }
      const nextCerts = [...draft.certifications];
      for (const c of certifications) {
        if (c && !nextCerts.some((x) => same(x.title, c.title) && x.year === c.year)) {
          nextCerts.push(c);
          added.certifications += 1;
        }
      }

      const p = input.profile;
      const patch: Record<string, unknown> = {};
      if (p.name) patch.name = p.name;
      if (p.name && !same(p.name, draft.profile.name)) patch.firstName = p.name.split(/\s+/)[0];
      if (p.headline) patch.headline = p.headline;
      if (p.summary) patch.summary = p.summary;
      if (p.location) patch.location = p.location;
      if (p.phone) patch.phone = p.phone;
      if (p.yearsExperience) patch.yearsExperience = Number(p.yearsExperience);
      const profile = Profile.safeParse({ ...draft.profile, ...patch });
      if (!profile.success) {
        throw new SiteError(
          "INVALID",
          "Some details need fixing",
          profile.error.issues.map((x) => ({ ...x, path: ["profile", ...x.path] })),
        );
      }
      added = { ...added, profile: Object.keys(patch).length > 0 };
      return {
        ...draft,
        profile: profile.data,
        experiences: nextExperiences,
        education: nextEducation,
        certifications: nextCerts,
      };
    },
    now,
  );
  return added;
}
