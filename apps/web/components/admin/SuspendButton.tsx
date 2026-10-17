"use client";

import { useState, useTransition } from "react";
import { setSuspendedAction } from "@/app/(platform)/admin/actions";
import { ConfirmDialog } from "@/components/cms/ConfirmDialog";
import { Button } from "@/components/sp/Button";

export function SuspendButton({ slug, suspended }: { slug: string; suspended: boolean }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const apply = (next: boolean) =>
    start(async () => {
      setError(null);
      const result = await setSuspendedAction(slug, next);
      setConfirming(false);
      if (!result.ok) setError(result.error);
    });

  return (
    <>
      {suspended ? (
        <Button size="sm" onClick={() => apply(false)} disabled={pending}>
          {pending ? "Restoring…" : "Restore"}
        </Button>
      ) : (
        <Button size="sm" variant="ghost" className="cms-danger" onClick={() => setConfirming(true)} disabled={pending}>
          Suspend
        </Button>
      )}
      {error && (
        <span className="sp-field-error" role="alert">
          {error}
        </span>
      )}
      <ConfirmDialog
        open={confirming}
        title={`Suspend /${slug}?`}
        body="The public page, project pages, CV and enquiry form return 404 until you restore it. The engineer can still edit but not publish."
        confirmLabel="Suspend"
        pending={pending}
        onConfirm={() => apply(true)}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
