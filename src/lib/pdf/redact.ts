import { pdfRenderingOptions } from "./renderOptions";
import { PDFDocument } from "pdf-lib";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
GlobalWorkerOptions.workerSrc = workerSrc;
export interface RedactionBox {
  id: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}
export async function redactPdf(
  file: File,
  boxes: RedactionBox[],
  signal: AbortSignal,
  onProgress: (text: string) => void,
) {
  if (!boxes.length) throw new Error("Mark at least one area to redact.");
  const pdf = await getDocument({
    ...pdfRenderingOptions,
    data: new Uint8Array(await file.arrayBuffer()),
  }).promise;
  const out = await PDFDocument.create();
  out.setProducer("LocalPDF raster redaction");
  out.setCreator("LocalPDF");
  try {
    if (
      boxes.some(
        (b) =>
          b.page < 1 ||
          b.page > pdf.numPages ||
          !Number.isFinite(b.x + b.y + b.width + b.height) ||
          b.x < 0 ||
          b.y < 0 ||
          b.width <= 0 ||
          b.height <= 0 ||
          b.x + b.width > 1.001 ||
          b.y + b.height > 1.001,
      )
    )
      throw new Error(
        "Invalid redaction area. Mark a rectangle inside the visible page.",
      );
    for (let n = 1; n <= pdf.numPages; n++) {
      signal.throwIfAborted();
      onProgress(`Rebuilding page ${n} of ${pdf.numPages}…`);
      const source = await pdf.getPage(n);
      const base = source.getViewport({ scale: 1 });
      const scale = Math.min(2, 2600 / Math.max(base.width, base.height));
      const viewport = source.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const ctx = canvas.getContext("2d")!;
      const task = source.render({
        canvas,
        canvasContext: ctx,
        viewport,
        background: "#ffffff",
      });
      const cancel = () => task.cancel();
      signal.addEventListener("abort", cancel, { once: true });
      try {
        await task.promise;
      } finally {
        signal.removeEventListener("abort", cancel);
      }
      signal.throwIfAborted();
      ctx.fillStyle = "#000000";
      for (const box of boxes.filter((b) => b.page === n)) {
        const x = Math.max(0, Math.floor(box.x * canvas.width) - 1),
          y = Math.max(0, Math.floor(box.y * canvas.height) - 1);
        const right = Math.min(
            canvas.width,
            Math.ceil((box.x + box.width) * canvas.width) + 1,
          ),
          bottom = Math.min(
            canvas.height,
            Math.ceil((box.y + box.height) * canvas.height) + 1,
          );
        ctx.fillRect(x, y, right - x, bottom - y);
      }
      const png = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (b) =>
            b
              ? resolve(b)
              : reject(new Error("Could not encode redacted page.")),
          "image/png",
        ),
      );
      const image = await out.embedPng(await png.arrayBuffer());
      out.addPage([base.width, base.height]).drawImage(image, {
        x: 0,
        y: 0,
        width: base.width,
        height: base.height,
      });
      canvas.width = canvas.height = 0;
      source.cleanup();
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );
    }
    signal.throwIfAborted();
    return out.save();
  } finally {
    await pdf.destroy();
  }
}
