import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

GlobalWorkerOptions.workerSrc = workerSrc;

// Renders every page of a PDF to a JPEG data URL, for an on-screen
// vertical-scroll preview — not for download, so a lower scale than
// renderPdfToImages is plenty.
export async function renderPdfPages(bytes: Uint8Array, scale = 1.4): Promise<string[]> {
  const pdf = await getDocument({ data: bytes.slice() }).promise;
  const urls: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    urls.push(canvas.toDataURL("image/jpeg", 0.85));
  }
  return urls;
}
