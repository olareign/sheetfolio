"use client";

import { ArrowDown, ArrowUp, Check, CircleAlert, Download, Plus, RotateCcw, Save, X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/sp/Button";
import { Field } from "@/components/sp/Field";
import type { TailorOverlay } from "@/content/tailor";
import { defaultName, type Review, type TailorFacts } from "./tailor-ui";

type Item = { id: string; title: string; sub: string };

/**
 * One list of the page's items for a tailored CV: the ones shown, in the order they will print, and the ones left out.
 * Moving and removing are buttons, so it works with a keyboard and on a phone.
 */
function Picker({
  legend,
  items,
  shown,
  onChange,
  extra,
}: {
  legend: string;
  items: Item[];
  shown: string[];
  onChange: (ids: string[]) => void;
  extra?: (id: string) => ReactNode;
}) {
  const byId = new Map(items.map((i) => [i.id, i]));
  const included = shown.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []));
  const left = items.filter((i) => !shown.includes(i.id));
  const move = (from: number, by: number) => {
    const next = [...shown];
    const [id] = next.splice(from, 1);
    next.splice(from + by, 0, id!);
    onChange(next);
  };

  if (items.length === 0) return null;
  return (
    <fieldset className="tl-group">
      <legend>
        {legend}{" "}
        <span>
          {included.length} of {items.length} shown
        </span>
      </legend>
      {included.length === 0 && <p className="tl-empty">None of these will be on this CV.</p>}
      <ol className="tl-list">
        {included.map((item, i) => (
          <li key={item.id} className="tl-item">
            <div className="tl-item-head">
              <div>
                <b>{item.title}</b>
                <small>{item.sub}</small>
              </div>
              <div className="tl-item-actions">
                <button
                  type="button"
                  aria-label={`Move ${item.title} up`}
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                >
                  <ArrowUp size={16} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label={`Move ${item.title} down`}
                  disabled={i === included.length - 1}
                  onClick={() => move(i, 1)}
                >
                  <ArrowDown size={16} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label={`Leave ${item.title} off this CV`}
                  onClick={() => onChange(shown.filter((id) => id !== item.id))}
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </div>
            </div>
            {extra?.(item.id)}
          </li>
        ))}
      </ol>
      {left.length > 0 && (
        <div className="tl-left">
          <span>Left out</span>
          <ul>
            {left.map((item) => (
              <li key={item.id}>
                <button type="button" onClick={() => onChange([...shown, item.id])}>
                  <Plus size={14} aria-hidden="true" />
                  {item.title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </fieldset>
  );
}

/** Reviewing a tailored version: every word can be edited, and nothing is saved until the person says so. */
export function TailorReview({
  review,
  facts,
  onChange,
  layoutLabel,
  canSave,
  saveHint,
  saving,
  downloading,
  formError,
  fieldErrors,
  onSave,
  onDownload,
  onClose,
}: {
  review: Review;
  facts: TailorFacts;
  onChange: (next: Review) => void;
  /** The CV layout a download will use, named on the button. */
  layoutLabel: string;
  canSave: boolean;
  saveHint?: string;
  saving: boolean;
  downloading: boolean;
  formError: string | null;
  fieldErrors: Record<string, string>;
  onSave: () => void;
  onDownload: () => void;
  onClose: () => void;
}) {
  const { overlay, result } = review;
  const set = (patch: Partial<TailorOverlay>) => onChange({ ...review, overlay: { ...overlay, ...patch } });
  const notesOf = (id: string) => overlay.experiences.find((e) => e.id === id)?.notes ?? "";
  const original = new Map(facts.experiences.map((e) => [e.id, e.notes]));
  const skills = overlay.competencies;

  return (
    <section className="tl-review" aria-labelledby="tl-review-title">
      <header className="tl-review-head">
        <div>
          <span className="tl-eyebrow">{review.editingId ? "Editing a saved version" : "Step 2 · Review"}</span>
          <h2 id="tl-review-title">{review.editingId ? "Edit this version" : "Your tailored CV"}</h2>
          {(review.job.title || review.job.company) && (
            <p className="tl-job">
              For <b>{review.job.title || "this role"}</b>
              {review.job.company && (
                <>
                  {" "}
                  at <b>{review.job.company}</b>
                </>
              )}
            </p>
          )}
        </div>
        <Button variant="ghost" onClick={onClose} disabled={saving}>
          Close
        </Button>
      </header>

      {result?.job.notice && <p className="cms-notice">{result.job.notice}</p>}
      {result && result.warnings.length > 0 && (
        <div className="tl-warn" role="alert">
          <CircleAlert size={20} aria-hidden="true" />
          <div>
            <b>Check before you use this</b>
            <ul>
              {result.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {result && (result.matched.length > 0 || result.gaps.length > 0) && (
        <div className="tl-fit">
          <div className="tl-fit-card tl-fit-card--yes">
            <h3>
              <Check size={16} aria-hidden="true" /> What matches <span>{result.matched.length}</span>
            </h3>
            {result.matched.length > 0 ? (
              <ul className="tl-pills">
                {result.matched.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            ) : (
              <p className="tl-note">Nothing in the job lines up closely with your page yet.</p>
            )}
          </div>
          <div className="tl-fit-card tl-fit-card--gap">
            <h3>
              <CircleAlert size={16} aria-hidden="true" /> Not on your page yet <span>{result.gaps.length}</span>
            </h3>
            {result.gaps.length > 0 ? (
              <>
                <ul className="tl-pills tl-pills--gap">
                  {result.gaps.map((g) => (
                    <li key={g}>{g}</li>
                  ))}
                </ul>
                <p className="tl-note">
                  The job asks for these and your page does not show them. If you have this experience, add it to your
                  page and tailor again.
                </p>
              </>
            ) : (
              <p className="tl-note">Your page covers everything the job asks for.</p>
            )}
          </div>
        </div>
      )}

      <div className="tl-form">
        <Field id="tl-headline" label="Headline" error={fieldErrors.headline} hint={`${overlay.headline.length} of 80`}>
          <input
            id="tl-headline"
            className="sp-input"
            value={overlay.headline}
            maxLength={80}
            onChange={(e) => set({ headline: e.target.value })}
          />
        </Field>
        <Field id="tl-summary" label="Summary" error={fieldErrors.summary} hint={`${overlay.summary.length} of 1,200`}>
          <textarea
            id="tl-summary"
            className="sp-input"
            rows={6}
            maxLength={1200}
            value={overlay.summary}
            onChange={(e) => set({ summary: e.target.value })}
          />
        </Field>
        <div className="tl-reset">
          <button type="button" onClick={() => set({ headline: facts.headline })}>
            <RotateCcw size={13} aria-hidden="true" /> Use my own headline
          </button>
          <button type="button" onClick={() => set({ summary: facts.summary })}>
            <RotateCcw size={13} aria-hidden="true" /> Use my own summary
          </button>
        </div>

        <fieldset className="tl-group">
          <legend>
            Skills <span>{skills.length} of 6</span>
          </legend>
          <ul className="tl-skills">
            {skills.map((skill, i) => (
              <li key={i}>
                <input
                  className="sp-input"
                  aria-label={`Skill ${i + 1}`}
                  value={skill}
                  maxLength={80}
                  onChange={(e) => set({ competencies: skills.map((s, n) => (n === i ? e.target.value : s)) })}
                />
                <button
                  type="button"
                  aria-label={`Remove skill ${skill || i + 1}`}
                  onClick={() => set({ competencies: skills.filter((_, n) => n !== i) })}
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
          {skills.length < 6 && (
            <Button
              size="sm"
              icon={<Plus size={14} aria-hidden="true" />}
              onClick={() => set({ competencies: [...skills, ""] })}
            >
              Add a skill
            </Button>
          )}
        </fieldset>

        <Picker
          legend="Experience"
          items={facts.experiences}
          shown={overlay.experiences.map((e) => e.id)}
          onChange={(ids) =>
            set({
              experiences: ids.map((id) => ({
                id,
                notes: overlay.experiences.find((e) => e.id === id)?.notes ?? original.get(id) ?? "",
              })),
            })
          }
          extra={(id) => (
            <div className="tl-notes">
              <label htmlFor={`tl-notes-${id}`}>What to say about it</label>
              <textarea
                id={`tl-notes-${id}`}
                className="sp-input"
                rows={4}
                maxLength={1000}
                value={notesOf(id)}
                onChange={(e) =>
                  set({
                    experiences: overlay.experiences.map((x) => (x.id === id ? { ...x, notes: e.target.value } : x)),
                  })
                }
              />
              <button
                type="button"
                onClick={() =>
                  set({
                    experiences: overlay.experiences.map((x) =>
                      x.id === id ? { ...x, notes: original.get(id) ?? "" } : x,
                    ),
                  })
                }
              >
                <RotateCcw size={13} aria-hidden="true" /> Use my own wording
              </button>
            </div>
          )}
        />
        <div className="tl-two tl-two--top">
          <Picker
            legend="Projects"
            items={facts.projects}
            shown={overlay.projects}
            onChange={(ids) => set({ projects: ids })}
          />
          <Picker
            legend="Certifications"
            items={facts.certifications}
            shown={overlay.certifications}
            onChange={(ids) => set({ certifications: ids })}
          />
        </div>
        <p className="tl-note">Your education, contact details and references always stay as they are on your page.</p>
      </div>

      <div className="tl-bar">
        {formError && (
          <p className="sp-alert" role="alert">
            {formError}
          </p>
        )}
        <div className="tl-bar-row">
          <Field id="tl-name" label="Name this version" error={fieldErrors.name}>
            <input
              id="tl-name"
              className="sp-input"
              placeholder="Frontend, Backend, Fullstack…"
              value={review.name}
              maxLength={40}
              onChange={(e) => onChange({ ...review, name: e.target.value })}
              onBlur={() => !review.name.trim() && onChange({ ...review, name: defaultName(review.job) })}
            />
          </Field>
          <div className="tl-actions">
            <Button
              variant="primary"
              icon={<Save size={16} aria-hidden="true" />}
              onClick={onSave}
              disabled={!canSave || saving}
            >
              {saving ? "Saving…" : review.editingId ? "Save changes" : "Save version"}
            </Button>
            <Button icon={<Download size={16} aria-hidden="true" />} onClick={onDownload} disabled={downloading}>
              {downloading ? "Making the PDF…" : `Download PDF · ${layoutLabel}`}
            </Button>
          </div>
        </div>
        {saveHint && <p className="tl-note">{saveHint}</p>}
      </div>
    </section>
  );
}
