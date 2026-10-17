"use client";

import { upload } from "@vercel/blob/client";
import type { UploadKind } from "@/content/form-spec";
import { UPLOAD_RULES, uploadPath } from "@/content/uploads";

/** Uploads a file browser → Vercel Blob via a token from /api/upload. Returns the public URL. */
export async function uploadFile(
  file: File,
  opts: { slug: string; folder: string; kind: UploadKind },
): Promise<string> {
  const rule = UPLOAD_RULES[opts.kind];
  if (!rule.contentTypes.includes(file.type)) throw new Error(`${file.name}: wrong file type. ${rule.hint}.`);
  if (file.size > rule.maxBytes) throw new Error(`${file.name} is too large. ${rule.hint}.`);
  try {
    const blob = await upload(uploadPath(opts.slug, opts.folder, file.name), file, {
      access: "public",
      handleUploadUrl: "/api/upload",
      clientPayload: JSON.stringify({ kind: opts.kind }),
    });
    return blob.url;
  } catch (err) {
    const reason = (await serverReason()) ?? (err instanceof Error ? err.message : "unknown error");
    throw new Error(`Couldn't upload ${file.name}: ${reason}`);
  }
}

/** Asks the upload route why it refused (signed out, not configured); null if it looks fine. */
async function serverReason(): Promise<string | null> {
  try {
    const res = await fetch("/api/upload", { method: "GET" });
    if (res.ok) return null;
    const body: unknown = await res.json();
    return typeof body === "object" && body !== null && "error" in body && typeof body.error === "string"
      ? body.error
      : null;
  } catch {
    return null; // offline: fall back to the original error
  }
}
