"use server";

import { AuthError } from "next-auth";
import { z } from "zod";
import { signIn } from "@/lib/auth";

export type LoginState = { error?: string; email?: string };

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
