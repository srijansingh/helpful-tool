import { createWorker, type Worker } from "tesseract.js";
import { PDFDocument } from "pdf-lib";
import { renderPdfToImages } from "./pdf/pdfToImages";
export type OcrLanguage = "eng" | "eng+hin";
export { ocrTexts } from "./ocrText";
const root = () => new URL("/ocr/", location.href).href;
export async function prepareOcr(
  language: OcrLanguage,
  onProgress: (text: string) => void,
  signal?: AbortSignal,
) {
  const base = root();
  const paths = [
    "worker.min.js",
    "core/tesseract-core-lstm.wasm.js",
    "core/tesseract-core-simd-lstm.wasm.js",
    "core/tesseract-core-relaxedsimd-lstm.wasm.js",
    ...language.split("+").map((l) => `lang/${l}.traineddata.gz`),
  ];
  const cache = await caches.open("localpdf-ocr-assets");
  for (let i = 0; i < paths.length; i++) {
    signal?.throwIfAborted();
    const url = base + paths[i];
    onProgress(`Downloading OCR file ${i + 1} of ${paths.length}…`);
    if (!(await cache.match(url))) {
      const res = await fetch(url, { signal });
      if (!res.ok || res.headers.get("content-type")?.includes("text/html"))
        throw new Error(
          "OCR download failed. Check your connection and try again.",
        );
      await cache.put(url, res);
    }
  }
  signal?.throwIfAborted();
  localStorage.setItem(`localpdf:ocr:${language}`, "ready");
  onProgress(
    "OCR files saved for offline use in the installed app. Test once before travelling.",
  );
}
export async function recognizeFile(
  file: File,
  language: OcrLanguage,
  ranges: string,
  signal: AbortSignal,
  onProgress: (text: string) => void,
) {
  let worker: Worker | undefined;
  let rejectAbort: ((e: Error) => void) | undefined;
  const abort = () => {
    void worker?.terminate();
    rejectAbort?.(new Error("OCR cancelled. Original file is unchanged."));
  };
  const aborted = new Promise<never>((_, reject) => {
    rejectAbort = reject;
  });
  signal.addEventListener("abort", abort, { once: true });
  if (signal.aborted) abort();
  const job = (async () => {
    signal.throwIfAborted();
    const images =
      file.type === "application/pdf"
        ? await renderPdfToImages(file, {
            ranges,
            maxPages: 20,
            scale: 2,
            quality: 1,
            format: "image/png",
            signal,
            onProgress: (done, total) =>
              onProgress(`Preparing ${done} of ${total} pages…`),
          })
        : [
            {
              name: file.name,
              bytes: new Uint8Array(await file.arrayBuffer()),
            },
          ];
    signal.throwIfAborted();
    worker = await createWorker(language, 1, {
      workerPath: root() + "worker.min.js",
      corePath: root() + "core",
      langPath: root() + "lang",
      legacyCore: false,
      legacyLang: false,
      logger: (m) =>
        !signal.aborted &&
        onProgress(`${m.status} · ${Math.round(m.progress * 100)}%`),
    });
    if (signal.aborted) {
      await worker.terminate();
      signal.throwIfAborted();
    }
    const out = await PDFDocument.create();
    const texts: string[] = [];
    for (let i = 0; i < images.length; i++) {
      signal.throwIfAborted();
      onProgress(`Reading page ${i + 1} of ${images.length}…`);
      const result = await worker.recognize(
        new Blob([new Uint8Array(images[i].bytes)]),
        { pdfTitle: "LocalPDF searchable document", pdfTextOnly: false },
        { text: true, pdf: true },
      );
      if (!result.data.pdf)
        throw new Error("The OCR engine could not create a searchable page.");
      const src = await PDFDocument.load(new Uint8Array(result.data.pdf));
      const copied = await out.copyPages(src, src.getPageIndices());
      copied.forEach((p) => out.addPage(p));
      texts.push(result.data.text);
    }
    signal.throwIfAborted();
    return { bytes: await out.save(), text: texts.join("\n\n") };
  })();
  try {
    return await Promise.race([job, aborted]);
  } finally {
    signal.removeEventListener("abort", abort);
    await worker?.terminate();
  }
}
