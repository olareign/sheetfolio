"use client";

import { ExternalLink } from "lucide-react";
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

/**
 * Dashboard → CV. Left: which layouts the page offers for download, and the default. Right: your saved draft drawn in
 * the layout you pick, as the real PDF a visitor would get. The choice applies to the public page on Publish.
 */
export function CvLayoutsForm({ initial, draftVersion }: { initial: Choice; draftVersion: string }) {
  const [choice, setChoice] = useState<Choice>(initial);
  const [baseline, setBaseline] = useState<Choice>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState<CvTemplateId>(initial.cvTemplate);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);

  // The version changes whenever the draft is saved, so the preview redraws after edits made elsewhere.
  const src = `/api/cv/preview?template=${previewing}&v=${encodeURIComponent(draftVersion)}`;

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
    <div className="cms-cv">
      <form onSubmit={onSubmit} noValidate className="cms-cv-pick">
        <section className="cms-section" aria-labelledby="sec-cv">
          <h2 id="sec-cv">Layouts on your page</h2>
          <p>
            Choose the layouts visitors can download, and which one comes first. Changes reach your public page when you
            publish.
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
                <div key={id} className="cms-cv-card" data-on={on} data-previewing={previewing === id}>
                  <button
                    type="button"
                    className="cms-cv-view"
                    onClick={() => setPreviewing(id)}
                    aria-pressed={previewing === id}
                    aria-label={`Preview the ${CV_TEMPLATES[id].label} layout`}
                  >
                    <CvThumb id={id} />
                  </button>
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

      <section className="cms-cv-preview" aria-labelledby="sec-preview">
        <div className="cms-cv-preview-head">
          <h2 id="sec-preview">Preview: {CV_TEMPLATES[previewing].label}</h2>
          <a className="sp-annot cms-cv-open" href={src} target="_blank" rel="noopener">
            Open in a new tab <ExternalLink size={14} strokeWidth={1.5} aria-hidden="true" />
          </a>
        </div>
        <p className="sp-field-hint">Drawn from your saved draft. Save your edits first to see them here.</p>
        <div className="cms-cv-frame">
          {loadedSrc !== src && (
            <p className="cms-cv-loading" role="status">
              Drawing your CV…
            </p>
          )}
          <iframe
            key={src}
            title={`CV preview, ${CV_TEMPLATES[previewing].label} layout`}
            src={`${src}#toolbar=0&navpanes=0&view=FitH`}
            onLoad={() => setLoadedSrc(src)}
          />
        </div>
      </section>
    </div>
  );
}
