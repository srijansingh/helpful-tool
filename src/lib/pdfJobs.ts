import { create } from "zustand";
const jobs = new Set<() => void>();
const cleanup = new Set<() => void>();
export const usePdfJobState = create<{ count: number }>(() => ({ count: 0 }));
export function registerPdfJob(cancel: () => void) {
  jobs.add(cancel);
  usePdfJobState.setState({ count: jobs.size });
  return () => {
    jobs.delete(cancel);
    usePdfJobState.setState({ count: jobs.size });
  };
}
export function registerPdfCleanup(fn: () => void) {
  cleanup.add(fn);
}
export function cancelPdfJobs() {
  for (const cancel of [...jobs]) cancel();
}
export function leavePdfWorkspace() {
  cancelPdfJobs();
  for (const fn of cleanup) fn();
}
export function runPdfJob<T>(
  operation: string,
  args: unknown[],
  signal?: AbortSignal,
  foreground = true,
): Promise<T> {
  signal?.throwIfAborted();
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("../workers/pdfProcessing.worker.ts", import.meta.url),
      { type: "module" },
    );
    let settled = false;
    let unregister = () => {};
    const finish = () => {
      if (settled) return false;
      settled = true;
      worker.terminate();
      signal?.removeEventListener("abort", cancel);
      unregister();
      return true;
    };
    const cancel = () => {
      if (finish())
        reject(
          new DOMException(
            "Processing cancelled. Your original and settings are unchanged.",
            "AbortError",
          ),
        );
    };
    if (foreground) unregister = registerPdfJob(cancel);
    signal?.addEventListener("abort", cancel, { once: true });
    worker.onmessage = (e) => {
      if (!finish()) return;
      if (e.data.error) reject(new Error(e.data.error));
      else resolve(e.data.result);
    };
    worker.onerror = () => {
      if (finish())
        reject(
          new Error(
            "The PDF processor could not start. Reopen online once, then try again.",
          ),
        );
    };
    worker.postMessage({ operation, args });
  });
}
