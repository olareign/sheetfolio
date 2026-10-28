"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

export const SETUP_PATH = "/dashboard/setup";

/**
 * While a new page is locked to the setup guide, every other dashboard address sends the person back to it. This is
 * guidance, not security: the pages stay behind sign-in either way. Nothing else is drawn while redirecting, so the
 * other page never flashes.
 */
export function SetupGate({ locked, children }: { locked: boolean; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const blocked = locked && pathname !== SETUP_PATH;

  useEffect(() => {
    if (blocked) router.replace(SETUP_PATH);
  }, [blocked, router]);

  if (blocked) {
    return (
      <main className="cms-content" aria-busy="true">
        <p className="sp-annot" role="status">
          Taking you to the setup guide…
        </p>
      </main>
    );
  }
  return children;
}
