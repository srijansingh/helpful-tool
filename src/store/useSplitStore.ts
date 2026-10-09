import { create } from "zustand";

interface CurrentPdf {
  bytes: ArrayBuffer;
  pageCount: number;
  name: string;
  size: number;
}

interface SplitState {
  current: CurrentPdf | null;
  thumb: string | null;
  pageThumbs: string[]; // every page, for the visual range picker
  range: string;
  outputName: string;
  setCurrent: (current: CurrentPdf | null) => void;
  setThumb: (thumb: string | null) => void;
  setPageThumbs: (thumbs: string[]) => void;
  setRange: (range: string) => void;
  setOutputName: (name: string) => void;
  reset: () => void;
}

export const useSplitStore = create<SplitState>((set) => ({
  current: null,
  thumb: null,
  pageThumbs: [],
  range: "",
  outputName: "pages",
  setCurrent: (current) => set({ current }),
  setThumb: (thumb) => set({ thumb }),
  setPageThumbs: (pageThumbs) => set({ pageThumbs }),
  setRange: (range) => set({ range }),
  setOutputName: (outputName) => set({ outputName }),
  reset: () => set({ current: null, thumb: null, pageThumbs: [], range: "", outputName: "pages" }),
}));
