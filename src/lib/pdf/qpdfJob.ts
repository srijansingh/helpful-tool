import type { QpdfAction } from "./qpdfOptions";
export async function qpdfJob(
  file: File,
  action: QpdfAction,
  password: string,
  signal: AbortSignal,
  onProgress: (text: string) => void,
): Promise<{ bytes: Uint8Array; warning: string }> {
  if (file.size > 50 * 1024 * 1024)
    throw new Error("Use a PDF smaller than 50 MB for these on-device tools.");
  signal.throwIfAborted();
  const bytes = new Uint8Array(await file.arrayBuffer());
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("../../workers/qpdf.worker.ts", import.meta.url),
      { type: "module" },
    );
    const finish = () => {
      worker.terminate();
      signal.removeEventListener("abort", cancel);
    };
    const cancel = () => {
      finish();
      reject(new Error("Cancelled. Original file is unchanged."));
    };
    signal.addEventListener("abort", cancel, { once: true });
    worker.onmessage = (e) => {
      if (e.data.stage) onProgress(e.data.stage);
      else if (e.data.error) {
        finish();
        reject(new Error(e.data.error));
      } else {
        finish();
        resolve({ bytes: e.data.bytes, warning: e.data.warning });
      }
    };
    worker.onerror = () => {
      finish();
      reject(
        new Error(
          "The local PDF engine could not start. Reopen the app online once, then try again.",
        ),
      );
    };
    worker.postMessage({ bytes, action, password }, [bytes.buffer]);
  });
}
