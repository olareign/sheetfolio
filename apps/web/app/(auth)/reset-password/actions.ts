"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { NewPassword } from "@/content/schemas";
import { resetPassword } from "@/lib/credentials";
import { sendEmail } from "@/lib/email";
import { publicSiteUrl } from "@/lib/env";
import { sendPasswordChangedNotice } from "@/lib/password-reset";

export type ResetState = { error?: string; expired?: boolean };

const Fields = z
  .object({ token: z.string().min(1), newPassword: NewPassword, confirm: z.string() })
  .refine((v) => v.newPassword === v.confirm, { path: ["confirm"], message: "The two passwords don't match" });

export async function completeReset(_prev: ResetState, formData: FormData): Promise<ResetState> {
  const fields = Fields.safeParse({
    token: String(formData.get("token") ?? ""),
    newPassword: String(formData.get("newPassword") ?? ""),
    confirm: String(formData.get("confirm") ?? ""),
  });
  if (!fields.success) return { error: fields.error.issues[0]?.message };

  const result = await resetPassword(fields.data.token, fields.data.newPassword);
  if (!result.ok) return { expired: true };

  after(() => sendPasswordChangedNotice(result.email, { send: sendEmail, origin: publicSiteUrl().origin }));
  redirect("/login?reset=1");
}
