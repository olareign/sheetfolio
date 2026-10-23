import { NextResponse } from "next/server";
import { getUserRecord } from "@/lib/accounts";
import { auth } from "@/lib/auth";
import { parseCv } from "@/lib/cv-import/parse";
import { MAX_PDF_BYTES, PdfReadError, pdfLines } from "@/lib/cv-import/pdf-text";
import { allowCvImport } from "@/lib/ratelimit";

const READ_ERRORS: Record<PdfReadError["reason"], string> = {
  NOT_PDF: "That file is not a PDF. Save your CV as a PDF and try again.",
  ENCRYPTED: "That PDF is password protected. Remove the password and try again.",
  EMPTY: "We could not find any text in that PDF. It may be a scan or photo of a CV; start from scratch instead.",
  UNREADABLE: "We could not read that PDF. Try saving it again from your word processor.",
};

/**
 * Reads an uploaded CV (PDF) and suggests what to put on the page. Nothing is saved here and the file is not kept: the
 * answer goes back to the browser, where the person checks it before choosing to add it (see applyCvImportAction).
 */
export async function POST(request: Request): Promise<NextResponse> {
  const session = await auth();
  const email = session?.user?.email;
  const account = email ? await getUserRecord(email) : null;
  if (!account) return NextResponse.json({ error: "Sign in again to import your CV." }, { status: 401 });
  if (!(await allowCvImport(account.slug))) {
    return NextResponse.json({ error: "Too many imports. Try again in an hour." }, { status: 429 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("cv");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a PDF to upload." }, { status: 400 });
  if (file.size === 0) return NextResponse.json({ error: READ_ERRORS.EMPTY }, { status: 400 });
  if (file.size > MAX_PDF_BYTES) {
    return NextResponse.json({ error: "That PDF is too large. Keep it under 4 MB." }, { status: 413 });
  }

  try {
    const lines = await pdfLines(new Uint8Array(await file.arrayBuffer()));
    return NextResponse.json({ cv: parseCv(lines) });
  } catch (err) {
    if (err instanceof PdfReadError) return NextResponse.json({ error: READ_ERRORS[err.reason] }, { status: 422 });
    console.error("[cv-import] unexpected failure:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Something went wrong reading that file. Try again." }, { status: 500 });
  }
}
