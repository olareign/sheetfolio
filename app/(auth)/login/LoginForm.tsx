"use client";

import { useActionState } from "react";
import { Field, fieldDescribedBy } from "@/components/sp/Field";
import { SubmitButton } from "@/components/sp/SubmitButton";
import { requestMagicLink, type LoginState } from "./actions";

export function LoginForm() {
  const [state, action] = useActionState<LoginState, FormData>(requestMagicLink, {});
  const hint = "We email you a one-time sign-in link. No password.";
  return (
    <form action={action} noValidate>
      <Field id="email" label="Email" required hint={hint} error={state.error}>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="sp-input"
          defaultValue={state.email}
          aria-invalid={state.error ? true : undefined}
          aria-describedby={fieldDescribedBy("email", { hint, error: state.error })}
        />
      </Field>
      <div>
        <SubmitButton pendingLabel="Sending link…">Email me a sign-in link</SubmitButton>
      </div>
    </form>
  );
}
