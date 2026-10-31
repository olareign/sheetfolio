"use client";

import { useState, useTransition } from "react";
import { setPlanAction } from "@/app/(platform)/admin/actions";
import { Button } from "@/components/sp/Button";
import type { UserPlan } from "@/content/schemas";

export function PlanControl({ slug, plan }: { slug: string; plan: UserPlan }) {
  const [choice, setChoice] = useState<UserPlan>(plan);
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const save = () =>
    start(async () => {
      setMessage(null);
      setError(null);
      const result = await setPlanAction(slug, choice);
      if (result.ok) setMessage(result.message ?? "Saved.");
      else setError(result.error);
    });

  return (
    <div className="ad-inline">
      <label className="sp-visually-hidden" htmlFor={`plan-${slug}`}>
        Plan
      </label>
      <select
        id={`plan-${slug}`}
        className="ad-select"
        value={choice}
        onChange={(e) => setChoice(e.target.value as UserPlan)}
      >
        <option value="free">Free (standard AI)</option>
        <option value="pro">Pro (Claude)</option>
      </select>
      <Button size="sm" variant="primary" onClick={save} disabled={pending || choice === plan}>
        {pending ? "Saving…" : "Save plan"}
      </Button>
      <span className="ad-result" role="status" aria-live="polite">
        {error ? <span className="sp-field-error">{error}</span> : message}
      </span>
    </div>
  );
}
