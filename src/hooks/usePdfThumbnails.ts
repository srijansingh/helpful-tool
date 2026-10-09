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
    void (async () => {
      for (const file of files) {
        if (cancelled) break;
        if (map.has(file)) continue;
        try {
          const url = await renderPdfThumbnail(file);
          if (!cancelled) {
            map.set(file, url);
            forceRender();
          }
        } catch {
          if (!cancelled) {
            map.set(file, "");
            forceRender();
          }
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [files]);

  return mapRef.current;
}
