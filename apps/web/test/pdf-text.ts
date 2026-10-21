import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

/** The text on each page of a PDF, in the order a parser (and so an ATS) reads it. */
export async function pdfPages(pdf: Buffer): Promise<string[]> {
  const task = getDocument({ data: new Uint8Array(pdf), verbosity: 0 });
  const doc = await task.promise;
  try {
    const pages: string[] = [];
    for (let n = 1; n <= doc.numPages; n += 1) {
      const content = await (await doc.getPage(n)).getTextContent();
      const text = content.items.map((item) => ("str" in item ? item.str : "")).join(" ");
      pages.push(text.replace(/\s+/g, " ").trim());
    }
    return pages;
  } finally {
    await task.destroy();
  }
}
