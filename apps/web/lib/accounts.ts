import "server-only";
import { createEmptySite, NewPassword, OnboardingInput, UserRecord } from "@/content/schemas";
import { recordActivity } from "./activity";
import { getCredentials, setPassword } from "./credentials";
import { sites, users } from "./store";

export function getUserRecord(email: string): Promise<UserRecord | null> {
  return users().get(email);
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

  const record = UserRecord.parse({
    id: args.userId,
    slug: input.slug,
    role: args.role,
    name: input.name,
    createdAt: now.toISOString(),
  });

  // The page address and the email each go to the first account to ask; a second concurrent sign-up loses here.
  const created = await users().create({ email, record });
  if (created === "SLUG_TAKEN") return { ok: false, reason: "SLUG_TAKEN" };
  if (created === "EMAIL_TAKEN") {
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
    await sites().create(input.slug, draft);
  } catch (err) {
    await users().remove(email, input.slug);
    throw err;
  }

  await recordActivity({ type: "signup", slug: input.slug, email, detail: "Created the account", at: now });
  return { ok: true, record };
}

export type RegisterResult = { ok: true; record: UserRecord } | { ok: false; reason: "EMAIL_TAKEN" | "SLUG_TAKEN" };

/**
 * Self-service sign-up: one step creates the account (page address, empty draft, listing) and its password.
 * The page address doubles as the username, so the person can sign in with either it or the email; if that name is
 * already someone's username the account simply has none. An email that already has an account or a password is
 * refused, never overwritten, so nobody can set a password on an account that is not theirs.
 */
export async function registerAccount(args: {
  email: string;
  password: string;
  role: UserRecord["role"];
  input: OnboardingInput;
  now?: Date;
}): Promise<RegisterResult> {
  const email = args.email.trim().toLowerCase();
  const password = NewPassword.parse(args.password);
  const input = OnboardingInput.parse(args.input);

  if ((await getUserRecord(email)) || (await getCredentials(email))) return { ok: false, reason: "EMAIL_TAKEN" };

  const result = await onboard({ userId: crypto.randomUUID(), email, role: args.role, input, now: args.now });
  if (!result.ok) return { ok: false, reason: result.reason === "SLUG_TAKEN" ? "SLUG_TAKEN" : "EMAIL_TAKEN" };

  const saved = await setPassword({ email, password, username: input.slug, now: args.now });
  if (!saved.ok) await setPassword({ email, password, now: args.now });
  return { ok: true, record: result.record };
}
