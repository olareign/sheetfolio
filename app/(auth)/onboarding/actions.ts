"use server";

import { redirect } from "next/navigation";
import { OnboardingInput } from "@/content/schemas";
import { onboard } from "@/lib/accounts";
import { isAdminEmail } from "@/lib/env";
import { requireUser } from "@/lib/session";

export type OnboardingField = keyof OnboardingInput;
export type OnboardingState = {
  values?: Partial<Record<OnboardingField, string>>;
  fieldErrors?: Partial<Record<OnboardingField, string>>;
  formError?: string;
};

const FIELDS: OnboardingField[] = ["slug", "name", "firstName", "headline"];

export async function claimSite(_prev: OnboardingState, formData: FormData): Promise<OnboardingState> {
  // Server Actions are public endpoints: authenticate here, not only in the page.
  const user = await requireUser();

  const values = Object.fromEntries(FIELDS.map((f) => [f, String(formData.get(f) ?? "")])) as Record<
    OnboardingField,
    string
  >;
  const parsed = OnboardingInput.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: OnboardingState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as OnboardingField;
      fieldErrors[field] ??= issue.message;
    }
    return { values, fieldErrors };
  }

  const result = await onboard({
    userId: user.id,
    email: user.email,
    role: isAdminEmail(user.email) ? "admin" : "engineer",
    input: parsed.data,
  });

  if (!result.ok && result.reason === "SLUG_TAKEN") {
    return { values, fieldErrors: { slug: "That address is taken. Try another." } };
  }
  // Success, or this account was already set up (e.g. double submit): either way the dashboard is next.
  redirect("/dashboard");
}
