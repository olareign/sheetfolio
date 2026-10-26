"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { getUserRecord } from "@/lib/accounts";
import { getCredentials } from "@/lib/credentials";
import { sendEmail } from "@/lib/email";
import { publicSiteUrl } from "@/lib/env";
import { requestPasswordReset } from "@/lib/password-reset";
import { allowResetRequest, clientIp } from "@/lib/ratelimit";
import { credentialKv, credentialStore } from "@/lib/store";

export type ForgotState = { done?: boolean; error?: string; identifier?: string };

/**
 * Always answers the same way. The lookup, the rate limit and the email all run after the response,
 * so neither the message nor its timing reveals whether an account exists.
 */
export async function requestReset(_prev: ForgotState, formData: FormData): Promise<ForgotState> {
  const identifier = String(formData.get("identifier") ?? "").trim();
  if (!identifier) return { error: "Enter your username or email", identifier };

  const ip = clientIp(await headers());
  after(() =>
    requestPasswordReset(identifier, {
      kv: credentialKv(),
      creds: credentialStore(),
      accountExists: async (email) => Boolean((await getCredentials(email)) ?? (await getUserRecord(email))),
      allow: (id) => allowResetRequest(id, ip),
      send: sendEmail,
      origin: publicSiteUrl().origin,
    }),
  );
  return { done: true, identifier };
}
