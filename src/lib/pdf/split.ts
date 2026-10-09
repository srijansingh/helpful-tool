import { PDFDocument } from "pdf-lib";
import { selectedPages } from "./pageRanges.ts";
import type { NamedBytes } from "../zip";

export interface PdfInfo {
  bytes: ArrayBuffer;
  pageCount: number;
}

export async function loadPdfInfo(file: File): Promise<PdfInfo> {
  const bytes = await file.arrayBuffer();
  const doc = await PDFDocument.load(bytes);
  if (!doc.getPageCount()) throw new Error("This PDF has no pages.");
  return { bytes, pageCount: doc.getPageCount() };
}

// Extracts the pages named by a range string (e.g. "1-3,5") into one
// output PDF, in the order given.
export async function extractPages(
  bytes: ArrayBuffer,
  rangeStr: string,
  pageCount: number,
): Promise<Uint8Array> {
  if (!rangeStr.trim()) throw new Error("Select at least one page to extract.");
  const indices = selectedPages(rangeStr, pageCount);
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
export async function splitEveryPage(
  bytes: ArrayBuffer,
  pageCount: number,
): Promise<NamedBytes[]> {
  const src = await PDFDocument.load(bytes);
  if (pageCount > 500)
    throw new Error(
      "Split at most 500 pages into individual files at a time. Extract a smaller PDF first.",
    );
  let totalBytes = 0;
  const results: NamedBytes[] = [];
  for (let i = 0; i < pageCount; i++) {
    const out = await PDFDocument.create();
    const [page] = await out.copyPages(src, [i]);
    out.addPage(page);
    const output = await out.save();
    totalBytes += output.length;
    if (totalBytes > 50 * 1024 * 1024)
      throw new Error(
        "These individual PDFs exceed 50 MB. Extract a smaller PDF first.",
      );
    results.push({ name: `page-${i + 1}.pdf`, bytes: output });
  }
  return results;
}
