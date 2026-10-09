import { useCallback, useEffect, useRef, useState } from "react";
import { get, set } from "idb-keyval";
import type { ScanPage } from "../store/useScanStore";

// Unlike useRecentActivity (metadata only, by design — persisting real
// file bytes there would contradict the PDF tools' "nothing is stored"
// pitch), this deliberately stores the actual scanned image bytes:
// persistence is the whole point of a document library, not a privacy
// compromise. Still entirely local — IndexedDB, never sent anywhere.
export interface ScanDocument {
  id: string;
  name: string;
  createdAt: number;
  pages: { dataUrl: string; filter: string }[];
}

const DB_KEY = "localpdf:scan-library";

export function useScanLibrary() {
  const [documents, setDocuments] = useState<ScanDocument[]>([]);
  const [loaded, setLoaded] = useState(false);
  // Kept in sync with `documents` so saveDocument/deleteDocument/
  // renameDocument (stable via useCallback's empty deps) always read the
  // latest list instead of a stale closure.
  const documentsRef = useRef<ScanDocument[]>([]);
  useEffect(() => {
    documentsRef.current = documents;
  }, [documents]);

  useEffect(() => {
    get<ScanDocument[]>(DB_KEY)
      .then((stored) => setDocuments(stored ?? []))
      .catch(() => setDocuments([]))
      .finally(() => setLoaded(true));
  }, []);

  // Returns a Promise that resolves only once the IndexedDB write has
  // actually landed. A caller that navigates to another page right after
  // calling this (e.g. to /scans to show the saved document) must await
  // it first — otherwise the next page's own useScanLibrary() mounts
  // fresh and can read stale data if its load races the still-pending
  // write from this one.
  const saveDocument = useCallback(async (name: string, pages: ScanPage[]) => {
    const doc: ScanDocument = {
      id: crypto.randomUUID(),
      name,
      createdAt: Date.now(),
      pages: pages.map((p) => ({ dataUrl: p.dataUrl, filter: p.filter })),
    };
    const next = [doc, ...documentsRef.current];
    await set(DB_KEY, next);
    setDocuments(next);
    return doc;
  }, []);

  const deleteDocument = useCallback(async (id: string) => {
    const next = documentsRef.current.filter((d) => d.id !== id);
    await set(DB_KEY, next);
    setDocuments(next);
  }, []);

  const renameDocument = useCallback(async (id: string, name: string) => {
    const next = documentsRef.current.map((d) => (d.id === id ? { ...d, name } : d));
    await set(DB_KEY, next);
    setDocuments(next);
  }, []);

  return { documents, loaded, saveDocument, deleteDocument, renameDocument };
}
