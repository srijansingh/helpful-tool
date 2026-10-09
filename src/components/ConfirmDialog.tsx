import { useEffect, useRef } from "react";
import { useScrollLock } from "../hooks/useScrollLock";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// A real confirmation for genuinely destructive, hard-to-recover actions
// (deleting a saved document, clearing an entire in-progress session) —
// not for frequent, low-consequence ones like removing a single page
// from a draft, which get an undo toast instead so they don't collect
// confirmation fatigue. Defaults focus to Cancel, not Confirm, so a stray
// Enter press can't trigger the destructive action.
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  danger = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/60 p-4 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-5 shadow-2xl">
        <h2 id="confirm-dialog-title" className="font-display text-base font-bold text-fg">
          {title}
        </h2>
        <p id="confirm-dialog-description" className="mt-1.5 text-sm leading-relaxed text-muted">
          {description}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-border bg-surface-2 px-4 py-2 font-display text-sm font-semibold text-fg focus-visible:ring-2 focus-visible:ring-accent"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-xl px-4 py-2 font-display text-sm font-semibold focus-visible:ring-2 focus-visible:ring-accent ${
              danger ? "bg-bad text-white" : "bg-accent text-bg"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
