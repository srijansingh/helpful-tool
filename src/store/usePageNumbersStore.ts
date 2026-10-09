import { create } from "zustand";
import type { PageNumberPosition, PageNumberFormat } from "../lib/pdf/pageNumbers";

interface CurrentPdf {
  bytes: ArrayBuffer;
  pageCount: number;
  name: string;
  size: number;
}

interface PageNumbersState {
  current: CurrentPdf | null;
  thumb: string | null;
  position: PageNumberPosition;
  format: PageNumberFormat;
  startAt: number;
  fontSize: number;
  outputName: string;
  setCurrent: (current: CurrentPdf | null) => void;
  setThumb: (thumb: string | null) => void;
  setPosition: (position: PageNumberPosition) => void;
  setFormat: (format: PageNumberFormat) => void;
  setStartAt: (startAt: number) => void;
  setFontSize: (fontSize: number) => void;
  setOutputName: (name: string) => void;
  reset: () => void;
}

const DEFAULTS = {
  position: "bottom-center" as PageNumberPosition,
  format: "number" as PageNumberFormat,
  startAt: 1,
  fontSize: 11,
};

export const usePageNumbersStore = create<PageNumbersState>((set) => ({
  current: null,
  thumb: null,
  ...DEFAULTS,
  outputName: "numbered",
  setCurrent: (current) => set({ current }),
  setThumb: (thumb) => set({ thumb }),
  setPosition: (position) => set({ position }),
  setFormat: (format) => set({ format }),
  setStartAt: (startAt) => set({ startAt }),
  setFontSize: (fontSize) => set({ fontSize }),
  setOutputName: (outputName) => set({ outputName }),
  reset: () => set({ current: null, thumb: null, ...DEFAULTS, outputName: "numbered" }),
}));
