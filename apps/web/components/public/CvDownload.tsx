"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/sp/Button";
import { cvHref } from "./view-model";

/**
 * "Download CV": one button, one PDF, in the layout the page owner chose in Dashboard → CV. Visitors don't choose a
 * layout; the owner decides what their page hands out (the download route ignores any layout a visitor asks for).
 * The link carries the publish time, so a new layout choice reaches visitors as a new URL on the next Publish.
 *
 * A click is counted for the owner's dashboard with a beacon, which doesn't delay the download. Previews don't count.
 */
export function CvDownload({ slug, publishedAt, preview }: { slug: string; publishedAt?: string; preview?: boolean }) {
  const count = () => {
    if (preview) return;
    const body = JSON.stringify({ slug, kind: "cv" });
    if (!navigator.sendBeacon?.("/api/view", body)) {
      void fetch("/api/view", { method: "POST", body, keepalive: true }).catch(() => undefined);
    }
  };
  return (
    <Button
      href={cvHref(slug, publishedAt)}
      native
      download
      onClick={count}
      icon={<Download size={18} strokeWidth={1.5} aria-hidden="true" />}
    >
      Download CV
    </Button>
  );
}
