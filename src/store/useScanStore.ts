import { create } from "zustand";
import type { FilterType } from "../lib/scan/filters";

export interface ScanPage {
  id: string;
  warpedDataUrl: string; // perspective-corrected, unfiltered — the source of truth
  dataUrl: string; // warpedDataUrl with the chosen filter applied, used for thumbnails/export
  filter: FilterType;
}

interface ScanSessionState {
  pages: ScanPage[];
  addPage: (page: ScanPage) => void;
  updatePage: (id: string, patch: Partial<Pick<ScanPage, "dataUrl" | "filter">>) => void;
  removePage: (id: string) => void;
  insertPageAt: (index: number, page: ScanPage) => void;
  reorderPages: (pages: ScanPage[]) => void;
  clear: () => void;
}

// Lives outside the route tree like the other tool stores, so an
// in-progress scan session survives navigating to another tab and back —
// losing half-scanned pages to an accidental tab switch would be a much
// worse version of the exact bug this was built to fix elsewhere.
export const useScanStore = create<ScanSessionState>((set) => ({
  pages: [],
  addPage: (page) => set((s) => ({ pages: [...s.pages, page] })),
  updatePage: (id, patch) =>
    set((s) => ({ pages: s.pages.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
  removePage: (id) => set((s) => ({ pages: s.pages.filter((p) => p.id !== id) })),
  // The undo side of removePage — puts a page back at its original
  // position, used by the undo toast instead of confirming every removal.
  insertPageAt: (index, page) =>
    set((s) => {
      const next = [...s.pages];
      next.splice(Math.min(index, next.length), 0, page);
      return { pages: next };
    }),
  reorderPages: (pages) => set({ pages }),
  clear: () => set({ pages: [] }),
}));
