"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

/** Copies the page's public address. If the browser refuses, the address is on screen beside it to copy by hand. */
export function CopyLink({ url, className }: { url: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* nothing to do: see above */
    }
  }

  return (
    <button type="button" className={className} onClick={copy} aria-live="polite">
      {copied ? (
        <Check size={16} strokeWidth={2} aria-hidden="true" />
      ) : (
        <Copy size={16} strokeWidth={1.75} aria-hidden="true" />
      )}
      {copied ? "Copied" : "Copy link"}
    </button>
  );
}
