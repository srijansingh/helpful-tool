import { useEffect, useState } from "react";
import { PDFDocument } from "pdf-lib";

// Cheap page-count lookup for the thumbnail rail — doesn't need the full
// pdf.js render pipeline, just pdf-lib's structural parse.
export function usePdfPageCount(bytes: Uint8Array | null): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let active = true;
    setCount(0);
    if (!bytes) return;
    void PDFDocument.load(bytes)
      .then((d) => {
        if (active) setCount(d.getPageCount());
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [bytes]);
  return count;
}
