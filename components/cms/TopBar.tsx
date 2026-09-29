"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { publishAction } from "@/app/(admin)/dashboard/actions";
import { issueHref, type PublishState } from "@/content/cms";
import { Button } from "@/components/sp/Button";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { LocalTime } from "./LocalTime";

const STATUS: Record<PublishState, { label: string; className: string }> = {
  live: { label: "Live", className: "sp-tag sp-tag--done" },
  changes: { label: "Unpublished changes", className: "sp-tag sp-tag--ongoing" },
  unpublished: { label: "Not published", className: "sp-tag" },
  suspended: { label: "Suspended", className: "sp-tag sp-tag--ongoing" },
};

function crumbs(pathname: string, labels: Record<string, string>): { href: string; label: string }[] {
  const parts = pathname.split("/").filter(Boolean).slice(1); // drop "dashboard"
  const out = [{ href: "/dashboard", label: "Dashboard" }];
  if (parts[0]) out.push({ href: `/dashboard/${parts[0]}`, label: labels[parts[0]] ?? parts[0] });
  if (parts[1]) out.push({ href: pathname, label: parts[1] === "new" ? "New" : "Edit" });
  return out;
}

export function TopBar({
  state,
  updatedAt,
  labels,
}: {
  state: PublishState;
  updatedAt: string;
  labels: Record<string, string>;
}) {
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [problems, setProblems] = useState<{ href: string; message: string }[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const status = STATUS[state];

  function onPublish() {
    setProblems(null);
    setError(null);
    startTransition(async () => {
      const result = await publishAction();
      if (result.ok) return;
      const list = Object.entries(result.fieldErrors).map(([path, message]) => ({ href: issueHref(path), message }));
      if (list.length) setProblems(list);
      else setError(result.formError ?? "Publishing failed. Try again.");
    });
  }

  return (
    <header className="cms-topbar">
      <nav className="cms-crumbs sp-label" aria-label="Breadcrumb">
        {crumbs(pathname, labels).map((c, i, all) => (
          <span key={c.href} className="cms-crumbs">
            {i > 0 && <span aria-hidden="true">/</span>}
            {i === all.length - 1 ? <span aria-current="page">{c.label}</span> : <Link href={c.href}>{c.label}</Link>}
          </span>
        ))}
      </nav>
      <div className="cms-topbar-actions">
        <span className={status.className}>{status.label}</span>
        <span className="sp-annot">
          Draft saved <LocalTime iso={updatedAt} format="time" />
        </span>
        <ThemeToggle />
        <Button href="/preview" target="_blank" rel="noopener">
          Preview
        </Button>
        {/* Stays enabled when live: republishing is harmless and refreshes the cached public page (e.g. after a seed). */}
        <Button variant="primary" onClick={onPublish} disabled={pending}>
          {pending ? "Publishing…" : "Publish"}
        </Button>
      </div>
      {(problems || error) && (
        <div className="cms-publish-errors" role="alert">
          <span className="sp-label">Not published</span>
          {error && <p className="sp-field-error">{error}</p>}
          {problems && (
            <ul>
              {problems.map((p) => (
                <li key={p.message}>
                  <Link href={p.href} onClick={() => setProblems(null)}>
                    {p.message}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Button size="sm" variant="ghost" onClick={() => (setProblems(null), setError(null))}>
            Dismiss
          </Button>
        </div>
      )}
    </header>
  );
}
