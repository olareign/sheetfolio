"use client";

import { useEffect } from "react";

/**
 * Counts one view per page per browser tab (reloads don't inflate the numbers).
 * The page itself stays fully cached; only this beacon touches Redis.
 */
export function ViewBeacon({ slug, projectId }: { slug: string; projectId?: string }) {
  useEffect(() => {
    const key = `sp:view:${slug}:${projectId ?? ""}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // storage blocked (private mode): count anyway
    }
    const body = JSON.stringify({ slug, projectId });
    if (!navigator.sendBeacon?.("/api/view", body)) {
      void fetch("/api/view", { method: "POST", body, keepalive: true }).catch(() => undefined);
    }
  }, [slug, projectId]);
  return null;
}
