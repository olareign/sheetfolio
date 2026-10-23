import * as pdfjsWorker from "pdfjs-dist/legacy/build/pdf.worker.mjs";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

// pdf.js looks for its worker here before trying to load a worker file by path, which a bundled server cannot do.
(globalThis as { pdfjsWorker?: unknown }).pdfjsWorker ??= pdfjsWorker;

export class PdfReadError extends Error {
  constructor(readonly reason: "NOT_PDF" | "ENCRYPTED" | "EMPTY" | "UNREADABLE") {
    super(reason);
    this.name = "PdfReadError";
  }
}

/** Largest PDF we read, and the most pages: a CV is a few pages, so anything bigger is not one. */
export const MAX_PDF_BYTES = 4 * 1024 * 1024;
const MAX_PAGES = 8;

type Piece = { text: string; x: number; y: number; end: number };

/**
 * The text of a PDF as lines, top to bottom. pdf.js hands back loose pieces of text with positions, so lines are
 * rebuilt by grouping pieces that sit at the same height. A wide gap inside a line (a right-aligned date, a second
 * column) is kept as two spaces, which the parser reads as a separator.
 */
export async function pdfLines(bytes: Uint8Array): Promise<string[]> {
  if (bytes.byteLength < 5 || String.fromCharCode(...bytes.subarray(0, 5)) !== "%PDF-")
    throw new PdfReadError("NOT_PDF");

  const task = getDocument({ data: bytes.slice(), verbosity: 0 });
  let doc;
  try {
    doc = await task.promise;
  } catch (err) {
    await task.destroy();
    throw new PdfReadError(err instanceof Error && err.name === "PasswordException" ? "ENCRYPTED" : "UNREADABLE");
  }

  try {
    const lines: string[] = [];
    for (let n = 1; n <= Math.min(doc.numPages, MAX_PAGES); n += 1) {
      const content = await (await doc.getPage(n)).getTextContent();
      const pieces: Piece[] = [];
      for (const item of content.items) {
        if (!("str" in item) || item.str.trim() === "") continue;
        const [, , , , x = 0, y = 0] = item.transform as number[];
        pieces.push({ text: item.str, x, y, end: x + item.width });
      }
      lines.push(...group(pieces));
    }
    if (lines.length === 0) throw new PdfReadError("EMPTY"); // a scanned CV is only pictures
    return lines;
  } finally {
    await task.destroy();
  }
}

/** Pieces at (nearly) the same height are one line; lines run top to bottom, pieces left to right. */
function group(pieces: Piece[]): string[] {
  const rows: Piece[][] = [];
  for (const p of [...pieces].sort((a, b) => b.y - a.y || a.x - b.x)) {
    const row = rows.find((r) => Math.abs(r[0]!.y - p.y) <= 3);
    if (row) row.push(p);
    else rows.push([p]);
  }
  return rows
    .sort((a, b) => b[0]!.y - a[0]!.y)
    .map((row) => {
      row.sort((a, b) => a.x - b.x);
      let line = "";
      let end = -Infinity;
      for (const p of row) {
        const gap = p.x - end;
        if (line === "") line = p.text;
        else if (gap > 14) line += `  ${p.text}`;
        else if (gap > 0.6 && !/\s$/.test(line) && !/^\s/.test(p.text)) line += ` ${p.text}`;
        else line += p.text;
        end = p.end;
      }
      return line.replace(/[ \t]+$/g, "").trim();
    })
    .filter(Boolean);
}
