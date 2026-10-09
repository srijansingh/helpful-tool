import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { renderPdfPages } from "../lib/pdf/renderPdfPages";

interface PdfPreviewProps {
  bytes: Uint8Array;
  onClose: () => void;
}

// A real page-by-page preview of the PDF that's about to be downloaded —
// rendered with the same pdf.js engine that'll open it anywhere else —
// scrollable vertically like an actual PDF viewer, not just the last
// thumbnail you happened to be looking at.
export function PdfPreview({ bytes, onClose }: PdfPreviewProps) {
  const [pages, setPages] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setPages(null);
    setError(null);
    renderPdfPages(bytes)
      .then((urls) => {
        if (!cancelled) setPages(urls);
      })
      .catch((e) => {
        if (!cancelled) setError((e as Error).message);
      });
    return () => {
      cancelled = true;
    };
  }, [bytes]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-bg/95 p-3 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="PDF preview"
    >
      <div className="flex w-full max-w-lg flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl sm:flex-none sm:h-[85vh]">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
          <h2 className="font-display text-sm font-bold">
            {pages ? `${pages.length} page${pages.length === 1 ? "" : "s"}` : "Preview"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            className="rounded-full p-1.5 text-muted hover:bg-surface-2 hover:text-fg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-surface-2 p-3">
          {error && <p className="p-4 text-sm text-bad">Couldn't render preview: {error}</p>}
          {!error && !pages && (
            <div className="flex flex-col gap-3">
              {[0, 1].map((i) => (
                <span key={i} className="aspect-[3/4] w-full animate-pulse rounded-lg bg-border" />
              ))}
            </div>
          )}
          {pages && (
            <div className="flex flex-col gap-3">
              {pages.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt={`Page ${i + 1}`}
                  className="w-full rounded-lg border border-border shadow-sm"
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
