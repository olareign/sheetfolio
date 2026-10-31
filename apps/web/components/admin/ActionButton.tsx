"use client";

import { useState, useTransition, type ReactNode } from "react";
import type { AdminResult } from "@/app/(platform)/admin/actions";
import { ConfirmDialog } from "@/components/cms/ConfirmDialog";
import { Button } from "@/components/sp/Button";

/**
 * One admin action as a button: it can ask first, shows that it is working, and says in words what happened. The page
 * refreshes itself when the action succeeds (the Server Action revalidates the admin pages).
 */
export function ActionButton<Args extends unknown[]>({
  label,
  pendingLabel,
  action,
  args,
  confirm,
  danger,
  primary,
  icon,
  className,
  ariaLabel,
}: {
  label: ReactNode;
  pendingLabel?: string;
  /** A Server Action and the values to call it with. Pages cannot pass a closure to a client component, only these. */
  action: (...args: Args) => Promise<AdminResult>;
  args: Args;
  /** Ask before running. Leave out for changes that are easy to undo. */
  confirm?: { title: string; body: string; confirmLabel: string };
  danger?: boolean;
  primary?: boolean;
  icon?: ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  const [asking, setAsking] = useState(false);
  const [pending, start] = useTransition();
  const [result, setResult] = useState<AdminResult | null>(null);

  const go = () =>
    start(async () => {
      setResult(null);
      setResult(await action(...args));
      setAsking(false);
    });

  return (
    <>
      <Button
        size="sm"
        variant={primary ? "primary" : danger ? "ghost" : "default"}
        className={[danger ? "cms-danger" : "", className ?? ""].filter(Boolean).join(" ") || undefined}
        icon={icon}
        disabled={pending}
        aria-label={ariaLabel}
        onClick={() => (confirm ? setAsking(true) : go())}
      >
        {pending ? (pendingLabel ?? "Working…") : label}
      </Button>
      <span className="ad-result" role="status" aria-live="polite">
        {result && !result.ok ? <span className="sp-field-error">{result.error}</span> : result?.message}
      </span>
      {confirm && (
        <ConfirmDialog
          open={asking}
          title={confirm.title}
          body={confirm.body}
          confirmLabel={confirm.confirmLabel}
          pending={pending}
          onConfirm={go}
          onCancel={() => setAsking(false)}
        />
      )}
    </>
  );
}
