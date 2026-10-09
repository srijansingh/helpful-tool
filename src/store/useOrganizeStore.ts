import { create } from "zustand";
import type { OrganizePageState } from "../lib/pdf/organize";

interface OrganizeState {
  fileName: string | null;
  bytes: ArrayBuffer | null;
  rotations: number[];
  thumbs: string[]; // source-order thumbnails, indexed by source page index
  pages: OrganizePageState[]; // current order/selection — the output order
  outputName: string;
  setLoaded: (fileName: string, bytes: ArrayBuffer, rotations: number[], thumbs: string[]) => void;
  setPages: (pages: OrganizePageState[]) => void;
  rotatePage: (id: string) => void;
  removePage: (id: string) => void;
  setOutputName: (name: string) => void;
  reset: () => void;
}

// Lives outside the route tree like the other tool stores, so switching
// tabs mid-edit doesn't lose your page order, deletions, or rotations.
export const useOrganizeStore = create<OrganizeState>((set) => ({
  fileName: null,
  bytes: null,
  rotations: [],
  thumbs: [],
  pages: [],
  outputName: "organized",
  setLoaded: (fileName, bytes, rotations, thumbs) =>
    set({
      fileName,
      bytes,
      rotations,
      thumbs,
      pages: rotations.map((_, index) => ({ id: crypto.randomUUID(), index, rotation: 0 })),
      outputName: `${fileName.replace(/\.pdf$/i, "")}-organized`,
    }),
  setPages: (pages) => set({ pages }),
  rotatePage: (id) =>
    set((s) => ({
      pages: s.pages.map((p) => (p.id === id ? { ...p, rotation: (p.rotation + 90) % 360 } : p)),
    })),
  removePage: (id) => set((s) => ({ pages: s.pages.filter((p) => p.id !== id) })),
  setOutputName: (outputName) => set({ outputName }),
  reset: () => set({ fileName: null, bytes: null, rotations: [], thumbs: [], pages: [], outputName: "organized" }),
}));
