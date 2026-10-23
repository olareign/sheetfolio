"use client";

import { FileUp } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { applyCvImportAction } from "@/app/(admin)/dashboard/actions";
import { Button } from "@/components/sp/Button";
import { Field } from "@/components/sp/Field";
import type { ImportedCv } from "@/lib/cv-import/parse";

type Phase = "pick" | "reading" | "review";
type Row<T> = T & { include: boolean };

const MAX_BYTES = 4 * 1024 * 1024;

function withoutInclude<T extends { include: boolean }>(row: T): Omit<T, "include"> {
  const copy = { ...row } as Partial<T>;
  delete copy.include;
  return copy as Omit<T, "include">;
}

/**
 * "Start from your CV": upload a PDF, see what was found in boxes you can fix, then choose to add it. Nothing is saved
 * until "Add to my page"; the file itself is read once on the server and not kept.
 */
export function CvImport({
  onDone,
  onPhaseChange,
}: {
  onDone: (notice: string) => void;
  onPhaseChange?: (phase: Phase) => void;
}) {
  const [phase, setPhaseState] = useState<Phase>("pick");
  const [error, setError] = useState<string | null>(null);
  const [cv, setCv] = useState<ImportedCv | null>(null);
  const [experiences, setExperiences] = useState<Row<ImportedCv["experiences"][number]>[]>([]);
  const [education, setEducation] = useState<Row<ImportedCv["education"][number]>[]>([]);
  const [certifications, setCertifications] = useState<Row<ImportedCv["certifications"][number]>[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dragging, setDragging] = useState(false);
  const [saving, startSave] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  const setPhase = (p: Phase) => {
    setPhaseState(p);
    onPhaseChange?.(p);
  };

  async function read(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return setError("Choose a PDF. In your word processor, use Save as PDF.");
    }
    if (file.size > MAX_BYTES) return setError("That PDF is too large. Keep it under 4 MB.");
    setPhase("reading");
    try {
      const body = new FormData();
      body.set("cv", file);
      const res = await fetch("/api/cv-import", { method: "POST", body });
      const json = (await res.json().catch(() => null)) as { cv?: ImportedCv; error?: string } | null;
      if (!res.ok || !json?.cv) {
        setPhase("pick");
        return setError(json?.error ?? "We could not read that file. Try again.");
      }
      setCv(json.cv);
      setExperiences(json.cv.experiences.map((e) => ({ ...e, include: true })));
      setEducation(json.cv.education.map((e) => ({ ...e, include: true })));
      setCertifications(json.cv.certifications.map((c) => ({ ...c, include: true })));
      setErrors({});
      setPhase("review");
    } catch {
      setPhase("pick");
      setError("Check your connection and try again.");
    } finally {
      if (input.current) input.current.value = "";
    }
  }

  function apply() {
    if (!cv) return;
    setError(null);
    const keep = <T,>(rows: Row<T>[]) => rows.map((row, original) => ({ row, original })).filter((x) => x.row.include);
    const exp = keep(experiences);
    const edu = keep(education);
    const cert = keep(certifications);
    startSave(async () => {
      const result = await applyCvImportAction({
        profile: {
          name: cv.name,
          headline: cv.headline,
          summary: cv.summary,
          location: cv.location,
          phone: cv.phone,
          yearsExperience: cv.yearsExperience,
        },
        experiences: exp.map(({ row }) => withoutInclude(row)),
        education: edu.map(({ row }) => withoutInclude(row)),
        certifications: cert.map(({ row }) => withoutInclude(row)),
      });
      if (result.ok) return onDone(result.notice ?? "Added from your CV.");
      // Errors come back as "experiences.1.startYear" counting only the kept rows; map them to the rows on screen.
      const mapped: Record<string, string> = {};
      const lists = { experiences: exp, education: edu, certifications: cert } as const;
      for (const [path, message] of Object.entries(result.fieldErrors)) {
        const [list, index, ...rest] = path.split(".");
        const source = lists[list as keyof typeof lists]?.[Number(index)];
        mapped[source ? `${list}.${source.original}.${rest.join(".")}` : path] = message;
      }
      setErrors(mapped);
      setError(result.formError ?? "Some boxes need fixing. They are marked below.");
    });
  }

  if (phase !== "review" || !cv) {
    return (
      <div className="cvi">
        <button
          type="button"
          className={dragging ? "cvi-drop is-over" : "cvi-drop"}
          disabled={phase === "reading"}
          onClick={() => input.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void read(e.dataTransfer.files[0]);
          }}
        >
          <FileUp size={28} strokeWidth={1.5} aria-hidden="true" />
          <b>{phase === "reading" ? "Reading your CV…" : "Choose your CV, or drop it here"}</b>
          <span>PDF with selectable text, up to 4 MB</span>
        </button>
        <input
          ref={input}
          type="file"
          accept="application/pdf,.pdf"
          className="sp-visually-hidden"
          aria-label="Upload your CV as a PDF"
          onChange={(e) => void read(e.target.files?.[0])}
        />
        {error && (
          <p className="sp-field-error" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }

  const field = (list: string, i: number, key: string) => errors[`${list}.${i}.${key}`];
  const profileBox = (label: string, key: keyof ImportedCv, opts: { wide?: boolean; area?: boolean } = {}) => (
    <div className={opts.wide ? "cvi-wide" : undefined}>
      <Field id={`cvi-${key}`} label={label} error={errors[`profile.${key}`]}>
        {opts.area ? (
          <textarea
            id={`cvi-${key}`}
            className="sp-input"
            rows={4}
            value={String(cv[key])}
            onChange={(e) => setCv({ ...cv, [key]: e.target.value })}
          />
        ) : (
          <input
            id={`cvi-${key}`}
            className="sp-input"
            value={String(cv[key])}
            onChange={(e) => setCv({ ...cv, [key]: e.target.value })}
          />
        )}
      </Field>
    </div>
  );
  const cell = (list: string, i: number, key: string, label: string, value: string, set: (v: string) => void) => (
    <label className="cvi-cell">
      <span>{label}</span>
      <input
        className="sp-input"
        value={value}
        aria-invalid={field(list, i, key) ? true : undefined}
        onChange={(e) => set(e.target.value)}
      />
      {field(list, i, key) && <small role="alert">{field(list, i, key)}</small>}
    </label>
  );
  const update = <T,>(rows: Row<T>[], set: (r: Row<T>[]) => void, i: number, patch: Partial<Row<T>>) =>
    set(rows.map((r, n) => (n === i ? { ...r, ...patch } : r)));
  const found = experiences.length + education.length + certifications.length;

  return (
    <div className="cvi cvi-review">
      <p className="cvi-lead">
        {found > 0
          ? "Here is what we found. Fix anything that is wrong, untick what you do not want, then add it to your page. Nothing is saved until you do."
          : "We could not find roles, education or certificates in that CV, but we found some details below. You can add the rest yourself in the next steps."}
      </p>
      {error && (
        <p className="sp-alert" role="alert">
          {error}
        </p>
      )}

      <fieldset className="cvi-group">
        <legend>Your details</legend>
        <div className="cvi-grid">
          {profileBox("Full name", "name")}
          {profileBox("Headline", "headline")}
          {profileBox("Base location", "location")}
          {profileBox("Phone (kept private until you share it)", "phone")}
          {profileBox("Years of experience", "yearsExperience")}
          {profileBox("Summary", "summary", { wide: true, area: true })}
        </div>
      </fieldset>

      {experiences.length > 0 && (
        <fieldset className="cvi-group">
          <legend>Experience ({experiences.length})</legend>
          {experiences.map((e, i) => (
            <div key={i} className={e.include ? "cvi-row" : "cvi-row is-off"}>
              <label className="cvi-include">
                <input
                  type="checkbox"
                  checked={e.include}
                  onChange={(ev) => update(experiences, setExperiences, i, { include: ev.target.checked })}
                />
                <span>Add</span>
              </label>
              <div className="cvi-cells">
                {cell("experiences", i, "role", "Role", e.role, (v) =>
                  update(experiences, setExperiences, i, { role: v }),
                )}
                {cell("experiences", i, "company", "Company", e.company, (v) =>
                  update(experiences, setExperiences, i, { company: v }),
                )}
                {cell("experiences", i, "startYear", "From", e.startYear, (v) =>
                  update(experiences, setExperiences, i, { startYear: v }),
                )}
                {cell("experiences", i, "endYear", "To (blank = now)", e.endYear, (v) =>
                  update(experiences, setExperiences, i, { endYear: v }),
                )}
              </div>
            </div>
          ))}
        </fieldset>
      )}

      {education.length > 0 && (
        <fieldset className="cvi-group">
          <legend>Education ({education.length})</legend>
          {education.map((e, i) => (
            <div key={i} className={e.include ? "cvi-row" : "cvi-row is-off"}>
              <label className="cvi-include">
                <input
                  type="checkbox"
                  checked={e.include}
                  onChange={(ev) => update(education, setEducation, i, { include: ev.target.checked })}
                />
                <span>Add</span>
              </label>
              <div className="cvi-cells">
                {cell("education", i, "qualification", "Qualification", e.qualification, (v) =>
                  update(education, setEducation, i, { qualification: v }),
                )}
                {cell("education", i, "institution", "School", e.institution, (v) =>
                  update(education, setEducation, i, { institution: v }),
                )}
                {cell("education", i, "startYear", "From", e.startYear, (v) =>
                  update(education, setEducation, i, { startYear: v }),
                )}
                {cell("education", i, "endYear", "To", e.endYear, (v) =>
                  update(education, setEducation, i, { endYear: v }),
                )}
              </div>
            </div>
          ))}
        </fieldset>
      )}

      {certifications.length > 0 && (
        <fieldset className="cvi-group">
          <legend>Certifications ({certifications.length})</legend>
          {certifications.map((c, i) => (
            <div key={i} className={c.include ? "cvi-row" : "cvi-row is-off"}>
              <label className="cvi-include">
                <input
                  type="checkbox"
                  checked={c.include}
                  onChange={(ev) => update(certifications, setCertifications, i, { include: ev.target.checked })}
                />
                <span>Add</span>
              </label>
              <div className="cvi-cells cvi-cells--3">
                {cell("certifications", i, "title", "Certificate", c.title, (v) =>
                  update(certifications, setCertifications, i, { title: v }),
                )}
                {cell("certifications", i, "issuer", "Issued by", c.issuer, (v) =>
                  update(certifications, setCertifications, i, { issuer: v }),
                )}
                {cell("certifications", i, "year", "Year", c.year, (v) =>
                  update(certifications, setCertifications, i, { year: v }),
                )}
              </div>
            </div>
          ))}
        </fieldset>
      )}

      <div className="cvi-actions">
        <Button variant="primary" onClick={apply} disabled={saving}>
          {saving ? "Adding…" : "Add to my page"}
        </Button>
        <Button variant="ghost" onClick={() => setPhase("pick")} disabled={saving}>
          Choose a different file
        </Button>
      </div>
    </div>
  );
}
