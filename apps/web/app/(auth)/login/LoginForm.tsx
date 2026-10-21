"use client";

import { useActionState } from "react";
import { Field, fieldDescribedBy } from "@/components/sp/Field";
import { SubmitButton } from "@/components/sp/SubmitButton";
import { requestMagicLink, signInWithPassword, type LoginState, type PasswordLoginState } from "./actions";

/** Username-or-email and password: the everyday way in. */
export function PasswordForm() {
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
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="sp-input"
        />
      </Field>
      <div>
        <SubmitButton pendingLabel="Signing in…">Sign in</SubmitButton>
      </div>
    </form>
  );
}

/** One-time email link: for a first sign-in or a forgotten password. */
export function LoginForm() {
  const [state, action] = useActionState<LoginState, FormData>(requestMagicLink, {});
  const hint = "We email you a one-time sign-in link. Once signed in, you can set a password in Settings.";
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
