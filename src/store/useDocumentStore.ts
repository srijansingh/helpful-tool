import { create } from "zustand";
export interface DocumentResult {
  id: string;
  file: File;
}
interface DocumentState {
  current: File | null;
  result: DocumentResult | null;
  pending: { id: string; path: string; file: File } | null;
  setCurrent: (file: File) => void;
  publish: (file: File) => void;
  continueTo: (path: string, file: File) => void;
  clearPending: () => void;
  dismissResult: () => void;
}
export const useDocumentStore = create<DocumentState>((set) => ({
  current: null,
  result: null,
  pending: null,
  setCurrent: (current) => set({ current }),
  publish: (file) =>
    set((s) => ({
      current:
        file.type === "application/pdf" || file.type.startsWith("image/")
          ? file
          : s.current,
      result: { id: crypto.randomUUID(), file },
    })),
  continueTo: (path, file) =>
    set({
      current: file,
      pending: { id: crypto.randomUUID(), path, file },
      result: null,
    }),
  clearPending: () => set({ pending: null }),
  dismissResult: () => set({ result: null }),
}));
