import { pdfRenderingOptions } from "./renderOptions";
import { registerPdfCleanup } from "../pdfJobs";
import {
  getDocument,
  GlobalWorkerOptions,
  type PDFDocumentProxy,
} from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
GlobalWorkerOptions.workerSrc = workerSrc;
const sources = new WeakMap<string[], File>();
export function thumbnailSource(thumbs: string[]) {
  return sources.get(thumbs);
}
// Return page slots immediately. Only visible tiles render images, never the entire document.
export async function renderAllPageThumbnails(file: File): Promise<string[]> {
  const task = getDocument({
    ...pdfRenderingOptions,
    data: new Uint8Array(await file.arrayBuffer()),
  });
  try {
    const pdf = await task.promise;
    const slots = Array<string>(pdf.numPages).fill("");
    sources.set(slots, file);
    return slots;
  } finally {
    await task.destroy();
  }
}
type Entry = {
  task: ReturnType<typeof getDocument>;
  pdf: Promise<PDFDocumentProxy>;
  images: Map<number, string>;
};
const documents = new Map<File, Entry>();
let queue = Promise.resolve();
export function clearPageThumbnailCache() {
  for (const entry of documents.values()) void entry.task.destroy();
  documents.clear();
}
registerPdfCleanup(clearPageThumbnailCache);
export function renderPageThumbnail(
  file: File,
  index: number,
  signal: AbortSignal,
): Promise<string> {
  const result = queue.then(async () => {
    signal.throwIfAborted();
    let entry = documents.get(file);
    if (!entry) {
      const task = getDocument({
        ...pdfRenderingOptions,
        data: new Uint8Array(await file.arrayBuffer()),
      });
      entry = { task, pdf: task.promise, images: new Map() };
      documents.set(file, entry);
      while (documents.size > 2) {
        const oldest = documents.keys().next().value!;
        void documents.get(oldest)!.task.destroy();
        documents.delete(oldest);
      }
    }
    if (entry.images.has(index)) return entry.images.get(index)!;
    const pdf = await entry.pdf;
    signal.throwIfAborted();
    const page = await pdf.getPage(index + 1);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({
      scale: Math.min(160 / base.width, 220 / base.height),
    });
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.ceil(viewport.width));
    canvas.height = Math.max(1, Math.ceil(viewport.height));
    const render = page.render({
      canvasContext: canvas.getContext("2d")!,
      viewport,
      canvas,
    });
    const cancel = () => render.cancel();
    signal.addEventListener("abort", cancel, { once: true });
    try {
      await render.promise;
      signal.throwIfAborted();
      const image = canvas.toDataURL("image/jpeg", 0.75);
      entry.images.set(index, image);
      if (entry.images.size > 72)
        entry.images.delete(entry.images.keys().next().value!);
      return image;
    } finally {
      signal.removeEventListener("abort", cancel);
      canvas.width = canvas.height = 0;
      page.cleanup();
    }
  });
  queue = result.then(
    () => {},
    () => {},
  );
  return result;
}
