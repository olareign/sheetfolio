"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { skipSetupAction } from "@/app/(admin)/dashboard/actions";
import { Button } from "@/components/sp/Button";

/** Lifts the hold on a new page's dashboard. The guide stays in the menu until the page is live and complete. */
export function SkipSetup() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function skip() {
    setError(null);
    start(async () => {
      const result = await skipSetupAction();
      if (!result.ok) return setError(result.formError ?? "Could not skip setup. Try again.");
      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <div className="sw-skip">
      <div>
        <b>Let&rsquo;s finish the basics first</b>
        <p>The rest of your dashboard opens once your summary, location and WhatsApp number are in.</p>
        {error && (
          <p className="sp-field-error" role="alert">
            {error}
          </p>
        )}
      </div>
      <Button variant="ghost" onClick={skip} disabled={pending}>
        {pending ? "Skipping…" : "Skip setup"}
      </Button>
    </div>
  );
}
