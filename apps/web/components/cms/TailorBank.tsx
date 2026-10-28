"use client";

import { Download, Pencil, Plus, Replace, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/sp/Button";
import { ConfirmDialog } from "./ConfirmDialog";
import { LocalTime } from "./LocalTime";
import type { BankItem } from "./tailor-ui";

/**
 * The saved tailored CVs as a fixed set of slots (three): a filled slot can be downloaded, edited, used on the page or
 * deleted; an empty one says how to fill it.
 */
export function TailorBank({
  bank,
  max,
  busy,
  onEdit,
  onDownload,
  onApply,
  onDelete,
}: {
  bank: BankItem[];
  max: number;
  /** The id of the version an action is running for. */
  busy: string | null;
  onEdit: (item: BankItem) => void;
  onDownload: (item: BankItem) => void;
  onApply: (item: BankItem) => void;
  onDelete: (item: BankItem) => Promise<boolean>;
}) {
  const [confirming, setConfirming] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<BankItem | null>(null);
  const empty = Math.max(0, max - bank.length);

  return (
    <section className="tl-panel" aria-labelledby="tl-bank-title">
      <header className="tl-panel-head">
        <h2 id="tl-bank-title">Your saved versions</h2>
        <span className="tl-count">
          {bank.length}/{max}
        </span>
      </header>
      <p className="tl-panel-lead">One for each kind of job, like Frontend or Backend.</p>

      <ul className="tl-slots">
        {bank.map((item, i) => (
          <li key={item.id} className="tl-slot">
            <div className="tl-slot-text">
              <span className="tl-slot-no">Version {i + 1}</span>
              <b title={item.name}>{item.name}</b>
              <small>
                {[item.jobTitle, item.jobCompany].filter(Boolean).join(" at ") || "Edited by you"} · saved{" "}
                <LocalTime iso={item.updatedAt} format="date" />
              </small>
            </div>
            <div className="tl-slot-actions">
              <Button
                size="sm"
                variant="primary"
                aria-label={busy === item.id ? "Making the PDF…" : `Download ${item.name} as a PDF`}
                title={busy === item.id ? "Making the PDF…" : "Download PDF"}
                icon={<Download size={14} aria-hidden="true" />}
                onClick={() => onDownload(item)}
                disabled={busy === item.id}
              />
              <Button
                size="sm"
                aria-label={`Edit ${item.name}`}
                title="Edit"
                icon={<Pencil size={14} aria-hidden="true" />}
                onClick={() => onEdit(item)}
              />
              <Button
                size="sm"
                aria-label={`Use ${item.name} on my page`}
                title="Use on my page"
                icon={<Replace size={14} aria-hidden="true" />}
                onClick={() => setConfirming(item.id)}
              />
              <Button
                size="sm"
                variant="ghost"
                className="cms-danger"
                aria-label={`Delete ${item.name}`}
                title="Delete"
                icon={<Trash2 size={14} aria-hidden="true" />}
                onClick={() => setDeleting(item)}
              />
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
        {Array.from({ length: empty }, (_, i) => (
          <li key={`empty-${i}`} className="tl-slot tl-slot--empty">
            <Plus size={18} aria-hidden="true" />
            <div>
              <b>Version {bank.length + i + 1} is free</b>
              <small>Save a tailored CV here.</small>
            </div>
          </li>
        ))}
      </ul>

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
