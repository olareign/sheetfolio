import "server-only";
import { z } from "zod";
import { Profile } from "@/content/schemas";
import { mutateDraft } from "./collections";
import { SiteError } from "./site";

/** A box left empty means "none": a cleared optional field must clear the stored value, not keep the old one. */
const blankToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);
const optional = <T extends z.ZodType>(schema: T) => z.preprocess(blankToUndefined, schema.optional());

/** "About you" step of the setup guide. */
export const SetupAbout = z.object({
  headline: Profile.shape.headline,
  summary: Profile.shape.summary,
  location: Profile.shape.location,
  availability: optional(z.string().trim().max(80)),
  avatar: optional(z.url()),
  yearsExperience: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : Number(v)),
    z.number().int().min(0).max(70).optional(),
  ),
});

/** "How to reach you" step. */
export const SetupContact = z.object({
  whatsapp: Profile.shape.whatsapp,
  publicEmail: Profile.shape.publicEmail,
  phone: optional(z.string().trim().max(40)),
});

const PARTS = { about: SetupAbout, contact: SetupContact } as const;
export type SetupPart = keyof typeof PARTS;

/**
 * Saves one step of the setup guide into the draft's profile. Only the fields of that step change, and the whole
 * profile is checked again afterwards, so a step can never leave the draft in a state the editor would refuse.
 */
export async function saveSetupProfile(
  slug: string,
  part: SetupPart,
  data: unknown,
  now: Date = new Date(),
): Promise<void> {
  const schema = PARTS[part];
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new SiteError("INVALID", "Invalid details", parsed.error.issues);
  const values = parsed.data as Record<string, unknown>;
  await mutateDraft(
    slug,
    (draft) => {
      // Assign each of the step's keys, including cleared ones (undefined), over the stored profile.
      const patch: Record<string, unknown> = {};
      for (const key of Object.keys(schema.shape)) patch[key] = values[key];
      if (part === "about" && patch.yearsExperience === undefined)
        patch.yearsExperience = draft.profile.yearsExperience;
      const profile = Profile.safeParse({ ...draft.profile, ...patch });
      if (!profile.success) throw new SiteError("INVALID", "Invalid details", profile.error.issues);
      return { ...draft, profile: profile.data };
    },
    now,
  );
}

/** "Skip" on the setup guide: stops the dashboard holding the owner on the guide. The guide stays in the menu. */
export async function skipSetup(slug: string, now: Date = new Date()): Promise<void> {
  await mutateDraft(slug, (draft) => ({ ...draft, settings: { ...draft.settings, setupSkipped: true } }), now);
}
