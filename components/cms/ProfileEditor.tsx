"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { get, useForm, type FieldValues, type Resolver } from "react-hook-form";
import { saveProfileAction } from "@/app/(admin)/dashboard/actions";
import { describeFields } from "@/content/form-spec";
import { PRIVATE_FIELDS, Profile, ProfileEditorInput, Research, type PrivateField } from "@/content/schemas";
import { Field, fieldDescribedBy } from "@/components/sp/Field";
import { FieldRenderer } from "./FieldRenderer";
import { applyServerErrors, withFieldKeys } from "./form-result";
import { SaveBar } from "./SaveBar";

const PRIVATE_LABELS: Record<PrivateField, string> = {
  dateOfBirth: "Date of birth",
  placeOfBirth: "Place of birth",
  stateOfOrigin: "State of origin",
  maritalStatus: "Marital status",
  nationality: "Nationality",
};

// Contact channels live in Settings (PRD §3.3); private details get their own section below.
const NOT_IN_IDENTITY = ["whatsapp", "whatsappMessage", "publicEmail", "private", "visibility"] as const;
const COMPETENCY_SLOTS = 6;
const blankToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

export function ProfileEditor({ defaultValues, slug }: { defaultValues: FieldValues; slug: string }) {
  const identity = useMemo(() => describeFields(Profile, { skip: NOT_IN_IDENTITY }), []);
  // The whole research block is optional; its fields are only required once one is filled in.
  const research = useMemo(() => describeFields(Research).map((f) => ({ ...f, required: false })), []);
  const form = useForm<FieldValues>({
    // Nested editor schema with transforms: input and output types differ, the form handles raw values.
    resolver: zodResolver(ProfileEditorInput) as unknown as Resolver<FieldValues>,
    defaultValues: withFieldKeys(defaultValues, [
      ...identity.map((f) => `profile.${f.name}`),
      ...PRIVATE_FIELDS.map((k) => `profile.private.${k}`),
      ...research.map((f) => `research.${f.name}`),
    ]),
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    const result = await saveProfileAction(values);
    if (!result.ok) return setFormError(applyServerErrors(form, result));
    form.reset(form.getValues()); // raw values: the parsed output drops blank slots
    setSavedAt(result.at);
  });

  const err = (name: string) => get(form.formState.errors, name)?.message as string | undefined;

  return (
    <form className="cms-form" onSubmit={onSubmit} noValidate>
      <h1 className="cms-title">Profile</h1>
      {formError && (
        <p className="sp-alert" role="alert">
          {formError}
        </p>
      )}

      <section className="cms-section" aria-labelledby="sec-identity">
        <h2 id="sec-identity">Who you are</h2>
        <div className="cms-grid">
          {identity.map((spec) => (
            <div key={spec.name} className={spec.wide ? "cms-wide" : undefined}>
              <FieldRenderer spec={spec} name={`profile.${spec.name}`} form={form} slug={slug} />
            </div>
          ))}
        </div>
      </section>

      <section className="cms-section" aria-labelledby="sec-private">
        <h2 id="sec-private">Private details</h2>
        <p>Stored for your CV but hidden everywhere, including the CV PDF, until you tick “Show on page”.</p>
        <div className="cms-grid">
          {PRIVATE_FIELDS.map((key) => {
            const name = `profile.private.${key}`;
            const id = `f-private-${key}`;
            const error = err(name);
            return (
              <div key={key} className="cms-private">
                <Field id={id} label={PRIVATE_LABELS[key]} error={error}>
                  <input
                    id={id}
                    className="sp-input"
                    aria-invalid={error ? true : undefined}
                    aria-describedby={fieldDescribedBy(id, { error })}
                    {...form.register(name, { setValueAs: blankToUndefined })}
                  />
                </Field>
                <label className="cms-check">
                  <input type="checkbox" {...form.register(`profile.visibility.${key}`)} />
                  Show on page
                </label>
              </div>
            );
          })}
          <div className="cms-wide">
            <label className="cms-check">
              <input type="checkbox" {...form.register("profile.visibility.referees")} />
              Show referee names and phone numbers (otherwise “References available on request”)
            </label>
          </div>
        </div>
      </section>

      <section className="cms-section" aria-labelledby="sec-competencies">
        <h2 id="sec-competencies">Core competencies</h2>
        <p>Up to six short phrases, shown as a row under your credentials.</p>
        <div className="cms-grid">
          {Array.from({ length: COMPETENCY_SLOTS }, (_, i) => {
            const id = `f-competency-${i}`;
            const error = err(`competencies.${i}`);
            return (
              <Field key={id} id={id} label={`Competency ${i + 1}`} error={error}>
                <input
                  id={id}
                  className="sp-input"
                  maxLength={80}
                  aria-invalid={error ? true : undefined}
                  {...form.register(`competencies.${i}`)}
                />
              </Field>
            );
          })}
        </div>
      </section>

      <section className="cms-section" aria-labelledby="sec-research">
        <h2 id="sec-research">Research</h2>
        <p>Optional. Leave every field blank if you have none.</p>
        <div className="cms-grid">
          {research.map((spec) => (
            <div key={spec.name} className={spec.wide ? "cms-wide" : undefined}>
              <FieldRenderer spec={spec} name={`research.${spec.name}`} form={form} slug={slug} />
            </div>
          ))}
        </div>
      </section>

      <SaveBar submitting={form.formState.isSubmitting} dirty={form.formState.isDirty} savedAt={savedAt} />
    </form>
  );
}
