import * as pdfjsLib from "../vendor/pdfjs/pdf.min.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "../vendor/pdfjs/pdf.worker.min.mjs",
  import.meta.url
).href;

// Renders every page of a PDF to an image, entirely client-side via pdf.js.
export async function renderPdfToImages(file, { format = "image/jpeg", quality = 0.9, scale = 2 } = {}) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
  const ext = format === "image/png" ? "png" : "jpg";
  const results = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    await page.render({ canvasContext: ctx, viewport }).promise;
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, format, quality));
    results.push({ name: `page-${i}.${ext}`, bytes: new Uint8Array(await blob.arrayBuffer()) });
  }
  return results;
}
