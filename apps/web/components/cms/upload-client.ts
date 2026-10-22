"use client";

import type { UploadKind } from "@/content/form-spec";
import { UPLOAD_RULES, uploadPath } from "@/content/uploads";

type Signed = { uploadUrl: string; apiKey: string; signature: string; fields: Record<string, string> };

const errorOf = (body: unknown): string | null => {
  if (typeof body !== "object" || body === null || !("error" in body)) return null;
  const e = body.error;
  if (typeof e === "string") return e;
  return typeof e === "object" && e !== null && "message" in e && typeof e.message === "string" ? e.message : null;
};

/** Uploads a file browser → Cloudinary with a signature from /api/upload. Returns the public (https) URL. */
export async function uploadFile(
  file: File,
  opts: { slug: string; folder: string; kind: UploadKind },
): Promise<string> {
  const rule = UPLOAD_RULES[opts.kind];
  if (!rule.contentTypes.includes(file.type)) throw new Error(`${file.name}: wrong file type. ${rule.hint}.`);
  if (file.size > rule.maxBytes) throw new Error(`${file.name} is too large. ${rule.hint}.`);

  const fail = (reason: string) => new Error(`Couldn't upload ${file.name}: ${reason}`);
  try {
    const signRes = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pathname: uploadPath(opts.slug, opts.folder, file.name), kind: opts.kind }),
    });
    const signBody: unknown = await signRes.json().catch(() => null);
    if (!signRes.ok) throw fail(errorOf(signBody) ?? "the server refused the upload");
    const signed = signBody as Signed;

    const form = new FormData();
    for (const [k, v] of Object.entries(signed.fields)) form.set(k, v);
    form.set("api_key", signed.apiKey);
    form.set("signature", signed.signature);
    form.set("file", file);
    const res = await fetch(signed.uploadUrl, { method: "POST", body: form });
    const body = (await res.json().catch(() => null)) as { secure_url?: string } | null;
    if (!res.ok || !body?.secure_url) throw fail(errorOf(body) ?? "the image service refused the file");
    return body.secure_url;
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("Couldn't upload")) throw err;
    throw fail("check your connection and try again");
  }
}
