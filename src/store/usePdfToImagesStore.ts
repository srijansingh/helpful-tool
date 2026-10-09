import { create } from "zustand";

interface PdfToImagesState {
  file: File | null;
  thumb: string | null;
  format: "image/jpeg" | "image/png";
  outputName: string;
  setFile: (file: File | null) => void;
  setThumb: (thumb: string | null) => void;
  setFormat: (format: "image/jpeg" | "image/png") => void;
  setOutputName: (name: string) => void;
  reset: () => void;
}

export const usePdfToImagesStore = create<PdfToImagesState>((set) => ({
  file: null,
  thumb: null,
  format: "image/jpeg",
  outputName: "images",
  setFile: (file) => set({ file }),
  setThumb: (thumb) => set({ thumb }),
  setFormat: (format) => set({ format }),
  setOutputName: (outputName) => set({ outputName }),
  reset: () => set({ file: null, thumb: null, format: "image/jpeg", outputName: "images" }),
}));
