"use client";

import { Button } from "@/components/sp/Button";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="cms-content">
      <h1 className="cms-title">Something went wrong</h1>
      <p className="sp-alert" role="alert">
        We couldn&rsquo;t load this part of your dashboard. Your saved work is safe.
        {error.digest && <> Reference: {error.digest}</>}
      </p>
      <div>
        <Button variant="primary" onClick={reset}>
          Try again
        </Button>
      </div>
    </main>
  );
}
