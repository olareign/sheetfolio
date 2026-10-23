"use client";

import { Check, Copy, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import {
  publishAction,
  saveCvLayoutsAction,
  saveItemAction,
  saveSetupAction,
  type ActionResult,
} from "@/app/(admin)/dashboard/actions";
import { Button } from "@/components/sp/Button";
import { Field } from "@/components/sp/Field";
import { CV_TEMPLATE_IDS, CV_TEMPLATES, type CvTemplateId } from "@/content/cv-templates";
import { CATEGORY_LABELS, type Category } from "@/content/schemas";
import { missingRequired, type SetupData, type StepId } from "@/content/setup";
import { CvImport } from "./CvImport";
import { CvThumb } from "./CvThumb";
import { UploadField } from "./UploadField";

const STEPS: { id: StepId; label: string; required?: boolean }[] = [
  { id: "start", label: "Start" },
  { id: "about", label: "About you", required: true },
  { id: "contact", label: "Contact", required: true },
  { id: "work", label: "Your work" },
  { id: "cv", label: "CV layout" },
  { id: "publish", label: "Publish" },
];

function errorsOf(result: Extract<ActionResult, { ok: false }>): Record<string, string> {
  return result.fieldErrors;
}

export function SetupWizard({ data, initialStep }: { data: SetupData; initialStep: StepId }) {
  const router = useRouter();
  const [step, setStep] = useState<StepId>(initialStep);
  const [notice, setNotice] = useState<string | null>(null);
  const index = STEPS.findIndex((s) => s.id === step);

  const go = (id: StepId) => {
    setStep(id);
    setNotice(null);
    window.history.replaceState(null, "", `?step=${id}`);
    document.getElementById("setup-top")?.scrollIntoView({ block: "start" });
  };
  const next = () => go(STEPS[Math.min(index + 1, STEPS.length - 1)]!.id);
  const back = () => go(STEPS[Math.max(index - 1, 0)]!.id);
  const done = (id: StepId): boolean => {
    switch (id) {
      case "start":
        return index > 0;
      case "about":
        return Boolean(data.summary.trim() && data.location.trim());
      case "contact":
        return Boolean(data.whatsapp.trim());
      case "work":
        return data.counts.projects > 0;
      case "cv":
        return index > STEPS.findIndex((s) => s.id === "cv");
      case "publish":
        return data.published;
    }
  };

  const key = `${step}-${data.version}`;
  return (
    <div className="sw" id="setup-top">
      <ol className="sw-steps" aria-label="Setup steps">
        {STEPS.map((s, i) => (
          <li key={s.id} className={s.id === step ? "is-current" : done(s.id) ? "is-done" : undefined}>
            <button type="button" onClick={() => go(s.id)} aria-current={s.id === step ? "step" : undefined}>
              <span className="sw-dot" aria-hidden="true">
                {done(s.id) && s.id !== step ? <Check size={14} strokeWidth={3} /> : i + 1}
              </span>
              <span className="sw-label">
                {s.label}
                {s.required && <em> required</em>}
              </span>
            </button>
          </li>
        ))}
      </ol>

      {notice && (
        <p className="cms-notice" role="status">
          {notice}
        </p>
      )}

      <div className="sw-panel">
        {step === "start" && (
          <StartStep
            key={key}
            onImported={(n) => {
              router.refresh(); // the boxes in the next steps start from what the import saved
              go("about");
              setNotice(n);
            }}
            onScratch={next}
          />
        )}
        {step === "about" && <AboutStep key={key} data={data} onSaved={next} onBack={back} />}
        {step === "contact" && <ContactStep key={key} data={data} onSaved={next} onBack={back} />}
        {step === "work" && <WorkStep key={key} data={data} onNext={next} onBack={back} />}
        {step === "cv" && <CvStep key={key} data={data} onSaved={next} onBack={back} />}
        {step === "publish" && <PublishStep key={key} data={data} onBack={back} onFix={go} />}
      </div>
    </div>
  );
}

function Panel({ title, lead, children }: { title: string; lead: string; children: ReactNode }) {
  return (
    <>
      <h2>{title}</h2>
      <p className="sw-lead">{lead}</p>
      {children}
    </>
  );
}

function Nav({ onBack, children }: { onBack?: () => void; children: ReactNode }) {
  return (
    <div className="sw-nav">
      {onBack && (
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
      )}
      <span className="cms-spacer" />
      {children}
    </div>
  );
}

// ── Start ───────────────────────────────────────────────────────────────────

function StartStep({ onImported, onScratch }: { onImported: (notice: string) => void; onScratch: () => void }) {
  const [reviewing, setReviewing] = useState(false);
  return (
    <Panel
      title="Let's get your page ready"
      lead="Start from your CV and we fill in what we can, or start from scratch. Either way, you check everything before it goes anywhere."
    >
      <div className={reviewing ? "sw-choice is-review" : "sw-choice"}>
        <section className="sw-card" aria-labelledby="sw-cv">
          <h3 id="sw-cv">Start from your CV</h3>
          {!reviewing && <p>Upload a PDF and your details, roles, education and certificates are suggested for you.</p>}
          <CvImport onDone={onImported} onPhaseChange={(p) => setReviewing(p === "review")} />
        </section>
        {!reviewing && (
          <section className="sw-card" aria-labelledby="sw-scratch">
            <h3 id="sw-scratch">Start from scratch</h3>
            <p>Answer a few short questions. It takes a few minutes, and you can add more later.</p>
            <Button variant="primary" onClick={onScratch}>
              Fill it in myself
            </Button>
          </section>
        )}
      </div>
    </Panel>
  );
}

// ── About ───────────────────────────────────────────────────────────────────

function useSave() {
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const run = (fn: () => Promise<ActionResult>, onOk: (r: Extract<ActionResult, { ok: true }>) => void) =>
    start(async () => {
      setErrors({});
      setFormError(null);
      const r = await fn();
      if (r.ok) return onOk(r);
      setErrors(errorsOf(r));
      setFormError(r.formError ?? (Object.keys(r.fieldErrors).length ? "Some boxes need fixing." : null));
    });
  return { pending, errors, formError, run };
}

function AboutStep({ data, onSaved, onBack }: { data: SetupData; onSaved: () => void; onBack: () => void }) {
  const [v, setV] = useState({
    headline: data.headline,
    summary: data.summary,
    location: data.location,
    availability: data.availability,
    yearsExperience: data.yearsExperience,
    avatar: data.avatar,
  });
  const { pending, errors, formError, run } = useSave();
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    run(() => saveSetupAction("about", v), onSaved);
  };

  return (
    <Panel title="About you" lead="This is the first thing visitors read. Keep it short and plain.">
      <form onSubmit={submit} noValidate className="sw-form">
        {formError && (
          <p className="sp-alert" role="alert">
            {formError}
          </p>
        )}
        <Field
          id="sw-headline"
          label="Headline"
          required
          hint="What you do, in a few words. Example: Site Engineer."
          error={errors.headline}
        >
          <input id="sw-headline" className="sp-input" value={v.headline} onChange={set("headline")} maxLength={80} />
        </Field>
        <Field
          id="sw-summary"
          label="Summary"
          required
          hint="Two or three sentences: what you do, for whom, and what you are good at."
          error={errors.summary}
        >
          <textarea
            id="sw-summary"
            className="sp-input"
            rows={5}
            value={v.summary}
            onChange={set("summary")}
            maxLength={1200}
          />
        </Field>
        <div className="sw-row">
          <Field id="sw-location" label="Base location" required hint="City and country." error={errors.location}>
            <input
              id="sw-location"
              className="sp-input"
              value={v.location}
              onChange={set("location")}
              placeholder="City, Country"
            />
          </Field>
          <Field id="sw-years" label="Years of experience" error={errors.yearsExperience}>
            <input
              id="sw-years"
              className="sp-input"
              type="number"
              min={0}
              max={70}
              value={v.yearsExperience}
              onChange={set("yearsExperience")}
            />
          </Field>
        </div>
        <Field
          id="sw-availability"
          label="Availability"
          hint="Optional. Example: Open to new projects."
          error={errors.availability}
        >
          <input
            id="sw-availability"
            className="sp-input"
            value={v.availability}
            onChange={set("availability")}
            maxLength={80}
          />
        </Field>
        <Field
          id="sw-photo"
          label="Your photo"
          hint="Optional, but pages with a photo are easier to trust. It also appears when your link is shared and on the Featured list."
          error={errors.avatar}
        >
          <UploadField
            id="sw-photo"
            kind="image"
            slug={data.slug}
            folder="images"
            value={v.avatar || undefined}
            onChange={(url) => setV({ ...v, avatar: url ?? "" })}
          />
        </Field>
        <Nav onBack={onBack}>
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? "Saving…" : "Save and continue"}
          </Button>
        </Nav>
      </form>
    </Panel>
  );
}

