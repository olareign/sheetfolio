"use client";

import { useActionState } from "react";
import { Field, fieldDescribedBy } from "@/components/sp/Field";
import { SubmitButton } from "@/components/sp/SubmitButton";
import { requestReset, type ForgotState } from "./actions";

export function ForgotForm() {
  const [state, action] = useActionState<ForgotState, FormData>(requestReset, {});
  const hint = "We'll email a reset link to the address on that account.";
  if (state.done) {
    return (
      <p className="sp-note" role="status">
        If an account matches, a reset link is on its way. It works once and expires in one hour. Nothing arrived? Check
        spam, or try again in a few minutes.
      </p>
    );
  }
  return (
    <form action={action} noValidate>
      <Field id="identifier" label="Username or email" required hint={hint} error={state.error}>
        <input
          id="identifier"
          name="identifier"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          className="sp-input"
          defaultValue={state.identifier}
          aria-invalid={state.error ? true : undefined}
          aria-describedby={fieldDescribedBy("identifier", { hint, error: state.error })}
        />
      </Field>
      <div>
        <SubmitButton pendingLabel="Sending…">Email me a reset link</SubmitButton>
      </div>
    </form>
  );
}
