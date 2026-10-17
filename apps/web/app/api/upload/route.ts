import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { UPLOAD_RULES } from "@/content/uploads";
import { getUserRecord } from "@/lib/accounts";
import { auth } from "@/lib/auth";
import { env } from "@/lib/env";

const Payload = z.object({ kind: z.enum(["image", "document"]) });

/**
 * Issues short-lived client-upload tokens for Vercel Blob (the file goes browser → Blob directly).
 * Only a signed-in engineer can get a token, only for paths under their own slug.
 */
type Ready = { ok: true; slug: string; token: string } | { ok: false; response: NextResponse };

/** Signed-in engineer + configured Blob store, or the error response to send. */
async function ready(): Promise<Ready> {
  const session = await auth();
  const email = session?.user?.email;
  const account = email ? await getUserRecord(email) : null;
  if (!account) {
    return { ok: false, response: NextResponse.json({ error: "Sign in again to upload files." }, { status: 401 }) };
  }
  const token = env().BLOB_READ_WRITE_TOKEN;
  if (!token) {
    const error = "Uploads are not configured on this server (BLOB_READ_WRITE_TOKEN is missing).";
    return { ok: false, response: NextResponse.json({ error }, { status: 503 }) };
  }
  return { ok: true, slug: account.slug, token };
}

/**
 * Status check. The Blob client hides token-route errors behind a generic message,
 * so the upload widget calls this after a failure to show the real reason.
 */
export async function GET(): Promise<NextResponse> {
  const r = await ready();
  return r.ok ? NextResponse.json({ ok: true }) : r.response;
}

export async function POST(request: Request): Promise<NextResponse> {
  const r = await ready();
  if (!r.ok) return r.response;
  const { slug, token } = r;

  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody; // shape is checked by handleUpload itself
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    const result = await handleUpload({
      token,
      request,
      body,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        if (!pathname.startsWith(`${slug}/`) || pathname.includes("..")) {
          throw new Error("Upload path is outside your site");
        }
        const { kind } = Payload.parse(JSON.parse(clientPayload ?? "{}"));
        const rule = UPLOAD_RULES[kind];
        return {
          allowedContentTypes: [...rule.contentTypes],
          maximumSizeInBytes: rule.maxBytes,
          addRandomSuffix: true,
          tokenPayload: null,
        };
      },
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[upload] token request refused:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Upload was refused. Check the file type and size." }, { status: 400 });
  }
}
