"use client";

import { ClipboardPaste, History, Link2, Lock, ShieldCheck, Sparkles, TextCursorInput, Wand2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type FormEvent } from "react";
import {
  applyTailoredAction,
  deleteTailoredAction,
  discardTailoredRestoreAction,
  restoreTailoredAction,
  saveTailoredAction,
  type ActionResult,
} from "@/app/(admin)/dashboard/actions";
import { Button } from "@/components/sp/Button";
import { Field } from "@/components/sp/Field";
import type { CvTemplateId } from "@/content/cv-templates";
import {
  JOB_TEXT_MAX,
  JOB_TEXT_MIN,
  TAILOR_ENGINES,
  type TailorEngine,
  type TailorOverlay,
  type TailorResult,
} from "@/content/tailor";
import { LocalTime } from "./LocalTime";
import { TailorBank } from "./TailorBank";
import { TailorLayoutPicker } from "./TailorLayoutPicker";
import { TailorReview } from "./TailorReview";
import { defaultName, type BankItem, type Review, type TailorFacts, type TemplateChoice } from "./tailor-ui";

type Mode = "link" | "text";

const STEPS = ["Add the job", "Review the changes", "Download or keep it"] as const;

/**
 * Tailor to a job: give a link or paste the description, review what the AI proposes (every word can be changed), then
 * download it or keep it in one of three saved versions. The page itself only changes when a version is used on it.
 */
