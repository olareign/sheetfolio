"use client";

import type { CvTemplateId } from "@/content/cv-templates";
import { CvThumb } from "./CvThumb";
import type { TemplateChoice } from "./tailor-ui";

/** Which of the four CV layouts a download uses. One choice for the whole page, drawn so the four can be told apart. */
export function TailorLayoutPicker({
  templates,
  value,
  onChange,
}: {
  templates: TemplateChoice[];
  value: CvTemplateId;
  onChange: (id: CvTemplateId) => void;
}) {
  return (
    <div className="tl-layouts" role="radiogroup" aria-label="CV layout for downloads">
      {templates.map((t) => (
        <button
          key={t.id}
          type="button"
          role="radio"
          aria-checked={value === t.id}
          className={value === t.id ? "tl-layout is-on" : "tl-layout"}
          onClick={() => onChange(t.id)}
        >
          <span className="tl-layout-thumb">
            <CvThumb id={t.id} />
          </span>
          <span>{t.label}</span>
        </button>
      ))}
    </div>
  );
}
