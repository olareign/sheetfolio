"use client";

import { useActionState } from "react";
import { sendEnquiry, type EnquiryField, type EnquiryState } from "@/app/(public)/[slug]/actions";
import { Field, fieldDescribedBy } from "@/components/sp/Field";
import { SubmitButton } from "@/components/sp/SubmitButton";

/** Enquiry form (PRD §3.4). In the draft preview it renders disabled so tests never create real leads. */
export function EnquiryForm({ slug, firstName, disabled }: { slug: string; firstName: string; disabled?: boolean }) {
  const [state, action] = useActionState<EnquiryState, FormData>(sendEnquiry.bind(null, slug), { status: "idle" });

  if (state.status === "sent") {
    return (
      <div className="pp-form" role="status">
        <span className="sp-label">Enquiry issued</span>
        <h3 className="sp-body-strong">Thanks. {firstName} has your message.</h3>
        <p className="sp-annot">Expect a reply by email. For anything urgent, use WhatsApp.</p>
      </div>
    );
  }

  const err = (f: EnquiryField) => state.fieldErrors?.[f];
  const input = (f: EnquiryField) => ({
    id: `enquiry-${f}`,
    name: f,
    className: "sp-input",
    defaultValue: state.values?.[f],
    disabled,
    "aria-invalid": err(f) ? true : undefined,
    "aria-describedby": fieldDescribedBy(`enquiry-${f}`, { error: err(f) }),
  });

  return (
    <form action={action} className="pp-form" aria-labelledby="contact-title" noValidate>
      {state.status === "error" && state.message && (
        <p className="sp-alert" role="alert">
          {state.message}
        </p>
      )}
      <Field id="enquiry-name" label="Name" required error={err("name")}>
        <input {...input("name")} autoComplete="name" required maxLength={120} />
      </Field>
      <Field id="enquiry-email" label="Email" required error={err("email")}>
        <input {...input("email")} type="email" autoComplete="email" required />
      </Field>
      <Field id="enquiry-company" label="Company / project" error={err("company")}>
        <input {...input("company")} autoComplete="organization" maxLength={160} />
      </Field>
      <Field id="enquiry-message" label="Message" required error={err("message")}>
        <textarea {...input("message")} rows={5} required maxLength={4000} />
      </Field>
      {/* Honeypot, hidden from people and assistive tech. */}
      <div className="sp-visually-hidden" aria-hidden="true">
        <label htmlFor="enquiry-website">Website</label>
        <input id="enquiry-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <div>
        {disabled ? (
          <p className="sp-field-hint">Enquiries are switched off in preview.</p>
        ) : (
          <SubmitButton pendingLabel="Sending…">Send enquiry</SubmitButton>
        )}
      </div>
    </form>
  );
}
