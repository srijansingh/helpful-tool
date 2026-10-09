import { useEffect } from "react";
import { Undo2, X } from "lucide-react";
import { useToastStore } from "../store/useToastStore";

function ToastItem({ id, message, actionLabel, onAction, duration }: ReturnType<typeof useToastStore.getState>["toasts"][number]) {
  const dismiss = useToastStore((s) => s.dismiss);

  useEffect(() => {
    const timer = setTimeout(() => dismiss(id), duration);
    return () => clearTimeout(timer);
  }, [id, duration, dismiss]);

  return (
    <div
      role="status"
      className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 shadow-lg"
    >
      <p className="text-sm text-fg">{message}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={() => {
            onAction();
            dismiss(id);
          }}
          className="flex shrink-0 items-center gap-1 font-display text-sm font-bold text-accent focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />
          {actionLabel}
        </button>
      )}
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => dismiss(id)}
        className="shrink-0 text-muted hover:text-fg focus-visible:ring-2 focus-visible:ring-accent"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// Fixed above the mobile bottom tab bar, bottom-right on desktop — stacks
// multiple toasts newest-last, each with its own auto-dismiss timer.
export function ToastViewport() {
  const toasts = useToastStore((s) => s.toasts);
  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-16 z-40 flex flex-col items-center gap-2 px-4 sm:bottom-4 sm:left-auto sm:right-4 sm:items-end">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto w-full max-w-sm">
          <ToastItem {...t} />
        </div>
      ))}
    </div>
  );
}
