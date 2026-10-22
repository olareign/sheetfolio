import "server-only";
import { createHash } from "node:crypto";

export type CloudinaryConfig = { cloudName: string; apiKey: string; apiSecret: string };

/** `CLOUDINARY_URL` as shown on the Cloudinary dashboard: `cloudinary://<api_key>:<api_secret>@<cloud_name>`. */
export function parseCloudinaryUrl(raw: string): CloudinaryConfig | null {
  const match = /^cloudinary:\/\/([^:@/\s]+):([^@/\s]+)@([A-Za-z0-9_-]+)\/?$/.exec(raw.trim());
  return match ? { apiKey: match[1]!, apiSecret: match[2]!, cloudName: match[3]! } : null;
}

type Param = string | number | boolean;

/**
 * Cloudinary's upload signature: the parameters sorted by name and joined as `k=v&k=v`, the API secret appended,
 * SHA-1 as hex. `file`, `api_key`, `resource_type` and `cloud_name` are never part of it.
 */
export function signParams(params: Record<string, Param>, apiSecret: string): string {
  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha1")
    .update(toSign + apiSecret)
    .digest("hex");
}

const uploadUrl = (cfg: CloudinaryConfig) => `https://api.cloudinary.com/v1_1/${cfg.cloudName}/auto/upload`;

export type SignedUpload = {
  uploadUrl: string;
  apiKey: string;
  /** Form fields the browser sends along with `file`, `api_key` and `signature`. */
  fields: Record<string, string>;
  signature: string;
};

/**
 * Everything the browser needs to upload one file straight to Cloudinary, restricted by the signature to this
 * folder and these formats: changing either invalidates it. Each file keeps its name plus a random suffix.
 */
export function signUpload(
  cfg: CloudinaryConfig,
  opts: { folder: string; formats: readonly string[]; now?: Date },
): SignedUpload {
  const params = {
    allowed_formats: opts.formats.join(","),
    folder: opts.folder,
    timestamp: Math.floor((opts.now ?? new Date()).getTime() / 1000),
    unique_filename: true,
    use_filename: true,
  };
  return {
    uploadUrl: uploadUrl(cfg),
    apiKey: cfg.apiKey,
    signature: signParams(params, cfg.apiSecret),
    fields: Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
  };
}

/** Server-side upload of bytes we fetched ourselves (a project website's picture). Returns the secure URL. */
export async function uploadBytes(
  cfg: CloudinaryConfig,
  bytes: Uint8Array,
  contentType: string,
  opts: { folder: string; publicId: string; now?: Date },
): Promise<string> {
  const params = {
    folder: opts.folder,
    overwrite: true,
    public_id: opts.publicId,
    timestamp: Math.floor((opts.now ?? new Date()).getTime() / 1000),
  };
  const form = new FormData();
  for (const [k, v] of Object.entries(params)) form.set(k, String(v));
  form.set("api_key", cfg.apiKey);
  form.set("signature", signParams(params, cfg.apiSecret));
  form.set("file", new Blob([bytes as BlobPart], { type: contentType }), opts.publicId);
  const res = await fetch(uploadUrl(cfg), { method: "POST", body: form });
  const body = (await res.json().catch(() => null)) as { secure_url?: string; error?: { message?: string } } | null;
  if (!res.ok || !body?.secure_url)
    throw new Error(`Cloudinary refused the upload: ${body?.error?.message ?? res.status}`);
  return body.secure_url;
}
