"use client";

import { ExternalLink } from "lucide-react";
import { useState, type FormEvent } from "react";
import { saveCvLayoutsAction } from "@/app/(admin)/dashboard/actions";
import { CV_TEMPLATE_IDS, CV_TEMPLATES, type CvTemplateId } from "@/content/cv-templates";
import { CvThumb } from "./CvThumb";
import { SaveBar } from "./SaveBar";

/**
 * Dashboard → CV. The owner picks the ONE layout their page hands out; visitors get a single "Download CV" button and
 * never choose. Right: the saved draft drawn in the layout being looked at, as the real PDF a visitor would get.
 * The choice reaches the public page on Publish.
 */
export function CvLayoutsForm({ initial, draftVersion }: { initial: CvTemplateId; draftVersion: string }) {
  const [chosen, setChosen] = useState<CvTemplateId>(initial);
  const [baseline, setBaseline] = useState<CvTemplateId>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState<CvTemplateId>(initial);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);

  // The version changes whenever the draft is saved, so the preview redraws after edits made elsewhere.
  const src = `/api/cv/preview?template=${previewing}&v=${encodeURIComponent(draftVersion)}`;

  const choose = (id: CvTemplateId) => {
    setMessage(null);
    setChosen(id);
    setPreviewing(id);
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    // Stored as "offer exactly this one", which is what the public page and download link read.
    const result = await saveCvLayoutsAction({ cvTemplates: [chosen], cvTemplate: chosen });
    setSubmitting(false);
    if (!result.ok)
      return setMessage(result.formError ?? Object.values(result.fieldErrors)[0] ?? "Couldn't save. Try again.");
    setBaseline(chosen);
    setSavedAt(result.at);
  };

  return (
    <div className="cms-cv">
      <form onSubmit={onSubmit} noValidate className="cms-cv-pick">
        <section className="cms-section" aria-labelledby="sec-cv">
          <h2 id="sec-cv">CV on your page</h2>
          <p>
            Pick the layout visitors download from your page. They get one &ldquo;Download CV&rdquo; button in this layout and can&rsquo;t
            switch it. Changes reach your public page when you publish.
          </p>
          {message && (
            <p className="sp-alert" role="alert">
              {message}
            </p>
          )}
          <fieldset className="cms-cv-grid">
            <legend className="sp-visually-hidden">Layout visitors download</legend>
            {CV_TEMPLATE_IDS.map((id) => {
              const on = chosen === id;
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
                    <input type="radio" name="cvTemplate" value={id} checked={on} onChange={() => choose(id)} />
                    {on ? "Visitors download this" : "Use this layout"}
                  </label>
                </div>
              );
            })}
          </fieldset>
          <SaveBar submitting={submitting} dirty={chosen !== baseline} savedAt={savedAt} />
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
