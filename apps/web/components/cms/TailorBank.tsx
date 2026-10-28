"use client";

import { Download, FileText, History, Pencil, Replace, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/sp/Button";
import type { CvTemplateId } from "@/content/cv-templates";
import { LocalTime } from "./LocalTime";
import { ConfirmDialog } from "./ConfirmDialog";
import type { BankItem, TemplateChoice } from "./tailor-ui";

/** The saved tailored CVs (up to three): download, edit, use on the page, or delete. */
export function TailorBank({
  bank,
  max,
  restore,
  templates,
  template,
  onTemplate,
  busy,
  onEdit,
  onDownload,
  onApply,
  onDelete,
  onRestore,
  onKeepCurrent,
}: {
  bank: BankItem[];
  max: number;
  restore: { label: string; takenAt: string } | null;
  templates: TemplateChoice[];
  template: CvTemplateId;
  onTemplate: (id: CvTemplateId) => void;
  /** The id of the version an action is running for, or "restore". */
  busy: string | null;
  onEdit: (item: BankItem) => void;
  onDownload: (item: BankItem) => void;
  onApply: (item: BankItem) => void;
  onDelete: (item: BankItem) => Promise<boolean>;
  onRestore: () => void;
  onKeepCurrent: () => void;
}) {
  const [confirming, setConfirming] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<BankItem | null>(null);

  return (
    <section className="tl-bank" aria-labelledby="tl-bank-title">
      <header className="tl-bank-head">
        <div>
          <h2 id="tl-bank-title">Your saved versions</h2>
          <p>
            {bank.length} of {max} saved. Keep a version for each kind of job, like Frontend, Backend and Fullstack, and
            download or switch to any of them whenever you like.
          </p>
        </div>
        <label className="tl-template">
          <span className="sp-visually-hidden">CV layout</span>
          <select className="sp-input" value={template} onChange={(e) => onTemplate(e.target.value as CvTemplateId)}>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label} layout
              </option>
            ))}
          </select>
        </label>
      </header>

      {restore && (
        <div className="tl-restore" role="status">
          <History size={18} aria-hidden="true" />
          <p>
            Your page is using wording from a saved version. Your own wording from{" "}
            <LocalTime iso={restore.takenAt} format="date" /> is kept.
          </p>
          <Button size="sm" onClick={onRestore} disabled={busy === "restore"}>
            {busy === "restore" ? "Restoring…" : "Restore my wording"}
          </Button>
          <Button size="sm" variant="ghost" onClick={onKeepCurrent} disabled={busy === "restore"}>
            Keep this
          </Button>
        </div>
      )}

      {bank.length === 0 ? (
        <p className="tl-empty">Nothing saved yet. Tailor your CV to a job above, then save it here.</p>
      ) : (
        <ul className="tl-cards">
          {bank.map((item) => (
            <li key={item.id} className="tl-card">
              <div className="tl-card-top">
                <FileText size={20} aria-hidden="true" />
                <div>
                  <b>{item.name}</b>
                  <small>
                    {[item.jobTitle, item.jobCompany].filter(Boolean).join(" at ") || "Edited by you"} · saved{" "}
                    <LocalTime iso={item.updatedAt} format="date" />
                  </small>
                </div>
              </div>
              <p className="tl-card-headline">{item.overlay.headline}</p>
              <div className="tl-card-actions">
                <Button
                  size="sm"
                  icon={<Download size={14} aria-hidden="true" />}
                  onClick={() => onDownload(item)}
                  disabled={busy === item.id}
                >
                  {busy === item.id ? "Making the PDF…" : "Download"}
                </Button>
                <Button size="sm" icon={<Pencil size={14} aria-hidden="true" />} onClick={() => onEdit(item)}>
                  Edit
                </Button>
                <Button
                  size="sm"
                  icon={<Replace size={14} aria-hidden="true" />}
                  onClick={() => setConfirming(item.id)}
                >
                  Use on my page
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="cms-danger"
                  icon={<Trash2 size={14} aria-hidden="true" />}
                  onClick={() => setDeleting(item)}
                >
                  Delete
                </Button>
              </div>
              {confirming === item.id && (
                <div className="tl-confirm" role="group" aria-label={`Use ${item.name} on your page`}>
                  <p>
                    This puts this version&rsquo;s headline, summary, skills, experience wording and order on your page.
                    Nothing is deleted, and you can restore your own wording afterwards.
                  </p>
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={busy === item.id}
                    onClick={() => {
                      setConfirming(null);
                      onApply(item);
                    }}
                  >
                    Yes, use it
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirming(null)}>
                    Cancel
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={deleting !== null}
        title={`Delete ${deleting?.name ?? "this version"}?`}
        body="This removes the saved version only. Your page and your other versions are not changed."
        confirmLabel="Delete"
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          const item = deleting;
          setDeleting(null);
          if (item) await onDelete(item);
        }}
      />
    </section>
  );
}
