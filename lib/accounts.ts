import "server-only";
import { createEmptySite, OnboardingInput, UserRecord } from "@/content/schemas";
import { keys, redis } from "./redis";
import { claimSlug, SiteError } from "./site";

export async function getUserRecord(email: string): Promise<UserRecord | null> {
  const key = keys.user(email);
  const raw = await redis().get<unknown>(key);
  if (raw === null) return null;
  const parsed = UserRecord.safeParse(raw);
  if (!parsed.success) throw new SiteError("INVALID", `Stored ${key} is invalid`, parsed.error.issues);
  return parsed.data;
}

export type OnboardResult =
  | { ok: true; record: UserRecord }
  | { ok: false; reason: "SLUG_TAKEN" }
  | { ok: false; reason: "ALREADY_ONBOARDED"; slug: string };

/**
 * Claims the slug, writes `user:{email}`, creates an empty draft and registers the site.
 * Each step that can lose a race is NX-guarded; partial writes are rolled back on failure.
 */
export async function onboard(args: {
  userId: string;
  email: string;
  role: UserRecord["role"];
  input: OnboardingInput;
  now?: Date;
}): Promise<OnboardResult> {
  const now = args.now ?? new Date();
  const input = OnboardingInput.parse(args.input);
  const email = args.email.trim().toLowerCase();

  const existing = await getUserRecord(email);
  if (existing) return { ok: false, reason: "ALREADY_ONBOARDED", slug: existing.slug };

  if (!(await claimSlug(input.slug, args.userId))) return { ok: false, reason: "SLUG_TAKEN" };

  const record = UserRecord.parse({
    id: args.userId,
    slug: input.slug,
    role: args.role,
    name: input.name,
    createdAt: now.toISOString(),
  });

  // A second concurrent onboarding for the same email loses here and releases its slug.
  const created = await redis().set(keys.user(email), record, { nx: true });
  if (created !== "OK") {
    await redis().del(keys.slug(input.slug));
    const winner = await getUserRecord(email);
    return { ok: false, reason: "ALREADY_ONBOARDED", slug: winner?.slug ?? input.slug };
  }

  const draft = createEmptySite({
    name: input.name,
    firstName: input.firstName,
    headline: input.headline,
    publicEmail: email,
    now,
  });

  try {
    const tx = redis().multi();
    tx.set(keys.draft(input.slug), draft);
    tx.sadd(keys.sites(), input.slug);
    await tx.exec();
  } catch (err) {
    await redis().del(keys.user(email), keys.slug(input.slug));
    throw err;
  }

  return { ok: true, record };
}
