import "server-only";
import { createResetToken, RESET_TOKEN_MINUTES, resolveEmail, type CredStore, type KV } from "./credential-store";
import type { sendEmail } from "./email";
import { passwordChangedEmail, passwordResetEmail } from "./email-templates";

type Send = typeof sendEmail;

type RequestDeps = {
  /** Where reset tokens live. */
  kv: KV;
  /** Where accounts and usernames live. */
  creds: CredStore;
  /** True when the email belongs to a Dosinex account (a page, or a password). */
  accountExists: (email: string) => Promise<boolean>;
  /** Rate limit for this identifier and caller; false means "slow down". */
  allow: (identifier: string) => Promise<boolean>;
  send: Send;
  /** Absolute base URL, e.g. https://dosinex.vercel.app */
  origin: string;
  now?: Date;
};

/**
 * Emails a reset link to the account behind a username or email, if there is one.
 *
 * It returns nothing and never throws: the caller shows the same message whether the account
 * exists, the request was rate limited or the email failed, so the form cannot be used to find out
 * who has an account. A failed send is logged without the address.
 */
export async function requestPasswordReset(identifier: string, deps: RequestDeps): Promise<void> {
  const id = identifier.trim();
  if (!id || id.length > 254) return;
  try {
    if (!(await deps.allow(id))) return;
    const email = await resolveEmail(deps.creds, id);
    if (!email || !(await deps.accountExists(email))) return;

    const token = await createResetToken(deps.kv, email, deps.now);
    const url = `${deps.origin.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(token)}`;
    await deps.send({ to: email, ...passwordResetEmail({ url, email, expiresInMinutes: RESET_TOKEN_MINUTES }) });
  } catch (err) {
    console.error("[auth] password reset request failed:", err instanceof Error ? err.message : err);
  }
}

/**
 * Tells an account's owner that its password changed, with a way back in if it was not them.
 * A failure is logged and swallowed: the change has already happened and must not be reported as failed.
 */
export async function sendPasswordChangedNotice(
  email: string,
  deps: { send: Send; origin: string; now?: Date },
): Promise<void> {
  try {
    const resetUrl = `${deps.origin.replace(/\/$/, "")}/forgot-password`;
    const content = passwordChangedEmail({ email, changedAt: deps.now ?? new Date(), resetUrl });
    await deps.send({ to: email, ...content });
  } catch (err) {
    console.error("[auth] password-changed notice failed:", err instanceof Error ? err.message : err);
  }
}
