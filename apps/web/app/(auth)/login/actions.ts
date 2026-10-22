"use server";

import { AuthError, CredentialsSignin } from "next-auth";
import { z } from "zod";
import { signIn } from "@/lib/auth";

export type PasswordLoginState = { error?: string; identifier?: string };

const PasswordInput = z.object({
  identifier: z.string().trim().min(1, "Enter your username or email").max(254),
  password: z.string().min(1, "Enter your password").max(128),
});

export async function signInWithPassword(_prev: PasswordLoginState, formData: FormData): Promise<PasswordLoginState> {
  const identifier = String(formData.get("identifier") ?? "").trim();
  const parsed = PasswordInput.safeParse({ identifier, password: String(formData.get("password") ?? "") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message, identifier };

  try {
    await signIn("credentials", { ...parsed.data, redirectTo: "/dashboard" });
  } catch (err) {
    // A wrong password surfaces as a CredentialsSignin exception, not a redirect URL.
    if (err instanceof CredentialsSignin) {
      return {
        error:
          err.code === "too_many_attempts"
            ? "Too many attempts. Wait 15 minutes and try again, or reset your password."
            : "Incorrect username or password.",
        identifier,
      };
    }
    if (err instanceof AuthError) {
      console.error("[auth] password sign-in failed:", err.type);
      return { error: "We couldn't sign you in. Try again in a minute.", identifier };
    }
    throw err; // the success redirect
  }
  return { identifier };
}
