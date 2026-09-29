"use client";

import { useState, useTransition } from "react";
import { markAllLeadsReadAction, markLeadReadAction } from "@/app/(admin)/dashboard/actions";
import { Button } from "@/components/sp/Button";

function useAction() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<{ ok: boolean; formError?: string }>) =>
    start(async () => {
      setError(null);
      const result = await fn();
      if (!result.ok) setError(result.formError ?? "That didn't work. Try again.");
    });
  return { pending, error, run };
}

export function MarkReadButton({ id }: { id: string }) {
  const { pending, error, run } = useAction();
  return (
    <>
      <Button size="sm" onClick={() => run(() => markLeadReadAction(id))} disabled={pending}>
        {pending ? "Marking…" : "Mark as read"}
      </Button>
      {error && (
        <span className="sp-field-error" role="alert">
          {error}
        </span>
      )}
    </>
  );
}

export function MarkAllReadButton() {
  const { pending, error, run } = useAction();
  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => run(markAllLeadsReadAction)} disabled={pending}>
        {pending ? "Marking…" : "Mark all as read"}
      </Button>
      {error && (
        <span className="sp-field-error" role="alert">
          {error}
        </span>
      )}
    </>
  );
}
