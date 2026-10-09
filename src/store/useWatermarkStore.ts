import { create } from "zustand";

interface CurrentPdf {
  bytes: ArrayBuffer;
  pageCount: number;
  name: string;
  size: number;
}

interface WatermarkState {
  current: CurrentPdf | null;
  thumb: string | null;
  text: string;
  opacity: number;
  fontSize: number;
  rotation: number;
  outputName: string;
  setCurrent: (current: CurrentPdf | null) => void;
  setThumb: (thumb: string | null) => void;
  setText: (text: string) => void;
  setOpacity: (opacity: number) => void;
  setFontSize: (fontSize: number) => void;
  setRotation: (rotation: number) => void;
  setOutputName: (name: string) => void;
  reset: () => void;
}

const DEFAULTS = { text: "CONFIDENTIAL", opacity: 0.3, fontSize: 48, rotation: 45 };

export const useWatermarkStore = create<WatermarkState>((set) => ({
  current: null,
  thumb: null,
  ...DEFAULTS,
  outputName: "watermarked",
  setCurrent: (current) => set({ current }),
  setThumb: (thumb) => set({ thumb }),
  setText: (text) => set({ text }),
  setOpacity: (opacity) => set({ opacity }),
  setFontSize: (fontSize) => set({ fontSize }),
  setRotation: (rotation) => set({ rotation }),
  setOutputName: (outputName) => set({ outputName }),
  reset: () => set({ current: null, thumb: null, ...DEFAULTS, outputName: "watermarked" }),
}));
