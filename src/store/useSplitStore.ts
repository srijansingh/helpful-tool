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
  range: string;
  outputName: string;
  setCurrent: (current: CurrentPdf | null) => void;
  setThumb: (thumb: string | null) => void;
  setRange: (range: string) => void;
  setOutputName: (name: string) => void;
  reset: () => void;
}

export const useSplitStore = create<SplitState>((set) => ({
  current: null,
  thumb: null,
  range: "",
  outputName: "pages",
  setCurrent: (current) => set({ current }),
  setThumb: (thumb) => set({ thumb }),
  setRange: (range) => set({ range }),
  setOutputName: (outputName) => set({ outputName }),
  reset: () => set({ current: null, thumb: null, range: "", outputName: "pages" }),
}));
