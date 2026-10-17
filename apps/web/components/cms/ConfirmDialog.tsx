"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/sp/Button";

/** Native modal <dialog>: focus trap, Esc to cancel and inert background come from the browser. */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  pending,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  pending?: boolean;
  onConfirm: () => void;
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
    <dialog ref={ref} className="cms-dialog" aria-labelledby="confirm-title" onCancel={onCancel} onClose={onCancel}>
      <h2 id="confirm-title">{title}</h2>
      <p>{body}</p>
      <div className="cms-dialog-actions">
        <Button variant="default" onClick={onCancel} disabled={pending} autoFocus>
          Cancel
        </Button>
        <Button variant="ghost" className="cms-danger" onClick={onConfirm} disabled={pending}>
          {pending ? "Deleting…" : confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}
