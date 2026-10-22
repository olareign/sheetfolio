"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { useForm, type FieldValues, type Resolver } from "react-hook-form";
import { saveSettingsAction } from "@/app/(admin)/dashboard/actions";
import { describeFields } from "@/content/form-spec";
import { SettingsInput } from "@/content/schemas";
import { FieldRenderer } from "./FieldRenderer";
import { applyServerErrors } from "./form-result";
import { SaveBar } from "./SaveBar";
import { hasEdits, saveForm, useUnsavedChanges } from "./UnsavedChanges";

const HINTS: Record<string, string> = {
  whatsapp: "Digits only, with country code and no +, e.g. 2347033435818",
  whatsappMessage: "Pre-filled when a visitor taps WhatsApp.",
  publicEmail: "Enquiries from your page are sent here.",
  showInShowcase:
    "Published pages with the most views in the last 30 days appear on the public Featured page. Applies the next time you publish.",
};
const THEME_LABELS: Record<string, string> = { sheet: "Light", blueprint: "Dark" };

export function SettingsForm({ defaultValues, slug }: { defaultValues: FieldValues; slug: string }) {
  const fields = useMemo(
    () =>
      describeFields(SettingsInput).map((f) =>
        f.name === "theme"
          ? { ...f, options: f.options?.map((o) => ({ ...o, label: THEME_LABELS[o.value] ?? o.label })) }
          : f,
      ),
    [],
  );
  const form = useForm<FieldValues>({
    // Same schema the server uses; RHF works on untyped field values here.
    resolver: zodResolver(SettingsInput) as unknown as Resolver<FieldValues>,
    defaultValues,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const persist = async (values: FieldValues): Promise<boolean> => {
    setFormError(null);
    const result = await saveSettingsAction(values);
    if (!result.ok) {
      setFormError(applyServerErrors(form, result));
      return false;
    }
    form.reset(form.getValues());
    setSavedAt(result.at);
    return true;
  };
  const onSubmit = form.handleSubmit(async (values) => void (await persist(values)));
  useUnsavedChanges(hasEdits(form.formState), () => saveForm(form, persist));

  return (
    <form className="cms-form" onSubmit={onSubmit} noValidate>
      <h1 className="cms-title">Settings</h1>
      {formError && (
        <p className="sp-alert" role="alert">
          {formError}
        </p>
      )}
      <section className="cms-section" aria-labelledby="sec-address">
        <h2 id="sec-address">Page address</h2>
        <p>
          Your page lives at <code className="sp-annot">/{slug}</code>.
        </p>
        {/* TODO(product): changing the slug (re-key draft, published, leads and views; keep a redirect). */}
      </section>
      <section className="cms-section" aria-labelledby="sec-contact">
        <h2 id="sec-contact">Contact and theme</h2>
        <div className="cms-grid">
          {fields.map((spec) => (
            <div key={spec.name} className={spec.wide ? "cms-wide" : undefined}>
              <FieldRenderer spec={spec} form={form} slug={slug} hint={HINTS[spec.name]} />
            </div>
          ))}
        </div>
      </section>
      <SaveBar submitting={form.formState.isSubmitting} dirty={hasEdits(form.formState)} savedAt={savedAt} />
    </form>
  );
}