export function TailorStudio({
  engine,
  upgradeHint,
  quota,
  quotaKnown,
  facts,
  bank,
  maxSaved,
  restore,
  templates,
  defaultTemplate,
  hasContent,
}: {
  /** Who writes for this account, or null when AI tailoring is not switched on. */
  engine: TailorEngine | null;
  /** Show that Claude comes with the Pro plan (accounts that are not on it). */
  upgradeHint: boolean;
  quota: { remaining: number; limit: number } | null;
  /** False when the daily allowance could not be read: shown as unavailable instead of as "none left". */
  quotaKnown: boolean;
  facts: TailorFacts;
  bank: BankItem[];
  maxSaved: number;
  restore: { label: string; takenAt: string } | null;
  templates: TemplateChoice[];
  defaultTemplate: CvTemplateId;
  hasContent: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [mode, setMode] = useState<Mode>("link");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [left, setLeft] = useState(quota?.remaining ?? 0);
  const [review, setReview] = useState<Review | null>(null);
  const [downloaded, setDownloaded] = useState(false);
  const [template, setTemplate] = useState<CvTemplateId>(defaultTemplate);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const workspace = useRef<HTMLDivElement>(null);

  const limit = quota?.limit ?? TAILOR_ENGINES[engine ?? "groq"].dailyRuns;
  const full = bank.length >= maxSaved;
  const configured = engine !== null;
  const canGenerate = configured && quotaKnown && left > 0 && hasContent && !working;
  const trimmed = text.trim().length;
  const ready = mode === "link" ? url.trim().length > 0 : trimmed >= JOB_TEXT_MIN && trimmed <= JOB_TEXT_MAX;
  const step = review ? (downloaded ? 2 : 1) : 0;
  const layoutLabel = templates.find((t) => t.id === template)?.label ?? "Modern";

  const toWorkspace = () =>
    requestAnimationFrame(() => workspace.current?.scrollIntoView({ block: "start", behavior: "smooth" }));

  async function generate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setWorking(true);
    try {
      const res = await fetch("/api/tailor", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(mode === "link" ? { url } : { text }),
      });
      const json = (await res.json().catch(() => null)) as {
        result?: TailorResult;
        quota?: { remaining: number };
        error?: string;
      } | null;
      if (json?.quota) setLeft(json.quota.remaining);
      if (!res.ok || !json?.result) {
        if (res.status === 429) setLeft(0);
        return setError(json?.error ?? "Something went wrong. Try again.");
      }
      const { result } = json;
      setSaveError(null);
      setFieldErrors({});
      setDownloaded(false);
      setReview({
        name: defaultName(result.job),
        overlay: result.overlay,
        result,
        job: { title: result.job.title, company: result.job.company, source: result.job.source ?? "" },
      });
      toWorkspace();
    } catch {
      setError("Check your connection and try again.");
    } finally {
      setWorking(false);
    }
  }

  async function paste() {
    try {
      const clip = (await navigator.clipboard.readText()).trim();
      if (!clip) return;
      if (mode === "link") setUrl(clip);
      else setText(clip);
      setError(null);
    } catch {
      setError("Your browser did not allow that. Press Ctrl+V (or ⌘V on a Mac) in the box instead.");
    }
  }

  function failureOf(result: Extract<ActionResult, { ok: false }>) {
    setFieldErrors(result.fieldErrors);
    setSaveError(result.formError ?? "Some details need fixing.");
  }

  async function save() {
    if (!review) return;
    setSaving(true);
    setSaveError(null);
    setFieldErrors({});
    const result = await saveTailoredAction({
      id: review.editingId,
      name: review.name,
      overlay: review.overlay,
      job: review.job,
    });
    setSaving(false);
    if (!result.ok) return failureOf(result);
    setNotice(review.editingId ? "Changes saved." : "Saved. You can download it or use it on your page any time.");
    setReview(null);
    startTransition(() => router.refresh());
  }

  async function download(body: { id?: string; overlay?: TailorOverlay; label?: string }, mark: (on: boolean) => void) {
    mark(true);
    setError(null);
    try {
      const res = await fetch("/api/tailor/pdf", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...body, template }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { error?: string } | null;
        return setError(json?.error ?? "We could not make the PDF. Try again.");
      }
      const blob = await res.blob();
      const name = /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1] ?? "CV.pdf";
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = name;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(link.href), 10_000);
      setDownloaded(true);
    } catch {
      setError("Check your connection and try again.");
    } finally {
      mark(false);
    }
  }

  async function act(id: string, run: () => Promise<ActionResult>, done: string) {
    setBusy(id);
    setError(null);
    setNotice(null);
    const result = await run();
    setBusy(null);
    if (!result.ok) return setError(result.formError ?? "Something went wrong. Try again.");
    setNotice(result.notice ?? done);
    startTransition(() => router.refresh());
  }

  return (
    <div className="tl">
      <header className="tl-hero">
        <div className="tl-hero-copy">
          <span className="tl-eyebrow tl-eyebrow--light">
            <Sparkles size={14} aria-hidden="true" /> Tailor to a job
          </span>
          <h1>Tailor your CV to any job</h1>
          <p>
            Give us a job link or paste the description. We reshape your headline, summary, skills and experience around
            what the job asks for, using only what is already on your page.
          </p>
          <ol className="tl-steps" aria-label="Steps">
            {STEPS.map((label, i) => (
              <li key={label} className={i < step ? "is-done" : i === step ? "is-now" : undefined}>
                <span aria-hidden="true">{i + 1}</span>
                {label}
              </li>
            ))}
          </ol>
        </div>
        <div className="tl-meter">
          {engine && (
            <span className="tl-meter-engine">
              <Sparkles size={14} aria-hidden="true" />
              <b>{TAILOR_ENGINES[engine].label}</b>
              <em>{engine === "claude" ? "Pro" : "Free while we test"}</em>
            </span>
          )}
          <span className="tl-meter-label">Tailorings left today</span>
          {configured && quotaKnown ? (
            <>
              <b>
                {left}
                <small>/{limit}</small>
              </b>
              <span className="tl-pips" aria-hidden="true">
                {Array.from({ length: limit }, (_, i) => (
                  <i key={i} className={i < left ? "is-on" : undefined} />
                ))}
              </span>
              <p>{left > 0 ? "Each one comes back 24 hours after you use it." : "They come back within 24 hours."}</p>
            </>
          ) : (
            <p>{configured ? "Unavailable for a moment. Try again shortly." : "Not switched on yet."}</p>
          )}
          {engine && upgradeHint && (
            <p className="tl-meter-upgrade">
              <Lock size={12} aria-hidden="true" /> Claude, with sharper wording, comes with the Pro plan.
            </p>
          )}
        </div>
      </header>

      <div className="tl-grid">
        <div className="tl-main" ref={workspace}>
          {restore && (
            <div className="tl-restore" role="status">
              <History size={18} aria-hidden="true" />
              <p>
                Your page uses wording from a saved version. Your own wording from{" "}
                <LocalTime iso={restore.takenAt} format="date" /> is kept.
              </p>
              <div>
                <Button
                  size="sm"
                  onClick={() => act("restore", restoreTailoredAction, "Your page is back to your own wording.")}
                  disabled={busy === "restore"}
                >
                  {busy === "restore" ? "Restoring…" : "Restore my wording"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    act("restore", discardTailoredRestoreAction, "Done. Your page keeps its current wording.")
                  }
                  disabled={busy === "restore"}
                >
                  Keep this
                </Button>
              </div>
            </div>
          )}
          {notice && (
            <p className="cms-notice" role="status">
              {notice}
            </p>
          )}
          {error && !review && (
            <p className="sp-alert" role="alert">
              {error}
            </p>
          )}

          {!configured ? (
            <p className="sp-alert">AI tailoring is not switched on yet. Your saved versions still work.</p>
          ) : !hasContent ? (
            <p className="sp-alert">
              There is nothing to tailor yet. Add your experience or projects, or start from your CV in the setup guide.
            </p>
          ) : review ? (
            <div className="tl-jobbar">
              <Wand2 size={18} aria-hidden="true" />
              <p>
                Tailored for{" "}
                <b>{[review.job.title, review.job.company].filter(Boolean).join(" at ") || "the job you gave us"}</b>
                {review.result && (
                  <span className="tl-engine-tag">Written by {TAILOR_ENGINES[review.result.engine].label}</span>
                )}
              </p>
              <Button size="sm" onClick={() => setReview(null)} disabled={saving}>
                Tailor another job
              </Button>
            </div>
          ) : (
            <form className="tl-input" onSubmit={generate} noValidate>
              <div className="tl-input-head">
                <div>
                  <span className="tl-eyebrow">Step 1</span>
                  <h2>Add the job</h2>
                </div>
                <div className="tl-tabs" role="group" aria-label="How to give the job">
                  <button type="button" aria-pressed={mode === "link"} onClick={() => setMode("link")}>
                    <Link2 size={16} aria-hidden="true" /> Job link
                  </button>
                  <button type="button" aria-pressed={mode === "text"} onClick={() => setMode("text")}>
                    <TextCursorInput size={16} aria-hidden="true" /> Paste the text
                  </button>
                </div>
              </div>

              {mode === "link" ? (
                <Field
                  id="tl-url"
                  label="Link to the job"
                  hint="Some job sites need you to sign in and can't be read. If that happens, paste the description instead."
                >
                  <input
                    id="tl-url"
                    className="sp-input tl-big"
                    type="url"
                    inputMode="url"
                    placeholder="https://company.com/careers/frontend-engineer"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    disabled={working}
                  />
                </Field>
              ) : (
                <Field
                  id="tl-text"
                  label="Job description"
                  hint={
                    trimmed > JOB_TEXT_MAX
                      ? `That is too long. Keep it under ${JOB_TEXT_MAX.toLocaleString("en")} characters.`
                      : trimmed > 0 && trimmed < JOB_TEXT_MIN
                        ? `A little more, please: at least ${JOB_TEXT_MIN} characters. Paste the duties, requirements and skills.`
                        : `Paste the whole posting: duties, requirements and skills. ${trimmed.toLocaleString("en")} of ${JOB_TEXT_MAX.toLocaleString("en")} characters.`
                  }
                >
                  <textarea
                    id="tl-text"
                    className="sp-input tl-big"
                    rows={12}
                    placeholder="Paste the job posting here…"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    disabled={working}
                  />
                </Field>
              )}

              <div className="tl-go">
                <Button
                  type="submit"
                  variant="primary"
                  icon={<Sparkles size={16} aria-hidden="true" />}
                  disabled={!canGenerate || !ready}
                >
                  {working ? "Reading the job and your page…" : "Tailor my CV"}
                </Button>
                <Button
                  icon={<ClipboardPaste size={16} aria-hidden="true" />}
                  onClick={paste}
                  disabled={working}
                  aria-label={
                    mode === "link" ? "Paste a link from your clipboard" : "Paste the text from your clipboard"
                  }
                >
                  Paste
                </Button>
                {left <= 0 && quotaKnown && <span className="tl-note">No tailorings left today.</span>}
              </div>
              {working && (
                <div className="tl-wait" role="status">
                  <span className="tl-bar-anim" aria-hidden="true" />
                  <p>
                    This usually takes under a minute. Your job description and the parts of your page a CV uses are
                    sent to {engine === "claude" ? "Claude (Anthropic)" : "our standard AI provider (Groq)"} to write
                    this. Nothing is saved yet.
                  </p>
                </div>
              )}
              {error && (
                <p className="sp-alert" role="alert">
                  {error}
                </p>
              )}
            </form>
          )}

          {review && (
            <TailorReview
              review={review}
              facts={facts}
              onChange={setReview}
              layoutLabel={layoutLabel}
              canSave={Boolean(review.editingId) || !full}
              saveHint={
                !review.editingId && full
                  ? `You already have ${maxSaved} saved versions. Delete one on the right to save this, or download it without saving.`
                  : undefined
              }
              saving={saving}
              downloading={downloading}
              formError={saveError ?? error}
              fieldErrors={fieldErrors}
              onSave={save}
              onDownload={() => download({ overlay: review.overlay, label: review.name }, setDownloading)}
              onClose={() => setReview(null)}
            />
          )}

          {!review && (
            <section className="tl-trust" aria-label="What we change and what we never do">
              <div>
                <h3>
                  <Wand2 size={16} aria-hidden="true" /> What we change
                </h3>
                <ul>
                  <li>Reword your headline and summary for the job</li>
                  <li>Put your most relevant roles and projects first</li>
                  <li>Pick the skills the job asks for that you really have</li>
                  <li>Point out what the job wants that your page does not show</li>
                </ul>
              </div>
              <div>
                <h3>
                  <ShieldCheck size={16} aria-hidden="true" /> What we never do
                </h3>
                <ul>
                  <li>Invent experience, numbers or qualifications</li>
                  <li>Change your page, unless you choose to use a version on it</li>
                  <li>Send your contact details, private details, references or photos</li>
                  <li>Use your content to train AI models</li>
                </ul>
              </div>
            </section>
          )}
        </div>

        <aside className="tl-rail" aria-label="Your CV versions and layout">
          <section className="tl-panel" aria-labelledby="tl-layout-title">
            <header className="tl-panel-head">
              <h2 id="tl-layout-title">CV layout</h2>
              <span className="tl-count">
                <Lock size={12} aria-hidden="true" /> For downloads
              </span>
            </header>
            <TailorLayoutPicker templates={templates} value={template} onChange={setTemplate} />
          </section>
          <TailorBank
            bank={bank}
            max={maxSaved}
            busy={busy}
            onEdit={(item) => {
              setSaveError(null);
              setFieldErrors({});
              setDownloaded(false);
              setReview({
                editingId: item.id,
                name: item.name,
                overlay: item.overlay,
                job: { title: item.jobTitle, company: item.jobCompany, source: item.jobSource },
              });
              toWorkspace();
            }}
            onDownload={(item) => download({ id: item.id }, (on) => setBusy(on ? item.id : null))}
            onApply={(item) => act(item.id, () => applyTailoredAction(item.id), "Your page now uses this version.")}
            onDelete={async (item) => {
              await act(item.id, () => deleteTailoredAction(item.id), "Deleted.");
              return true;
            }}
          />
        </aside>
      </div>
    </div>
  );
}
