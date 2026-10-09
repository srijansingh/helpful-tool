import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
// The `?url` suffix tells Vite to emit this as a built asset and hand back
// its final URL — the standard way to wire pdf.js's worker up under Vite.
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { NamedBytes } from "../zip";

GlobalWorkerOptions.workerSrc = workerSrc;

export interface RenderOptions {
  format?: "image/jpeg" | "image/png";
  quality?: number;
  scale?: number;
}

// Renders every page of a PDF to an image, entirely client-side via pdf.js.
export async function renderPdfToImages(
  file: File,
  { format = "image/jpeg", quality = 0.9, scale = 2 }: RenderOptions = {}
): Promise<NamedBytes[]> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdf = await getDocument({ data: bytes }).promise;
  const ext = format === "image/png" ? "png" : "jpg";
  const results: NamedBytes[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    const blob: Blob = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b!), format, quality)
    );
    results.push({ name: `page-${i}.${ext}`, bytes: new Uint8Array(await blob.arrayBuffer()) });
  }
  return results;
}
