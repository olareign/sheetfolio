"use client";

import { ExternalLink, Upload } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import type { UploadKind } from "@/content/form-spec";
import { UPLOAD_RULES } from "@/content/uploads";
import { Button } from "@/components/sp/Button";
import { uploadFile } from "./upload-client";

/** Single-file upload bound to a URL value (avatar, certificate scan). */
export function UploadField({
  id,
  value,
  onChange,
  kind,
  slug,
  folder,
  describedBy,
}: {
  id: string;
  value: string | undefined;
  onChange: (url: string | undefined) => void;
  kind: UploadKind;
  slug: string;
  folder: string;
  describedBy?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isPdf = value?.toLowerCase().endsWith(".pdf");

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      onChange(await uploadFile(file, { slug, folder, kind }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="cms-file">
      {value && !isPdf && (
        <div className="cms-file-preview">
          <Image src={value} alt="" width={96} height={72} />
        </div>
      )}
      {value && (
        <a href={value} target="_blank" rel="noopener" className="sp-annot">
          View file <ExternalLink size={14} strokeWidth={1.5} aria-hidden="true" />
        </a>
      )}
      <input
        ref={input}
        id={id}
        type="file"
        accept={UPLOAD_RULES[kind].contentTypes.join(",")}
        className="sp-visually-hidden"
        aria-describedby={describedBy}
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      <Button
        size="sm"
        onClick={() => input.current?.click()}
        disabled={busy}
        icon={<Upload size={16} strokeWidth={1.5} aria-hidden="true" />}
      >
        {busy ? "Uploading…" : value ? "Replace" : "Upload"}
      </Button>
      {value && (
        <Button size="sm" variant="ghost" className="cms-danger" onClick={() => onChange(undefined)} disabled={busy}>
          Remove
        </Button>
      )}
      <span className="sp-field-hint">{UPLOAD_RULES[kind].hint}</span>
      {error && (
        <span className="sp-field-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
