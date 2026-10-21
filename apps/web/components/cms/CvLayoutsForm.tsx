"use client";

import { useState, type FormEvent } from "react";
import { saveCvLayoutsAction } from "@/app/(admin)/dashboard/actions";
import { CV_TEMPLATE_IDS, CV_TEMPLATES, type CvTemplateId } from "@/content/cv-templates";
import { CvThumb } from "./CvThumb";
import { SaveBar } from "./SaveBar";

type Choice = { cvTemplates: CvTemplateId[]; cvTemplate: CvTemplateId };

const same = (a: Choice, b: Choice) =>
  a.cvTemplate === b.cvTemplate &&
  a.cvTemplates.length === b.cvTemplates.length &&
  a.cvTemplates.every((id) => b.cvTemplates.includes(id));

/** Settings → CV layouts: which layouts the page offers for download, and which one is the default. */
export function CvLayoutsForm({ initial }: { initial: Choice }) {
  const [choice, setChoice] = useState<Choice>(initial);
  const [baseline, setBaseline] = useState<Choice>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const toggle = (id: CvTemplateId) => {
    setMessage(null);
    const on = choice.cvTemplates.includes(id);
    if (on && choice.cvTemplates.length === 1) return setMessage("Offer at least one CV layout.");
    const cvTemplates = CV_TEMPLATE_IDS.filter((t) => (t === id ? !on : choice.cvTemplates.includes(t)));
    const cvTemplate = cvTemplates.includes(choice.cvTemplate)
      ? choice.cvTemplate
      : (cvTemplates[0] ?? choice.cvTemplate);
    setChoice({ cvTemplates, cvTemplate });
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    const result = await saveCvLayoutsAction(choice);
    setSubmitting(false);
    if (!result.ok)
      return setMessage(result.formError ?? Object.values(result.fieldErrors)[0] ?? "Couldn't save. Try again.");
    setBaseline(choice);
    setSavedAt(result.at);
  };

  return (
    <form onSubmit={onSubmit} noValidate>
      <section className="cms-section" aria-labelledby="sec-cv">
        <h2 id="sec-cv">CV layouts</h2>
        <p>
          Choose the layouts visitors can download from your page. Each is drawn from your profile, and the default is
          listed first. Changes reach your public page when you publish.
        </p>
        {message && (
          <p className="sp-alert" role="alert">
            {message}
          </p>
        )}
        <div className="cms-cv-grid">
          {CV_TEMPLATE_IDS.map((id) => {
            const on = choice.cvTemplates.includes(id);
            return (
              <div key={id} className="cms-cv-card" data-on={on}>
                <CvThumb id={id} />
                <strong className="cms-cv-name">{CV_TEMPLATES[id].label}</strong>
                <span className="sp-field-hint">{CV_TEMPLATES[id].description}</span>
                <label className="cms-cv-choice">
                  <input type="checkbox" checked={on} onChange={() => toggle(id)} />
                  Offer on my page
                </label>
                <label className="cms-cv-choice">
                  <input
                    type="radio"
                    name="cvTemplate"
                    checked={choice.cvTemplate === id}
                    disabled={!on}
                    onChange={() => setChoice({ ...choice, cvTemplate: id })}
                  />
                  Default
                </label>
              </div>
            );
          })}
        </div>
        <SaveBar submitting={submitting} dirty={!same(choice, baseline)} savedAt={savedAt} />
      </section>
    </form>
  );
}
