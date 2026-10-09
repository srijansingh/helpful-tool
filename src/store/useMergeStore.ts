import { create } from "zustand";

// Lives outside the route tree (a Zustand store is just a module-level
// singleton), so switching to another tool and back — or an accidental
// tab click — doesn't unmount-and-lose what was picked here, unlike plain
// component state would.
interface MergeState {
  files: File[];
  outputName: string;
  setFiles: (files: File[]) => void;
  addFiles: (files: File[]) => void;
  setOutputName: (name: string) => void;
  reset: () => void;
}

export const useMergeStore = create<MergeState>((set) => ({
  files: [],
  outputName: "merged",
  setFiles: (files) => set({ files }),
  addFiles: (newFiles) => set((s) => ({ files: [...s.files, ...newFiles] })),
  setOutputName: (outputName) => set({ outputName }),
  reset: () => set({ files: [], outputName: "merged" }),
}));
