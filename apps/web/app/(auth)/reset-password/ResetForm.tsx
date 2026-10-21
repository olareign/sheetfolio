"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field } from "@/components/sp/Field";
import { PasswordInput } from "@/components/sp/PasswordInput";
import { SubmitButton } from "@/components/sp/SubmitButton";
import { PASSWORD_MIN } from "@/content/schemas";
import { completeReset, type ResetState } from "./actions";

export function ResetForm({ token }: { token: string }) {
  const [state, action] = useActionState<ResetState, FormData>(completeReset, {});
  if (state.expired) return <ExpiredLink />;
  return (
    <form action={action} noValidate>
      {state.error && (
        <p className="sp-alert" role="alert">
          {state.error}
        </p>
      )}
      <input type="hidden" name="token" value={token} />
      <Field id="newPassword" label="New password" required hint={`At least ${PASSWORD_MIN} characters`}>
        <PasswordInput
          id="newPassword"
          name="newPassword"
          autoComplete="new-password"
          minLength={PASSWORD_MIN}
          required
        />
      </Field>
      <Field id="confirm" label="Repeat new password" required>
        <PasswordInput id="confirm" name="confirm" autoComplete="new-password" required />
      </Field>
      <div>
        <SubmitButton pendingLabel="Saving…">Save new password</SubmitButton>
      </div>
    </form>
  );
}

/** Shared by the page (link already dead on arrival) and the form (link used or expired while open). */
export function ExpiredLink() {
  return (
    <>
      <p className="sp-alert" role="alert">
        This reset link has expired or was already used.
      </p>
      <p>
        <Link href="/forgot-password">Request a new link</Link>
      </p>
    </>
  );
}
