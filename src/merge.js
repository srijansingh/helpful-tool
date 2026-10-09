import { PDFDocument } from "../vendor/pdf-lib.esm.min.js";

// Merges PDF files in the given order into one PDF. Everything runs
// in-browser via pdf-lib — no file is uploaded anywhere.
export async function mergePdfs(files) {
  const merged = await PDFDocument.create();
  for (const file of files) {
    const bytes = await file.arrayBuffer();
    const src = await PDFDocument.load(bytes);
    const pages = await merged.copyPages(src, src.getPageIndices());
    pages.forEach((p) => merged.addPage(p));
  }
  return merged.save();
}
