import { PDFDocument } from "pdf-lib";
import { imagesToPdf } from "./imagesToPdf";

// Merges PDF files in the given order into one PDF. Everything runs
// in-browser via pdf-lib — no file is uploaded anywhere.
export async function mergePdfs(files: File[]): Promise<Uint8Array> {
  if (
    !files.length ||
    files.length > 100 ||
    files.reduce((n, f) => n + f.size, 0) > 50 * 1024 * 1024
  )
    throw new Error(
      "Merge supports up to 100 files and 50 MB in total. Use smaller groups.",
    );
  const merged = await PDFDocument.create();
  for (const file of files) {
    const bytes = file.type.startsWith("image/")
      ? await imagesToPdf([file])
      : await file.arrayBuffer();
    const src = await PDFDocument.load(bytes);
    if (merged.getPageCount() + src.getPageCount() > 2000)
      throw new Error(
        "Combine at most 2,000 pages at a time. Use smaller groups.",
      );
    const pages = await merged.copyPages(src, src.getPageIndices());
    pages.forEach((p) => merged.addPage(p));
  }
  return merged.save();
}
