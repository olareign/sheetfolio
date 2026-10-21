import { ChevronDown, Download } from "lucide-react";
import { Button, buttonClass } from "@/components/sp/Button";
import { CV_TEMPLATES, type CvTemplateId } from "@/content/cv-templates";
import { cvHref } from "./view-model";

/**
 * "Download CV" for the layouts the page owner chose to offer (`templates`, default first; see offeredCvTemplates).
 * One layout is a plain download button. Several open a list: a native <details>, so it works without JavaScript and
 * by keyboard, with each layout a plain download link.
 */
export function CvDownload({
  slug,
  publishedAt,
  templates,
}: {
  slug: string;
  publishedAt?: string;
  templates: CvTemplateId[];
}) {
  const [only, ...others] = templates;
  if (!only) return null;
  const icon = <Download size={18} strokeWidth={1.5} aria-hidden="true" />;

  if (others.length === 0) {
    return (
      <Button href={cvHref(slug, publishedAt, only)} native icon={icon}>
        Download CV
      </Button>
    );
  }
  return (
    <details className="pp-cv">
      <summary className={buttonClass()}>
        {icon}
        Download CV
        <ChevronDown size={16} strokeWidth={1.5} aria-hidden="true" />
      </summary>
      <ul className="pp-cv-menu" aria-label="Choose a CV layout">
        {templates.map((id, index) => (
          <li key={id}>
            <a className="pp-cv-option" href={cvHref(slug, publishedAt, id)} download>
              <span className="pp-cv-name">
                {CV_TEMPLATES[id].label}
                {index === 0 && <span className="pp-cv-default">Default</span>}
              </span>
              <span className="pp-cv-desc">{CV_TEMPLATES[id].description}</span>
            </a>
          </li>
        ))}
      </ul>
    </details>
  );
}