// ── Contact ─────────────────────────────────────────────────────────────────

function ContactStep({ data, onSaved, onBack }: { data: SetupData; onSaved: () => void; onBack: () => void }) {
  const [v, setV] = useState({ whatsapp: data.whatsapp, publicEmail: data.publicEmail, phone: data.phone });
  const { pending, errors, formError, run } = useSave();
  const submit = (e: FormEvent) => {
    e.preventDefault();
    run(() => saveSetupAction("contact", { ...v, whatsapp: v.whatsapp.replace(/\D/g, "") }), onSaved);
  };

  return (
    <Panel title="How people reach you" lead="Visitors can message you on WhatsApp or by email from your page.">
      <form onSubmit={submit} noValidate className="sw-form">
        {formError && (
          <p className="sp-alert" role="alert">
            {formError}
          </p>
        )}
        <Field
          id="sw-whatsapp"
          label="WhatsApp number"
          required
          hint="With the country code, no + or spaces. Example: 2348012345678."
          error={errors.whatsapp}
        >
          <input
            id="sw-whatsapp"
            className="sp-input"
            inputMode="numeric"
            autoComplete="tel"
            value={v.whatsapp}
            onChange={(e) => setV({ ...v, whatsapp: e.target.value })}
            onBlur={() => setV((c) => ({ ...c, whatsapp: c.whatsapp.replace(/\D/g, "") }))}
          />
        </Field>
        <Field
          id="sw-email"
          label="Email for enquiries"
          required
          hint="Enquiries from your page are sent here."
          error={errors.publicEmail}
        >
          <input
            id="sw-email"
            className="sp-input"
            type="email"
            autoComplete="email"
            value={v.publicEmail}
            onChange={(e) => setV({ ...v, publicEmail: e.target.value })}
          />
        </Field>
        <Field id="sw-phone" label="Phone" hint="Optional. Only shown if you choose to." error={errors.phone}>
          <input
            id="sw-phone"
            className="sp-input"
            type="tel"
            autoComplete="tel"
            value={v.phone}
            onChange={(e) => setV({ ...v, phone: e.target.value })}
          />
        </Field>
        <Nav onBack={onBack}>
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? "Saving…" : "Save and continue"}
          </Button>
        </Nav>
      </form>
    </Panel>
  );
}

