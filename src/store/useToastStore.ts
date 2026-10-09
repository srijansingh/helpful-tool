import { create } from "zustand";

export interface Toast {
  id: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  duration: number;
}

interface ToastState {
  toasts: Toast[];
  push: (toast: { message: string; actionLabel?: string; onAction?: () => void; duration?: number }) => void;
  dismiss: (id: string) => void;
}

// A small global toast queue — used for undo-able, low-consequence
// actions (removing one page from a draft) instead of a blocking confirm
// dialog, which would be friction on something people do often. Rare,
// hard-to-recover actions (deleting a saved document) use ConfirmDialog
// instead; this is for the other kind.
export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: ({ message, actionLabel, onAction, duration = 5000 }) =>
    set((s) => ({
      toasts: [...s.toasts, { id: crypto.randomUUID(), message, actionLabel, onAction, duration }],
    })),
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
