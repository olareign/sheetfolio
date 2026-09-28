import type { UploadKind } from "./form-spec";

/** Shared by the upload route (enforced) and the upload widgets (early feedback). */
export const UPLOAD_RULES: Record<UploadKind, { contentTypes: readonly string[]; maxBytes: number; hint: string }> = {
  image: {
    contentTypes: ["image/jpeg", "image/png", "image/webp"],
    maxBytes: 10 * 1024 * 1024,
    hint: "JPG, PNG or WebP · up to 10 MB",
  },
  document: {
    contentTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
    maxBytes: 10 * 1024 * 1024,
    hint: "PDF, JPG or PNG · up to 10 MB",
  },
};

/** Blob path for an upload: `{slug}/{folder}/{safe-name}`. The route rejects anything outside `{slug}/`. */
export function uploadPath(slug: string, folder: string, fileName: string): string {
  const safe =
    fileName
      .toLowerCase()
      .replace(/[^a-z0-9.]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(-80) || "file";
  return `${slug}/${folder}/${safe}`;
}
