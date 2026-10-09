import { useEffect, useReducer, useRef } from "react";
import { renderPdfThumbnail } from "../lib/pdf/thumbnail";

// Keyed by File object identity (stable across reorders since the same
// File instances persist in the list state) so thumbnails are rendered
// once per file, not re-rendered every time the list is reordered.
export function usePdfThumbnails(files: File[]): Map<File, string> {
  const mapRef = useRef<Map<File, string>>(new Map());
  const [, forceRender] = useReducer((x) => x + 1, 0);

  useEffect(() => {
    const map = mapRef.current;
    const currentSet = new Set(files);
    for (const existing of map.keys()) {
      if (!currentSet.has(existing)) map.delete(existing);
    }

    let cancelled = false;
    for (const file of files) {
      if (map.has(file)) continue;
      renderPdfThumbnail(file)
        .then((url) => {
          if (cancelled) return;
          map.set(file, url);
          forceRender();
        })
        .catch(() => {
          // A corrupt/unreadable PDF just shows the fallback icon instead
          // of a thumbnail — not worth surfacing as a page-level error
          // this early (the real merge/split action will fail loudly).
        });
    }
    return () => {
      cancelled = true;
    };
  }, [files]);

  return mapRef.current;
}
