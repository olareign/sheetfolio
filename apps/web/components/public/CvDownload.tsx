import { Download } from "lucide-react";
import { Button } from "@/components/sp/Button";
import { cvHref } from "./view-model";

/**
 * "Download CV": one button, one PDF, in the layout the page owner chose in Dashboard → CV. Visitors don't choose a
 * layout; the owner decides what their page hands out (the download route ignores any layout a visitor asks for).
 * The link carries the publish time, so a new layout choice reaches visitors as a new URL on the next Publish.
 */
export function CvDownload({ slug, publishedAt }: { slug: string; publishedAt?: string }) {
  return (
    <Button href={cvHref(slug, publishedAt)} native download icon={<Download size={18} strokeWidth={1.5} aria-hidden="true" />}>
      Download CV
    </Button>
  );
}
