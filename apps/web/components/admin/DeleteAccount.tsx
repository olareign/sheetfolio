"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { deleteAccountAction } from "@/app/(platform)/admin/actions";
import { Button } from "@/components/sp/Button";

/** Deleting an account cannot be undone, so the admin has to type the page address first. */
export function DeleteAccount({ slug }: { slug: string }) {
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const close = () => {
    setOpen(false);
    setTyped("");
    setError(null);
  };
  const confirm = () =>
    start(async () => {
      const result = await deleteAccountAction(slug, typed);
      if (result.ok) router.push("/admin/users");
      else setError(result.error);
    });

  return (
    <>
      <Button size="sm" variant="ghost" className="cms-danger" onClick={() => setOpen(true)}>
        Delete account…
      </Button>
      <dialog ref={ref} className="cms-dialog" aria-labelledby={`del-${slug}`} onClose={close}>
        <h2 id={`del-${slug}`}>Delete /{slug}?</h2>
        <p>
          This removes the account, its page, enquiries, saved CVs and view history for good. Files in Cloudinary stay.
          It cannot be undone.
        </p>
        <label className="ad-confirm-field">
          <span>
            Type <b>{slug}</b> to confirm
          </span>
          <input
            className="sp-input"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
          />
        </label>
        {error && (
          <p className="sp-field-error" role="alert">
            {error}
          </p>
        )}
        <div className="cms-dialog-actions">
          <Button size="sm" variant="ghost" onClick={close} disabled={pending}>
            Cancel
          </Button>
          <Button
            size="sm"
            variant="primary"
            className="ad-danger-solid"
            onClick={confirm}
            disabled={pending || typed !== slug}
          >
            {pending ? "Deleting…" : "Delete for good"}
          </Button>
        </div>
      </dialog>
    </>
  );
}