// ── Work ────────────────────────────────────────────────────────────────────

function WorkStep({ data, onNext, onBack }: { data: SetupData; onNext: () => void; onBack: () => void }) {
  const router = useRouter();
  const year = new Date().getFullYear();
  const blank = {
    title: "",
    category: "building" as Category,
    role: data.headline,
    location: data.location,
    startYear: String(year),
    status: "completed",
    websiteUrl: "",
  };
  const [v, setV] = useState(blank);
  const [added, setAdded] = useState<string | null>(null);
  const { pending, errors, formError, run } = useSave();
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setAdded(null);
    run(
      () =>
        saveItemAction("projects", "new", {
          title: v.title,
          category: v.category,
          role: v.role,
          location: v.location,
          startYear: Number(v.startYear),
          status: v.status,
          websiteUrl: v.websiteUrl.trim() || undefined,
          scope: "",
          images: [],
          featured: false,
        }),
      (r) => {
        setAdded(r.notice ?? `Added “${v.title}”.`);
        setV(blank);
        router.refresh();
      },
    );
  };
  const c = data.counts;

  return (
    <Panel
      title="Your work"
      lead="Add a project or two now, or skip this and add them from your dashboard whenever you like."
    >
      <p className="sw-counts">
        <Link href="/dashboard/projects">
          {c.projects} {c.projects === 1 ? "project" : "projects"}
        </Link>{" "}
        ·{" "}
        <Link href="/dashboard/experiences">
          {c.experiences} {c.experiences === 1 ? "role" : "roles"}
        </Link>{" "}
        · <Link href="/dashboard/education">{c.education} education</Link> ·{" "}
        <Link href="/dashboard/certifications">
          {c.certifications} {c.certifications === 1 ? "certification" : "certifications"}
        </Link>
      </p>
      {data.projects.length > 0 && (
        <ul className="sw-added" aria-label="Projects you have added">
          {data.projects.slice(-5).map((p) => (
            <li key={p.id}>
              <Check size={16} aria-hidden="true" /> {p.title}
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={submit} noValidate className="sw-form">
        <h3 className="sw-sub">Add a project</h3>
        {added && (
          <p className="cms-notice" role="status">
            {added}
          </p>
        )}
        {formError && (
          <p className="sp-alert" role="alert">
            {formError}
          </p>
        )}
        <Field id="sw-p-title" label="Project name" error={errors.title}>
          <input
            id="sw-p-title"
            className="sp-input"
            value={v.title}
            onChange={(e) => setV({ ...v, title: e.target.value })}
          />
        </Field>
        <Field
          id="sw-p-web"
          label="Project website"
          hint="Optional. We read the site's picture and description for you."
          error={errors.websiteUrl}
        >
          <input
            id="sw-p-web"
            className="sp-input"
            type="url"
            placeholder="https://"
            value={v.websiteUrl}
            onChange={(e) => setV({ ...v, websiteUrl: e.target.value })}
          />
        </Field>
        <div className="sw-row">
          <Field id="sw-p-cat" label="Type" error={errors.category}>
            <select
              id="sw-p-cat"
              className="sp-input"
              value={v.category}
              onChange={(e) => setV({ ...v, category: e.target.value as Category })}
            >
              {(Object.keys(CATEGORY_LABELS) as Category[]).map((k) => (
                <option key={k} value={k}>
                  {CATEGORY_LABELS[k]}
                </option>
              ))}
            </select>
          </Field>
          <Field id="sw-p-role" label="Your role" error={errors.role}>
            <input
              id="sw-p-role"
              className="sp-input"
              value={v.role}
              onChange={(e) => setV({ ...v, role: e.target.value })}
            />
          </Field>
        </div>
        <div className="sw-row">
          <Field id="sw-p-loc" label="Location" error={errors.location}>
            <input
              id="sw-p-loc"
              className="sp-input"
              value={v.location}
              onChange={(e) => setV({ ...v, location: e.target.value })}
            />
          </Field>
          <Field id="sw-p-year" label="Start year" error={errors.startYear}>
            <input
              id="sw-p-year"
              className="sp-input"
              type="number"
              value={v.startYear}
              onChange={(e) => setV({ ...v, startYear: e.target.value })}
            />
          </Field>
          <Field id="sw-p-status" label="Status" error={errors.status}>
            <select
              id="sw-p-status"
              className="sp-input"
              value={v.status}
              onChange={(e) => setV({ ...v, status: e.target.value })}
            >
              <option value="completed">Completed</option>
              <option value="ongoing">Ongoing</option>
            </select>
          </Field>
        </div>
        <div>
          <Button type="submit" disabled={pending || !v.title.trim()}>
            {pending ? "Adding…" : "Add this project"}
          </Button>
        </div>
      </form>
      <Nav onBack={onBack}>
        <Button variant="primary" onClick={onNext}>
          {data.counts.projects > 0 ? "Continue" : "Skip for now"}
        </Button>
      </Nav>
    </Panel>
  );
}

// ── CV layout ───────────────────────────────────────────────────────────────

function CvStep({ data, onSaved, onBack }: { data: SetupData; onSaved: () => void; onBack: () => void }) {
  const [chosen, setChosen] = useState<CvTemplateId>(data.cvTemplate);
  const { pending, formError, run } = useSave();
  return (
    <Panel
      title="Your CV"
      lead="Visitors get one Download CV button on your page. Pick the layout they receive; they cannot change it."
    >
      <fieldset className="sw-cv">
        <legend className="sp-visually-hidden">CV layout</legend>
        {CV_TEMPLATE_IDS.map((id) => (
          <label key={id} className={chosen === id ? "sw-cv-opt is-on" : "sw-cv-opt"}>
            <input type="radio" name="cv" value={id} checked={chosen === id} onChange={() => setChosen(id)} />
            <CvThumb id={id} />
            <b>{CV_TEMPLATES[id].label}</b>
            <span>{CV_TEMPLATES[id].description}</span>
            <a
              href={`/api/cv/preview?template=${id}`}
              target="_blank"
              rel="noopener"
              onClick={(e) => e.stopPropagation()}
            >
              Preview <ExternalLink size={13} aria-hidden="true" />
            </a>
          </label>
        ))}
      </fieldset>
      {formError && (
        <p className="sp-alert" role="alert">
          {formError}
        </p>
      )}
      <Nav onBack={onBack}>
        <Button
          variant="primary"
          disabled={pending}
          onClick={() => run(() => saveCvLayoutsAction({ cvTemplates: [chosen], cvTemplate: chosen }), onSaved)}
        >
          {pending ? "Saving…" : "Save and continue"}
        </Button>
      </Nav>
    </Panel>
  );
}

// ── Publish ─────────────────────────────────────────────────────────────────

function PublishStep({ data, onBack, onFix }: { data: SetupData; onBack: () => void; onFix: (id: StepId) => void }) {
  const router = useRouter();
  const missing = missingRequired(data);
  const [live, setLive] = useState(data.published);
  const [copied, setCopied] = useState(false);
  const { pending, formError, errors, run } = useSave();
  const extras = [
    !data.avatar && { label: "Add a photo", step: "about" as StepId },
    data.counts.projects === 0 && { label: "Add a project", step: "work" as StepId },
    data.counts.experiences === 0 && { label: "Add your experience", href: "/dashboard/experiences/new" },
  ].filter(Boolean) as { label: string; step?: StepId; href?: string }[];

  async function copy() {
    try {
      await navigator.clipboard.writeText(data.pageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* the link is shown on screen to copy by hand */
    }
  }

  if (live) {
    const share = `https://wa.me/?text=${encodeURIComponent(`My page: ${data.pageUrl}`)}`;
    return (
      <Panel
        title="Your page is live"
        lead="Share this link anywhere. When people open it in a chat they see your photo, name and headline."
      >
        <div className="sw-live">
          <code>{data.pageUrl}</code>
          <div className="sw-live-actions">
            <Button onClick={copy} icon={<Copy size={16} aria-hidden="true" />}>
              {copied ? "Copied" : "Copy link"}
            </Button>
            <Button
              href={data.pageUrl}
              target="_blank"
              rel="noopener"
              icon={<ExternalLink size={16} aria-hidden="true" />}
            >
              View page
            </Button>
            <Button href={share} target="_blank" rel="noopener">
              Share on WhatsApp
            </Button>
          </div>
        </div>
        <Nav onBack={onBack}>
          <Button variant="primary" href="/dashboard">
            Go to my dashboard
          </Button>
        </Nav>
      </Panel>
    );
  }

  return (
    <Panel
      title="Ready to publish?"
      lead="Check this list, then publish. You can change anything afterwards and publish again."
    >
      <ul className="sw-check" aria-label="Before you publish">
        {missing.length === 0 && (
          <li className="is-ok">
            <Check size={16} aria-hidden="true" /> Everything required is filled in
          </li>
        )}
        {missing.map((m) => (
          <li key={m.label} className="is-missing">
            <span aria-hidden="true">!</span> {m.label}
            <button type="button" onClick={() => onFix(m.step)}>
              Fix
            </button>
          </li>
        ))}
      </ul>
      {extras.length > 0 && (
        <>
          <h3 className="sw-sub">Worth adding, but not required</h3>
          <ul className="sw-check sw-check--soft">
            {extras.map((x) => (
              <li key={x.label}>
                {x.href ? (
                  <Link href={x.href}>{x.label}</Link>
                ) : (
                  <button type="button" onClick={() => onFix(x.step!)}>
                    {x.label}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
      {formError && (
        <p className="sp-alert" role="alert">
          {formError}
        </p>
      )}
      {Object.values(errors).length > 0 && (
        <ul className="sw-check">
          {Object.entries(errors).map(([k, m]) => (
            <li key={k} className="is-missing">
              <span aria-hidden="true">!</span> {m}
            </li>
          ))}
        </ul>
      )}
      <Nav onBack={onBack}>
        <Button
          variant="primary"
          disabled={pending || missing.length > 0}
          onClick={() =>
            run(
              () => publishAction(),
              () => {
                setLive(true);
                router.refresh();
              },
            )
          }
        >
          {pending ? "Publishing…" : "Publish my page"}
        </Button>
      </Nav>
    </Panel>
  );
}
