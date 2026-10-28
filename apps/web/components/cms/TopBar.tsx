"use client";

import { Eye, Menu, Rocket } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { publishAction } from "@/app/(admin)/dashboard/actions";
import { issueHref, type PublishState } from "@/content/cms";
import { Button } from "@/components/sp/Button";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { LocalTime } from "./LocalTime";
import { MENU_BUTTON_ID, useNavDrawer } from "./NavDrawer";
import { UnsavedDialog } from "./UnsavedDialog";
import { useUnsavedForms } from "./UnsavedChanges";

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
  locked = false,
}: {
  state: PublishState;
  updatedAt: string;
  labels: Record<string, string>;
  /** Held on the setup guide: there is nothing to preview or publish yet. */
  locked?: boolean;
}) {
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [problems, setProblems] = useState<{ href: string; message: string }[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const unsavedForms = useUnsavedForms();
  const drawer = useNavDrawer();
  const status = STATUS[state];

  /** Publishes the saved draft and shows what is missing when it is not ready. */
  async function publishDraft() {
    const result = await publishAction();
    if (result.ok) return;
    const list = Object.entries(result.fieldErrors).map(([path, message]) => ({ href: issueHref(path), message }));
    if (list.length) setProblems(list);
    else setError(result.formError ?? "Publishing failed. Try again.");
  }

  function onPublish() {
    setProblems(null);
    setError(null);
    // Edits typed into a form but not saved are not in the draft, so ask before publishing without them.
    if (unsavedForms().length > 0) return setAsking(true);
    startTransition(publishDraft);
  }

  function publishSavedOnly() {
    setAsking(false);
    startTransition(publishDraft);
  }

  function saveAndPublish() {
    startTransition(async () => {
      for (const form of unsavedForms()) {
        if (!(await form.save())) {
          // The form shows its own field errors; nothing is published with a half-saved page.
          setAsking(false);
          setError(
            "Your changes could not be saved, so nothing was published. Fix the highlighted fields and try again.",
          );
          return;
        }
      }
      setAsking(false);
      await publishDraft();
    });
  }

  return (
    <header className="cms-topbar">
      <button
        id={MENU_BUTTON_ID}
        type="button"
        className="cms-menu-btn"
        onClick={drawer.show}
        aria-label="Open menu"
        aria-expanded={drawer.open}
        aria-controls="cms-drawer"
      >
        <Menu size={20} strokeWidth={1.75} aria-hidden="true" />
      </button>
      <nav className="cms-crumbs sp-label" aria-label="Breadcrumb">
        {crumbs(pathname, labels).map((c, i, all) => (
          <span key={c.href} className="cms-crumbs">
            {i > 0 && <span aria-hidden="true">/</span>}
            {i === all.length - 1 ? <span aria-current="page">{c.label}</span> : <Link href={c.href}>{c.label}</Link>}
          </span>
        ))}
      </nav>
      <div className="cms-topbar-actions">
        <div className="cms-topbar-meta">
          <span className={`${status.className} cms-status`}>{status.label}</span>
          <span className="sp-annot cms-saved">
            Draft saved <LocalTime iso={updatedAt} format="time" />
          </span>
        </div>
        <ThemeToggle className="cms-topbar-theme" />
        {!locked && (
          <>
            <Button
              href="/preview"
              target="_blank"
              rel="noopener"
              className="cms-preview"
              icon={<Eye size={16} strokeWidth={1.75} aria-hidden="true" />}
            >
              <span className="cms-btn-label">Preview</span>
            </Button>
            {/* Stays enabled when live: republishing is harmless and refreshes the cached public page (e.g. after a seed). */}
            <Button
              variant="primary"
              onClick={onPublish}
              disabled={pending}
              className="cms-publish"
              icon={<Rocket size={16} strokeWidth={1.75} aria-hidden="true" />}
            >
              {pending ? "Publishing…" : "Publish"}
            </Button>
          </>
        )}
      </div>
      <UnsavedDialog
        open={asking}
        pending={pending}
        onSaveAndPublish={saveAndPublish}
        onPublishSaved={publishSavedOnly}
        onCancel={() => setAsking(false)}
      />
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
