import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

GlobalWorkerOptions.workerSrc = workerSrc;

// Renders every page of a PDF to a small JPEG data URL, in source order —
// used by Organize PDF to show one tile per page. Unlike renderPdfThumbnail
// (first page only, for file-list previews), this walks the whole
// document. pdf.js's viewport already bakes in each page's own /Rotate, so
// these thumbnails show pages in their current orientation before any
// further rotation the user applies in the editor.
export async function renderAllPageThumbnails(file: File, targetWidth = 160): Promise<string[]> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdf = await getDocument({ data: bytes }).promise;
  const urls: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = targetWidth / baseViewport.width;
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    urls.push(canvas.toDataURL("image/jpeg", 0.75));
  }
  return urls;
}
