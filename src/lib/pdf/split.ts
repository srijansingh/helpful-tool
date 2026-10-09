import { PDFDocument } from "pdf-lib";
import { parsePageRanges } from "./pageRanges";
import type { NamedBytes } from "../zip";

export interface PdfInfo {
  bytes: ArrayBuffer;
  pageCount: number;
}

export async function loadPdfInfo(file: File): Promise<PdfInfo> {
  const bytes = await file.arrayBuffer();
  const doc = await PDFDocument.load(bytes);
  return { bytes, pageCount: doc.getPageCount() };
}

// Extracts the pages named by a range string (e.g. "1-3,5") into one
// output PDF, in the order given.
export async function extractPages(bytes: ArrayBuffer, rangeStr: string, pageCount: number): Promise<Uint8Array> {
  const indices = parsePageRanges(rangeStr, pageCount);
  if (indices.length === 0) {
    throw new Error("No valid pages in that range.");
  }
  const src = await PDFDocument.load(bytes);
  const out = await PDFDocument.create();
  const pages = await out.copyPages(src, indices);
  pages.forEach((p) => out.addPage(p));
  return out.save();
}

// Splits every page of the source PDF into its own single-page PDF.
export async function splitEveryPage(bytes: ArrayBuffer, pageCount: number): Promise<NamedBytes[]> {
  const src = await PDFDocument.load(bytes);
  const results: NamedBytes[] = [];
  for (let i = 0; i < pageCount; i++) {
    const out = await PDFDocument.create();
    const [page] = await out.copyPages(src, [i]);
    out.addPage(page);
    results.push({ name: `page-${i + 1}.pdf`, bytes: await out.save() });
  }
  return results;
}
