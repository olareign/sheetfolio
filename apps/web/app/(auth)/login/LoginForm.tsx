"use client";

import { useActionState } from "react";
import { Field } from "@/components/sp/Field";
import { PasswordInput } from "@/components/sp/PasswordInput";
import { SubmitButton } from "@/components/sp/SubmitButton";
import { signInWithPassword, type PasswordLoginState } from "./actions";

/** Username-or-email and password: the everyday way in. */
export function LoginForm() {
  const [state, action] = useActionState<PasswordLoginState, FormData>(signInWithPassword, {});
  return (
    <form action={action} noValidate>
      {state.error && (
        <p className="sp-alert" role="alert">
          {state.error}
        </p>
      )}
      <Field id="identifier" label="Username or email" required>
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
        />
      </Field>
      <Field id="password" label="Password" required>
        <PasswordInput id="password" name="password" autoComplete="current-password" required />
      </Field>
      <div>
        <SubmitButton pendingLabel="Signing in…">Sign in</SubmitButton>
      </div>
    </form>
  );
}
