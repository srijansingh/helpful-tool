import { create } from "zustand";

interface PdfToImagesState {
  file: File | null;
  thumb: string | null;
  pageThumbs: string[]; // every page, so you see what you're about to export
  format: "image/jpeg" | "image/png";
  outputName: string;
  setFile: (file: File | null) => void;
  setThumb: (thumb: string | null) => void;
  setPageThumbs: (thumbs: string[]) => void;
  setFormat: (format: "image/jpeg" | "image/png") => void;
  setOutputName: (name: string) => void;
  reset: () => void;
}

export const usePdfToImagesStore = create<PdfToImagesState>((set) => ({
  file: null,
  thumb: null,
  pageThumbs: [],
  format: "image/jpeg",
  outputName: "images",
  setFile: (file) => set({ file }),
  setThumb: (thumb) => set({ thumb }),
  setPageThumbs: (pageThumbs) => set({ pageThumbs }),
  setFormat: (format) => set({ format }),
  setOutputName: (outputName) => set({ outputName }),
  reset: () => set({ file: null, thumb: null, pageThumbs: [], format: "image/jpeg", outputName: "images" }),
}));
