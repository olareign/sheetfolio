import { NextResponse } from "next/server";
import { z } from "zod";
import { UPLOAD_RULES } from "@/content/uploads";
import { getUserRecord } from "@/lib/accounts";
import { auth } from "@/lib/auth";
import { signUpload } from "@/lib/cloudinary";
import { env } from "@/lib/env";

const Payload = z.object({
  /** `{slug}/{folder}/{file-name}`, built by `uploadPath`. */
  pathname: z.string().min(3).max(200),
  kind: z.enum(["image", "document"]),
});

const FORMATS = { image: ["jpg", "png", "webp"], document: ["jpg", "png", "webp", "pdf"] } as const;

/**
 * Signs a browser → Cloudinary upload. Only a signed-in owner gets a signature, and only for a folder under their
 * own slug, so a file can't be written into someone else's folder. The file itself never passes through here.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const session = await auth();
  const email = session?.user?.email;
  const account = email ? await getUserRecord(email) : null;
  if (!account) return NextResponse.json({ error: "Sign in again to upload files." }, { status: 401 });

  const cloudinary = env().CLOUDINARY_URL;
  if (!cloudinary) {
    return NextResponse.json(
      { error: "Uploads are not set up on this server yet (CLOUDINARY_URL is missing)." },
      { status: 503 },
    );
  }

  const parsed = Payload.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const { pathname, kind } = parsed.data;

  const parts = pathname.split("/");
  const folderParts = parts.slice(0, -1);
  const safe = folderParts.every((p) => /^[a-z0-9-]+$/.test(p));
  if (parts[0] !== account.slug || folderParts.length < 2 || !safe) {
    return NextResponse.json({ error: "Upload path is outside your site." }, { status: 403 });
  }

  const signed = signUpload(cloudinary, { folder: `sheetfolio/${folderParts.join("/")}`, formats: FORMATS[kind] });
  return NextResponse.json({ ...signed, maxBytes: UPLOAD_RULES[kind].maxBytes });
}
