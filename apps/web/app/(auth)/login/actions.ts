"use server";

import { AuthError, CredentialsSignin } from "next-auth";
import { z } from "zod";
import { signIn } from "@/lib/auth";

export type LoginState = { error?: string; email?: string };
export type PasswordLoginState = { error?: string; identifier?: string };

const LoginInput = z.object({ email: z.email("Enter a valid email address") });

export async function requestMagicLink(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const parsed = LoginInput.safeParse({ email });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message, email };

  try {
    // On success Auth.js redirects to /login?sent=1 (a thrown redirect, which must propagate).
    await signIn("resend", { email: parsed.data.email, redirectTo: "/dashboard" });
  } catch (err) {
    if (err instanceof AuthError) {
      console.error("[auth] sign-in email failed:", err.type);
      return { error: "We couldn't send the sign-in link. Try again in a minute.", email };
    }
    throw err;
  }
  return {};
}

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
            ? "Too many attempts. Wait 15 minutes, or ask for an email link instead."
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
