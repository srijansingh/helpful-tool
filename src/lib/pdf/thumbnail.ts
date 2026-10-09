import { pdfRenderingOptions } from "./renderOptions";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
GlobalWorkerOptions.workerSrc = workerSrc;
export async function renderPdfThumbnail(
  file: File,
  targetWidth = 160,
): Promise<string> {
  if (file.type.startsWith("image/")) {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    try {
      const scale = Math.min(
        1,
        targetWidth / bitmap.width,
        240 / bitmap.height,
      );
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      canvas
        .getContext("2d")!
        .drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/jpeg", 0.75);
    } finally {
      bitmap.close();
      canvas.width = canvas.height = 0;
    }
  }
  const task = getDocument({
    ...pdfRenderingOptions,
    data: new Uint8Array(await file.arrayBuffer()),
  });
  const canvas = document.createElement("canvas");
  try {
    const pdf = await task.promise;
    const page = await pdf.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({
      scale: Math.min(targetWidth / base.width, 240 / base.height),
    });
    canvas.width = Math.max(1, Math.ceil(viewport.width));
    canvas.height = Math.max(1, Math.ceil(viewport.height));
    await page.render({
      canvasContext: canvas.getContext("2d")!,
      viewport,
      canvas,
    }).promise;
    const url = canvas.toDataURL("image/jpeg", 0.75);
    page.cleanup();
    return url;
  } finally {
    canvas.width = canvas.height = 0;
    await task.destroy();
  }
}
