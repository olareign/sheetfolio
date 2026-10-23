const MAX_BYTES = 3 * 1024 * 1024;
const TIMEOUT_MS = 3000;

/**
 * A square, face-centred JPEG version of a Cloudinary picture. The link-preview renderer reads only JPEG and PNG, and
 * people upload WebP too, so Cloudinary converts it. Any other host is returned unchanged and checked by `loadOgPhoto`.
 */
export function ogPhotoUrl(url: string, size = 480): string {
  try {
    const u = new URL(url);
    if (u.hostname === "res.cloudinary.com" && u.pathname.includes("/upload/")) {
      u.pathname = u.pathname.replace("/upload/", `/upload/c_fill,g_face,w_${size},h_${size},f_jpg,q_auto/`);
      return u.toString();
    }
  } catch {
    /* fall through */
  }
  return url;
}

/**
 * Downloads the picture and returns it as a data URI, or null when it can't be used (not reachable, too big, or not a
 * JPEG/PNG). The link-preview image then falls back to initials instead of failing to render at all.
 */
export async function loadOgPhoto(url: string, fetchImpl: typeof fetch = fetch): Promise<string | null> {
  if (!url.startsWith("https://")) return null;
  try {
    const res = await fetchImpl(ogPhotoUrl(url), { signal: AbortSignal.timeout(TIMEOUT_MS) });
    const type = res.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
    if (!res.ok || (type !== "image/jpeg" && type !== "image/png")) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_BYTES) return null;
    return `data:${type};base64,${Buffer.from(bytes).toString("base64")}`;
  } catch {
    return null;
  }
}
