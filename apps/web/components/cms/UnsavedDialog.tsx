"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/sp/Button";

/**
 * Shown when Publish is pressed while a form holds edits that were never saved. The choice is the person's:
 * publish those edits too, or publish only what the draft already has. Native modal <dialog>, like ConfirmDialog.
 */
export function UnsavedDialog({
  open,
  pending,
  onSaveAndPublish,
  onPublishSaved,
  onCancel,
}: {
  open: boolean;
  pending: boolean;
  onSaveAndPublish: () => void;
  onPublishSaved: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="cms-dialog cms-dialog--choice"
      aria-labelledby="unsaved-title"
      aria-describedby="unsaved-body"
      onCancel={onCancel}
    >
      <h2 id="unsaved-title">You have unsaved changes</h2>
      <p id="unsaved-body">
        What you typed on this page has not been saved to your draft yet. Save it first to publish it, or publish what
        is already saved. Your unsaved edits stay here either way.
      </p>
      <div className="cms-dialog-actions cms-dialog-actions--stack">
        <Button variant="primary" onClick={onSaveAndPublish} disabled={pending} autoFocus>
          {pending ? "Working…" : "Save and publish"}
        </Button>
        <Button variant="default" onClick={onPublishSaved} disabled={pending}>
          Publish without these changes
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
      </div>
    </dialog>
  );
}
