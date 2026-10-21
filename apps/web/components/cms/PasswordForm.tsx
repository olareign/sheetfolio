"use client";

import { useActionState } from "react";
import { savePassword, type PasswordState } from "@/app/(admin)/dashboard/settings/actions";
import { Field } from "@/components/sp/Field";
import { SubmitButton } from "@/components/sp/SubmitButton";
import { PASSWORD_MIN } from "@/content/schemas";

/** Settings → Sign-in: set a password and username the first time, then change the password. */
export function PasswordForm({ username }: { username: string | null }) {
  const [state, action] = useActionState<PasswordState, FormData>(savePassword, {});
  const hasPassword = username !== null;
  return (
    <form action={action} noValidate>
      <section className="cms-section" aria-labelledby="sec-signin">
        <h2 id="sec-signin">Sign-in</h2>
        <p>
          {hasPassword ? (
            <>
              Sign in with your username <code className="sp-annot">{username}</code> or your email.
            </>
          ) : (
            "Set a username and password to sign in without waiting for an email link."
          )}
        </p>
        {state.error && (
          <p className="sp-alert" role="alert">
            {state.error}
          </p>
        )}
        {state.saved && (
          <p className="sp-note" role="status">
            Password saved.
          </p>
        )}
        <div className="cms-grid">
          {hasPassword ? (
            <Field id="currentPassword" label="Current password" required>
              <input
                id="currentPassword"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                className="sp-input"
                required
              />
            </Field>
          ) : (
            <Field id="username" label="Username" required hint="Lowercase letters and numbers, e.g. ada-lovelace">
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                className="sp-input"
                required
              />
            </Field>
          )}
          <Field id="newPassword" label="New password" required hint={`At least ${PASSWORD_MIN} characters`}>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              minLength={PASSWORD_MIN}
              className="sp-input"
              required
            />
          </Field>
          <Field id="confirm" label="Repeat new password" required>
            <input
              id="confirm"
              name="confirm"
              type="password"
              autoComplete="new-password"
              className="sp-input"
              required
            />
          </Field>
        </div>
        <SubmitButton pendingLabel="Saving…">{hasPassword ? "Change password" : "Save password"}</SubmitButton>
      </section>
    </form>
  );
}
