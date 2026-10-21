import { ChevronDown, Download } from "lucide-react";
import { buttonClass } from "@/components/sp/Button";
import { CV_TEMPLATE_IDS, CV_TEMPLATES, type CvTemplateId } from "@/content/cv-templates";
import { cvHref } from "./view-model";

/**
 * "Download CV" with a choice of layout. A native <details>, so it works without JavaScript and by keyboard:
 * the summary toggles the list, and each layout is a plain download link. The page owner's default comes first.
 */
export function CvDownload({
  slug,
  publishedAt,
  defaultTemplate,
}: {
  slug: string;
  publishedAt?: string;
  defaultTemplate: CvTemplateId;
}) {
  const ordered = [defaultTemplate, ...CV_TEMPLATE_IDS.filter((id) => id !== defaultTemplate)];
  return (
    <details className="pp-cv">
      <summary className={buttonClass()}>
        <Download size={18} strokeWidth={1.5} aria-hidden="true" />
        Download CV
        <ChevronDown size={16} strokeWidth={1.5} aria-hidden="true" />
      </summary>
      <ul className="pp-cv-menu" aria-label="Choose a CV layout">
        {ordered.map((id) => (
          <li key={id}>
            <a className="pp-cv-option" href={cvHref(slug, publishedAt, id)} download>
              <span className="pp-cv-name">
                {CV_TEMPLATES[id].label}
                {id === defaultTemplate && <span className="pp-cv-default">Default</span>}
              </span>
              <span className="pp-cv-desc">{CV_TEMPLATES[id].description}</span>
            </a>
          </li>
        ))}
      </ul>
    </details>
  );
}
