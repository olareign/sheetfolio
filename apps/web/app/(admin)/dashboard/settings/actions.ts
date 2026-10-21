"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { NewPassword, Username } from "@/content/schemas";
import { refreshSession } from "@/lib/auth";
import { changePassword, getCredentials, setPassword } from "@/lib/credentials";
import { sendEmail } from "@/lib/email";
import { publicSiteUrl } from "@/lib/env";
import { sendPasswordChangedNotice } from "@/lib/password-reset";
import { requireUser } from "@/lib/session";

export type PasswordState = { error?: string; saved?: boolean };

const Fields = z.object({ newPassword: NewPassword, confirm: z.string() }).refine((v) => v.newPassword === v.confirm, {
  path: ["confirm"],
  message: "The two passwords don't match",
});

/**
 * Sets a password for the signed-in account (first time: also picks a username) or changes it
 * (current password required; every other device is signed out and the owner is emailed). Acts only on
 * the caller's own email, taken from the session.
 */
export async function savePassword(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  const { email } = await requireUser();
  const fields = Fields.safeParse({
    newPassword: String(formData.get("newPassword") ?? ""),
    confirm: String(formData.get("confirm") ?? ""),
  });
  if (!fields.success) return { error: fields.error.issues[0]?.message };

  const existing = await getCredentials(email);
  if (existing) {
    const result = await changePassword(email, String(formData.get("currentPassword") ?? ""), fields.data.newPassword);
    if (!result.ok) return { error: "Your current password is not correct." };
    // The change signed every session out, this one included: re-stamp it so this device stays signed in.
    await refreshSession({});
    after(() => sendPasswordChangedNotice(email, { send: sendEmail, origin: publicSiteUrl().origin }));
    // Redirect rather than return. A cookie set in an action makes Next re-render this page in the same
    // response using the browser's old, now stale cookie, which would bounce to /login. A redirect makes
    // the next request carry the new cookie.
    redirect("/dashboard/settings?changed=password");
  }

  const username = Username.safeParse(String(formData.get("username") ?? ""));
  if (!username.success) return { error: `Username: ${username.error.issues[0]?.message}` };
  const result = await setPassword({ email, password: fields.data.newPassword, username: username.data });
  if (!result.ok) return { error: "That username is taken. Choose another." };
  return { saved: true };
}
