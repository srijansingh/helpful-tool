import { pdfRenderingOptions } from "../lib/pdf/renderOptions";
import { friendlyError } from "../lib/importFiles";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  getDocument,
  GlobalWorkerOptions,
  type PDFDocumentProxy,
} from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
GlobalWorkerOptions.workerSrc = workerSrc;
export function PdfReader({
  bytes,
  allowCopy = true,
  page = 1,
  onPage,
  overlay,
  onSize,
}: {
  bytes: Uint8Array;
  allowCopy?: boolean;
  page?: number;
  onPage?: (page: number) => void;
  overlay?: ReactNode;
  onSize?: (size: { width: number; height: number }) => void;
}) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [localPage, setLocalPage] = useState(page);
  const [zoom, setZoom] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [text, setText] = useState("");
  const canvas = useRef<HTMLCanvasElement>(null);
  const sizeCallback = useRef(onSize);
  sizeCallback.current = onSize;
  const number = onPage ? page : localPage;
  useEffect(() => {
    setError("");
    setPdf(null);
    setLocalPage(1);
    const task = getDocument({ ...pdfRenderingOptions, data: bytes.slice() });
    let active = true;
    task.promise
      .then((p) => {
        if (active) setPdf(p);
      })
      .catch((e) => {
        if (active) setError(friendlyError(e));
      });
    return () => {
      active = false;
      void task.destroy();
    };
  }, [bytes]);
  useEffect(() => {
    if (!pdf || !canvas.current) return;
    let active = true;
    let renderTask:
      | ReturnType<Awaited<ReturnType<PDFDocumentProxy["getPage"]>>["render"]>
      | undefined;
    setLoading(true);
    (async () => {
      try {
        const p = await pdf.getPage(Math.min(number, pdf.numPages));
        if (!active) return;
        const view = p.getViewport({ scale: 1 });
        sizeCallback.current?.({ width: view.width, height: view.height });
        const scale =
          Math.min(2, 1600 / Math.max(view.width, view.height)) * zoom;
        const viewport = p.getViewport({ scale });
        const c = canvas.current!;
        c.width = viewport.width;
        c.height = viewport.height;
        renderTask = p.render({
          canvas: c,
          canvasContext: c.getContext("2d")!,
          viewport,
        });
        await renderTask.promise;
        const content = allowCopy ? await p.getTextContent() : { items: [] };
        if (active)
          setText(
            content.items
              .map((item) => ("str" in item ? item.str : ""))
              .join(" "),
          );
      } catch (e) {
        if (active) setError(friendlyError(e));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
      renderTask?.cancel();
    };
  }, [pdf, number, zoom, allowCopy]);
  const go = (n: number) => {
    const value = Math.max(1, Math.min(pdf?.numPages || 1, n));
    if (onPage) onPage(value);
    else setLocalPage(value);
  };
  const search = async () => {
    if (!allowCopy || !pdf || !query.trim()) return;
    setLoading(true);
    try {
      for (let offset = 1; offset <= pdf.numPages; offset++) {
        const n = ((number + offset - 1) % pdf.numPages) + 1;
        const p = await pdf.getPage(n);
        const t = (await p.getTextContent()).items
          .map((i) => ("str" in i ? i.str : ""))
          .join(" ");
        if (t.toLowerCase().includes(query.toLowerCase())) {
          go(n);
          setError("");
          return;
        }
      }
      setError("No matching text. Scanned pages need OCR first.");
    } catch {
      setError("Search could not finish. Try again or reopen the document.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="reader">
      <div className="reader-controls">
        <button
          className="btn-secondary"
          disabled={!pdf || number <= 1}
          onClick={() => go(number - 1)}
          aria-label="Previous page"
        >
          ←
        </button>
        <label>
          Page{" "}
          <input
            aria-label="Page number"
            type="number"
            min="1"
            max={pdf?.numPages || 1}
            value={number}
            onChange={(e) => go(Number(e.target.value) || 1)}
          />
        </label>
        <span>of {pdf?.numPages || "…"}</span>
        <button
          className="btn-secondary"
          disabled={!pdf || number >= pdf.numPages}
          onClick={() => go(number + 1)}
          aria-label="Next page"
        >
          →
        </button>
        <select
          aria-label="Zoom"
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
        >
          <option value={1}>Fit width</option>
          <option value={1.5}>150%</option>
          <option value={2}>200%</option>
        </select>
      </div>
      <div className="reader-search">
        <input
          className="field"
          disabled={!allowCopy}
          aria-label="Find text in PDF"
          placeholder="Find text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void search();
          }}
        />
        <button
          className="btn-secondary"
          disabled={!allowCopy || !pdf || loading}
          onClick={() => void search()}
        >
          Find next
        </button>
      </div>
      {error && (
        <p role="alert" className="text-bad">
          {error}
        </p>
      )}
      {loading && <p role="status">Loading page…</p>}
      <div className="reader-scroll">
        <div className="reader-page" style={{ width: `${zoom * 100}%` }}>
          <canvas ref={canvas} aria-label={`PDF page ${number}`} />
          {overlay}
        </div>
      </div>
      <details className="mt-3">
        <summary>Selectable page text</summary>
        <p className="select-text whitespace-pre-wrap p-3">
          {allowCopy
            ? text || "No text layer on this page."
            : "This document restricts copying text."}
        </p>
      </details>
    </div>
  );
}
