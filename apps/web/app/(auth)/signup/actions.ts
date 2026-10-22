"use server";

import { headers } from "next/headers";
import { AuthError } from "next-auth";
import { z } from "zod";
import { NewPassword, OnboardingInput, Slug } from "@/content/schemas";
import { registerAccount } from "@/lib/accounts";
import { signIn } from "@/lib/auth";
import { isAdminEmail } from "@/lib/env";
import { allowSignup, clientIp } from "@/lib/ratelimit";

export type SignupField = "name" | "email" | "slug" | "headline" | "password";
export type SignupState = {
  values?: Partial<Record<Exclude<SignupField, "password">, string>>;
  fieldErrors?: Partial<Record<SignupField, string>>;
  formError?: string;
};

const Fields = z.object({
  name: OnboardingInput.shape.name,
  email: z
    .email("Enter a valid email address")
    .max(254)
    .transform((v) => v.toLowerCase()),
  slug: Slug,
  headline: OnboardingInput.shape.headline,
  password: NewPassword,
});

/** "Ada Obi Smith" → "Ada": the name used on buttons such as "WhatsApp Ada". */
const firstNameOf = (name: string) => name.trim().split(/\s+/)[0] ?? name;

export async function signUp(_prev: SignupState, formData: FormData): Promise<SignupState> {
  const raw = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? "").trim(),
    slug: String(formData.get("slug") ?? ""),
    headline: String(formData.get("headline") ?? ""),
    password: String(formData.get("password") ?? ""),
  };
  const values = { name: raw.name, email: raw.email, slug: raw.slug, headline: raw.headline };

  const parsed = Fields.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: SignupState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as SignupField;
      fieldErrors[field] ??= issue.message;
    }
    return { values, fieldErrors };
  }
  const data = parsed.data;

  if (!(await allowSignup(clientIp(await headers())))) {
    return { values, formError: "Too many sign-ups from this network. Try again in an hour." };
  }

  const result = await registerAccount({
    email: data.email,
    password: data.password,
    role: isAdminEmail(data.email) ? "admin" : "engineer",
    input: { slug: data.slug, name: data.name, firstName: firstNameOf(data.name), headline: data.headline },
  });
  if (!result.ok) {
    return result.reason === "SLUG_TAKEN"
      ? { values, fieldErrors: { slug: "That address is taken. Try another." } }
      : { values, fieldErrors: { email: "That email already has an account. Sign in, or reset your password." } };
  }

  try {
    await signIn("credentials", { identifier: data.email, password: data.password, redirectTo: "/dashboard" });
  } catch (err) {
    if (err instanceof AuthError) {
      // The account exists; only the automatic sign-in failed.
      return { values, formError: "Your account is ready. Sign in to continue." };
    }
    throw err; // the success redirect
  }
  return {};
}
