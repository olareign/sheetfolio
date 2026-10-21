"use server";

import { z } from "zod";
import { NewPassword, Username } from "@/content/schemas";
import { changePassword, getCredentials, setPassword } from "@/lib/credentials";
import { requireUser } from "@/lib/session";

export type PasswordState = { error?: string; saved?: boolean };

const Fields = z.object({ newPassword: NewPassword, confirm: z.string() }).refine((v) => v.newPassword === v.confirm, {
  path: ["confirm"],
  message: "The two passwords don't match",
});

/**
 * Sets a password for the signed-in account (first time: also picks a username) or changes it
 * (current password required). Acts only on the caller's own email, taken from the session.
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
    return { saved: true };
  }

  const username = Username.safeParse(String(formData.get("username") ?? ""));
  if (!username.success) return { error: `Username: ${username.error.issues[0]?.message}` };
  const result = await setPassword({ email, password: fields.data.newPassword, username: username.data });
  if (!result.ok) return { error: "That username is taken. Choose another." };
  return { saved: true };
}
