"use client";

import { Link2, Sparkles, TextCursorInput } from "lucide-react";
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
import type { TailorOverlay, TailorResult } from "@/content/tailor";
import { TailorBank } from "./TailorBank";
import { TailorReview } from "./TailorReview";
import { defaultName, type BankItem, type Review, type TailorFacts, type TemplateChoice } from "./tailor-ui";

type Mode = "link" | "text";

/**
 * Tailor to a job: give a link or paste the description, review what the AI proposes (every word can be changed), then
 * download it or keep it in one of three saved versions. The page itself only changes when a version is used on it.
 */
export function TailorStudio({
  configured,
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
  configured: boolean;
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
  const [template, setTemplate] = useState<CvTemplateId>(defaultTemplate);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const reviewTop = useRef<HTMLDivElement>(null);

  const full = bank.length >= maxSaved;
  const canGenerate = configured && quotaKnown && left > 0 && hasContent && !working;

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
      setReview({
        name: defaultName(result.job),
        overlay: result.overlay,
        result,
        job: { title: result.job.title, company: result.job.company, source: result.job.source ?? "" },
      });
      requestAnimationFrame(() => reviewTop.current?.scrollIntoView({ block: "start", behavior: "smooth" }));
    } catch {
      setError("Check your connection and try again.");
    } finally {
      setWorking(false);
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
      <p className="tl-lead">
        Paste a job description or give a link to it, and we reshape your headline, summary, skills and experience
        around what the job asks for. We only reword and reorder what is already on your page. Nothing here changes your
        page unless you choose to use a version on it.
      </p>

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
        <p className="sp-alert">AI tailoring is not switched on yet. Your saved versions below still work.</p>
      ) : !hasContent ? (
        <p className="sp-alert">
          There is nothing to tailor yet. Add your experience or projects, or start from your CV in the setup guide.
        </p>
      ) : (
        <form className="tl-input" onSubmit={generate} noValidate>
          <div className="tl-tabs" role="group" aria-label="How to give the job">
            <button type="button" aria-pressed={mode === "link"} onClick={() => setMode("link")}>
              <Link2 size={16} aria-hidden="true" /> Job link
            </button>
            <button type="button" aria-pressed={mode === "text"} onClick={() => setMode("text")}>
              <TextCursorInput size={16} aria-hidden="true" /> Paste the description
            </button>
          </div>
          {mode === "link" ? (
            <Field
              id="tl-url"
              label="Link to the job"
              hint="Some job sites need you to sign in and can't be read. If that happens, paste the description instead."
            >
              <input
                id="tl-url"
                className="sp-input"
                type="url"
                inputMode="url"
                placeholder="https://"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={working}
              />
            </Field>
          ) : (
            <Field
              id="tl-text"
              label="Job description"
              hint="Paste the whole posting: duties, requirements and skills."
            >
              <textarea
                id="tl-text"
                className="sp-input"
                rows={10}
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
              disabled={!canGenerate || (mode === "link" ? !url.trim() : !text.trim())}
            >
              {working ? "Reading the job and your page…" : "Tailor my CV"}
            </Button>
            <span className="tl-quota" aria-live="polite">
              {!quotaKnown
                ? "Tailoring is unavailable for a moment."
                : left > 0
                  ? `${left} of ${quota?.limit ?? 5} tailorings left today`
                  : "No tailorings left today. They come back within 24 hours."}
            </span>
          </div>
          {working && (
            <p className="tl-wait" role="status">
              This usually takes under a minute. Your job description and the parts of your page a CV uses are sent to
              Claude (Anthropic) to write this. Nothing is saved yet.
            </p>
          )}
          {error && (
            <p className="sp-alert" role="alert">
              {error}
            </p>
          )}
        </form>
      )}

      <div ref={reviewTop} />
      {review && (
        <TailorReview
          review={review}
          facts={facts}
          onChange={setReview}
          templates={templates}
          template={template}
          onTemplate={setTemplate}
          canSave={Boolean(review.editingId) || !full}
          saveHint={
            !review.editingId && full
              ? `You already have ${maxSaved} saved versions. Delete one below to save this, or download it without saving.`
              : undefined
          }
          saving={saving}
          downloading={downloading}
          formError={saveError ?? (review ? error : null)}
          fieldErrors={fieldErrors}
          onSave={save}
          onDownload={() => download({ overlay: review.overlay, label: review.name }, setDownloading)}
          onClose={() => setReview(null)}
        />
      )}

      <TailorBank
        bank={bank}
        max={maxSaved}
        restore={restore}
        templates={templates}
        template={template}
        onTemplate={setTemplate}
        busy={busy}
        onEdit={(item) => {
          setSaveError(null);
          setFieldErrors({});
          setReview({
            editingId: item.id,
            name: item.name,
            overlay: item.overlay,
            job: { title: item.jobTitle, company: item.jobCompany, source: item.jobSource },
          });
          requestAnimationFrame(() => reviewTop.current?.scrollIntoView({ block: "start", behavior: "smooth" }));
        }}
        onDownload={(item) => download({ id: item.id }, (on) => setBusy(on ? item.id : null))}
        onApply={(item) => act(item.id, () => applyTailoredAction(item.id), "Your page now uses this version.")}
        onDelete={async (item) => {
          await act(item.id, () => deleteTailoredAction(item.id), "Deleted.");
          return true;
        }}
        onRestore={() => act("restore", restoreTailoredAction, "Your page is back to your own wording.")}
        onKeepCurrent={() => act("restore", discardTailoredRestoreAction, "Done. Your page keeps its current wording.")}
      />
    </div>
  );
}
