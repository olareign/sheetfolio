"use client";

import { Button } from "@/components/sp/Button";
import { LocalTime } from "./LocalTime";

export function SaveBar({
  submitting,
  dirty,
  savedAt,
}: {
  submitting: boolean;
  dirty: boolean;
  savedAt: string | null;
}) {
  return (
    <div className="cms-actions">
      <Button type="submit" variant="primary" disabled={submitting}>
        {submitting ? "Saving…" : "Save draft"}
      </Button>
      <span className="sp-annot" aria-live="polite">
        {dirty ? (
          "Unsaved changes"
        ) : savedAt ? (
          <>
            Saved <LocalTime iso={savedAt} format="time" />
          </>
        ) : null}
      </span>
    </div>
  );
}
