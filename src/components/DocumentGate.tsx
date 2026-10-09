import { useEffect, useState, type ReactNode } from "react";
import { useLocation, Link } from "react-router-dom";
import { useDocumentStore } from "../store/useDocumentStore";
import { friendlyError } from "../lib/importFiles";
const automatic = new Set([
  "/edit",
  "/ocr",
  "/compress",
  "/redact",
  "/booklet",
]);
export function DocumentGate({ children }: { children: ReactNode }) {
  const path = useLocation().pathname;
  const file = useDocumentStore((s) => s.current);
  const [ready, setReady] = useState<{ file: File; path: string } | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const needs = file?.type === "application/pdf" && automatic.has(path);
  useEffect(() => {
    if (!needs || (ready?.file === file && ready.path === path)) return;
    const controller = new AbortController();
    setError("");
    void import("../lib/pdf/preflight")
      .then((m) => m.preparePdf(file!, path, controller.signal))
      .then((prepared) => {
        if (!controller.signal.aborted) {
          setReady({ file: prepared, path });
          useDocumentStore.getState().setCurrent(prepared);
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(friendlyError(e));
      });
    return () => controller.abort();
  }, [file, path, needs, retry, ready]);
  if (needs && (ready?.file !== file || ready.path !== path))
    return (
      <section>
        <h1 className="text-2xl font-bold">Open document</h1>
        {error ? (
          <>
            <p role="alert" className="mt-3 text-bad">
              {error}
            </p>
            <button className="btn mt-4" onClick={() => setRetry((n) => n + 1)}>
              Try again
            </button>
            <Link className="btn-secondary ml-3" to="/">
              Choose another file
            </Link>
          </>
        ) : (
          <p role="status" className="mt-3">
            Checking document before editing…
          </p>
        )}
      </section>
    );
  return children;
}
