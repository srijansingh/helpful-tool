import { useCallback, useEffect, useState } from "react";
import { get, set } from "idb-keyval";

// Only metadata is persisted — never file bytes. Storing the actual PDFs
// would bloat browser storage and cut against the point of this tool
// (nothing about your files is kept anywhere).
export interface ActivityEntry {
  id: string;
  tool: "merge" | "split" | "organize" | "images-to-pdf" | "pdf-to-images" | "watermark" | "page-numbers";
  label: string;
  timestamp: number;
}

const DB_KEY = "pdf-toolkit:recent-activity";
const MAX_ENTRIES = 8;

export function useRecentActivity() {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    get<ActivityEntry[]>(DB_KEY)
      .then((stored) => setEntries(stored ?? []))
      .catch(() => setEntries([]))
      .finally(() => setLoaded(true));
  }, []);

  const logActivity = useCallback((entry: Omit<ActivityEntry, "id" | "timestamp">) => {
    setEntries((prev) => {
      const next: ActivityEntry[] = [
        { ...entry, id: crypto.randomUUID(), timestamp: Date.now() },
        ...prev,
      ].slice(0, MAX_ENTRIES);
      set(DB_KEY, next).catch(() => {
        // Best-effort persistence — the in-memory list still updates even
        // if IndexedDB is unavailable (private browsing, quota, etc.).
      });
      return next;
    });
  }, []);

  return { entries, loaded, logActivity };
}
