import { useEffect, useRef, useState } from "react";
import { FileStack } from "lucide-react";
import { PdfReader } from "./PdfReader";

interface LivePreviewPaneProps {
  // Builds the PDF to preview. Re-run (debounced) whenever `watch` changes.
  build: () => Promise<Uint8Array>;
  watch: unknown;
  emptyMessage: string;
  title?: string;
}

// A persistent, auto-updating preview of what the current files will
// produce — not a modal you have to ask for, a panel that's just always
// there on desktop (where there's width to spare), the way a real editor
// shows a live preview instead of making you build-then-check. Debounced
// so rapid file-list edits don't trigger a render per keystroke/drop.
export function LivePreviewPane({
  build,
  watch,
  emptyMessage,
  title = "Preview",
}: LivePreviewPaneProps) {
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generationRef = useRef(0);

  useEffect(() => {
    const generation = ++generationRef.current;
    setBytes(null);
    setLoading(true);
    setError(null);
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const bytes = await build();

        if (generationRef.current === generation) {
          setBytes(bytes);
        }
      } catch (e) {
        if (generationRef.current === generation) {
          setError((e as Error).message);
          setBytes(null);
        }
      } finally {
        if (generationRef.current === generation) setLoading(false);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, 500);
    return () => {
      clearTimeout(timer);
      ++generationRef.current;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watch]);

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-surface">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
        <h2 className="font-display text-sm font-bold text-fg">{title}</h2>
        {loading && (
          <span
            className="h-3 w-3 animate-pulse rounded-full bg-accent"
            aria-hidden="true"
          />
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3" aria-busy={loading}>
        {loading && (
          <p className="p-4 text-sm text-muted" role="status">
            Updating preview…
          </p>
        )}
        {!bytes && !loading && !error && (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-16 text-center">
            <FileStack className="h-8 w-8 text-muted" aria-hidden="true" />
            <p className="max-w-[16rem] text-sm text-muted">{emptyMessage}</p>
          </div>
        )}
        {error && (
          <p className="p-4 text-sm text-bad">
            Couldn't build preview: {error}
          </p>
        )}
        {bytes && <PdfReader bytes={bytes} />}
      </div>
    </div>
  );
}
