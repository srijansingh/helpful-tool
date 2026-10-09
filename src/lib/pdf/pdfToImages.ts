import { pdfRenderingOptions } from "./renderOptions";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
// The `?url` suffix tells Vite to emit this as a built asset and hand back
// its final URL — the standard way to wire pdf.js's worker up under Vite.
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { selectedPages } from "./pageRanges";
import type { NamedBytes } from "../zip";

GlobalWorkerOptions.workerSrc = workerSrc;

export interface RenderOptions {
  format?: "image/jpeg" | "image/png";
  quality?: number;
  scale?: number;
  maxPages?: number;
  ranges?: string;
  signal?: AbortSignal;
  onProgress?: (done: number, total: number) => void;
}

// Renders every page of a PDF to an image, entirely client-side via pdf.js.
export async function renderPdfToImages(
  file: File,
  {
    format = "image/jpeg",
    quality = 0.9,
    scale = 2,
    maxPages = 50,
    ranges = "",
    signal,
    onProgress,
  }: RenderOptions = {},
): Promise<NamedBytes[]> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdf = await getDocument({ ...pdfRenderingOptions, data: bytes })
    .promise;
  const ext = format === "image/png" ? "png" : "jpg";
  const results: NamedBytes[] = [];
  let totalBytes = 0;
  try {
    const pages = ranges.trim()
      ? selectedPages(ranges, pdf.numPages)
      : Array.from({ length: pdf.numPages }, (_, i) => i);
    if (pages.length > maxPages)
      throw new Error(
        `Choose at most ${maxPages} pages at a time for this export.`,
      );
    for (const index of pages) {
      signal?.throwIfAborted();
      const i = index + 1;
      const page = await pdf.getPage(i);
      const base = page.getViewport({ scale: 1 });
      const safeScale = Math.min(
        scale,
        4000 / Math.max(base.width, base.height),
        Math.sqrt(12000000 / (base.width * base.height)),
      );
      const viewport = page.getViewport({ scale: safeScale });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d")!;
      const task = page.render({ canvasContext: ctx, viewport, canvas });
      const cancel = () => task.cancel();
      signal?.addEventListener("abort", cancel, { once: true });
      try {
        await task.promise;
      } finally {
        signal?.removeEventListener("abort", cancel);
      }
      signal?.throwIfAborted();
      const blob: Blob = await new Promise((resolve, reject) =>
        canvas.toBlob(
          (b) =>
            b
              ? resolve(b)
              : reject(
                  new Error(
                    "Image export failed. Reduce the resolution and try again.",
                  ),
                ),
          format,
          quality,
        ),
      );
      totalBytes += blob.size;
      if (totalBytes > 50 * 1024 * 1024) {
        canvas.width = canvas.height = 0;
        throw new Error(
          "The images exceed 50 MB. Choose fewer pages or reduce the resolution.",
        );
      }
      if (blob.type !== format)
        throw new Error(
          "This browser does not support the selected image format. Choose PNG or JPEG.",
        );
      page.cleanup();
      results.push({
        name: `page-${i}.${ext}`,
        bytes: new Uint8Array(await blob.arrayBuffer()),
      });
      canvas.width = canvas.height = 0;
      page.cleanup();
      onProgress?.(results.length, pages.length);
    }
    return results;
  } finally {
    await pdf.destroy();
  }
}
