import { create } from "zustand";

interface ImagesToPdfState {
  files: File[];
  outputName: string;
  setFiles: (files: File[]) => void;
  addFiles: (files: File[]) => void;
  setOutputName: (name: string) => void;
  reset: () => void;
}

export const useImagesToPdfStore = create<ImagesToPdfState>((set) => ({
  files: [],
  outputName: "images",
  setFiles: (files) => set({ files }),
  addFiles: (newFiles) => set((s) => ({ files: [...s.files, ...newFiles] })),
  setOutputName: (outputName) => set({ outputName }),
  reset: () => set({ files: [], outputName: "images" }),
}));
