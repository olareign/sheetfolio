"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Field, fieldDescribedBy } from "@/components/sp/Field";
import { PasswordInput } from "@/components/sp/PasswordInput";
import { SubmitButton } from "@/components/sp/SubmitButton";
import { PLACEHOLDERS, SLUG_PLACEHOLDER } from "@/content/placeholders";
import { signUp, type SignupField, type SignupState } from "./actions";

const HINTS: Partial<Record<SignupField, string>> = {
  slug: "Your page lives here. 3–40 characters: lowercase letters, numbers, hyphens.",
  password: "At least 10 characters. You can also sign in with your page address instead of your email.",
};

/** "Ada Obi" → "ada-obi": a starting point for the page address that the person can edit. */
const slugFrom = (name: string) =>
  name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

export function SignupForm({ siteHost }: { siteHost: string }) {
  const [state, action] = useActionState<SignupState, FormData>(signUp, {});
  // The address follows the name until the person types in it themselves.
  const [slug, setSlug] = useState<string | null>(null);
  const [name, setName] = useState("");
  const slugValue = slug ?? slugFrom(name);

  const err = (f: SignupField) => state.fieldErrors?.[f];
  const props = (f: SignupField) => ({
    id: f,
    name: f,
    required: true,
    "aria-invalid": err(f) ? true : undefined,
    "aria-describedby": fieldDescribedBy(f, { hint: HINTS[f], error: err(f) }),
  });

  return (
    <form action={action} noValidate>
      {state.formError && (
        <p className="sp-alert" role="alert">
          {state.formError} {state.formError.startsWith("Your account") && <Link href="/login">Sign in</Link>}
        </p>
      )}
      <Field id="name" label="Full name" required error={err("name")}>
        <input
          {...props("name")}
          className="sp-input"
          autoComplete="name"
          placeholder={PLACEHOLDERS.name}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>
      <Field id="headline" label="Headline" required error={err("headline")}>
        <input
          {...props("headline")}
          className="sp-input"
          placeholder={PLACEHOLDERS.headline}
          defaultValue={state.values?.headline}
        />
      </Field>
      <Field id="slug" label="Page address" required hint={HINTS.slug} error={err("slug")}>
        <div className="sp-slug-input">
          <span className="sp-slug-prefix" aria-hidden="true">
            {siteHost}/
          </span>
          <input
            {...props("slug")}
            className="sp-input"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder={SLUG_PLACEHOLDER}
            value={slugValue}
            onChange={(e) => setSlug(e.target.value)}
          />
        </div>
      </Field>
      <Field id="email" label="Email" required error={err("email")}>
        <input
          {...props("email")}
          className="sp-input"
          type="email"
          autoComplete="email"
          defaultValue={state.values?.email}
        />
      </Field>
      <Field id="password" label="Password" required hint={HINTS.password} error={err("password")}>
        <PasswordInput {...props("password")} autoComplete="new-password" />
      </Field>
      <div>
        <SubmitButton pendingLabel="Creating your page…">Create my page</SubmitButton>
      </div>
    </form>
  );
}
