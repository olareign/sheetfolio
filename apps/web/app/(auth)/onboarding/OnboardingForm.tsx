"use client";

import { useActionState } from "react";
import { Field, fieldDescribedBy } from "@/components/sp/Field";
import { SubmitButton } from "@/components/sp/SubmitButton";
import { claimSite, type OnboardingField, type OnboardingState } from "./actions";

const HINTS: Partial<Record<OnboardingField, string>> = {
  slug: "3–40 characters: lowercase letters, numbers, hyphens. You can change it later.",
  firstName: "Used on your buttons, e.g. “WhatsApp Idris”.",
};

export function OnboardingForm({ siteHost }: { siteHost: string }) {
  const [state, action] = useActionState<OnboardingState, FormData>(claimSite, {});
  const err = (f: OnboardingField) => state.fieldErrors?.[f];
  const control = (f: OnboardingField) => ({
    id: f,
    name: f,
    required: true,
    className: "sp-input",
    defaultValue: state.values?.[f],
    "aria-invalid": err(f) ? true : undefined,
    "aria-describedby": fieldDescribedBy(f, { hint: HINTS[f], error: err(f) }),
  });

  return (
    <form action={action} noValidate>
      {state.formError && (
        <p className="sp-alert" role="alert">
          {state.formError}
        </p>
      )}
      <Field id="slug" label="Page address" required hint={HINTS.slug} error={err("slug")}>
        <div className="sp-slug-input">
          <span className="sp-slug-prefix" aria-hidden="true">
            {siteHost}/
          </span>
          <input
            {...control("slug")}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="idris-rasaq"
          />
        </div>
      </Field>
      <Field id="name" label="Full name" required error={err("name")}>
        <input {...control("name")} autoComplete="name" placeholder="Rasaq Idris Olawale" />
      </Field>
      <div className="sp-row-2">
        <Field id="firstName" label="First name" required hint={HINTS.firstName} error={err("firstName")}>
          <input {...control("firstName")} autoComplete="given-name" placeholder="Idris" />
        </Field>
        <Field id="headline" label="Headline" required error={err("headline")}>
          <input {...control("headline")} placeholder="Site Engineer" />
        </Field>
      </div>
      <div>
        <SubmitButton pendingLabel="Claiming…">Claim page</SubmitButton>
      </div>
    </form>
  );
}
