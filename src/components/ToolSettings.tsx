import { useRef, useState, type ReactNode } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { useDialogFocus } from "../hooks/useDialogFocus";
export function ToolSettings({
  children,
  enabled,
  title = "Settings",
}: {
  children: ReactNode;
  enabled: boolean;
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDivElement>(null);
  useDialogFocus(dialog, open, () => setOpen(false));
  return (
    <div className="tool-settings">
      {enabled && (
        <button
          className="btn-secondary settings-trigger"
          onClick={() => setOpen(true)}
        >
          <SlidersHorizontal size={18} aria-hidden="true" />
          {title}
        </button>
      )}
      {open && (
        <div
          className="settings-backdrop"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}
      <div
        ref={dialog}
        className={`settings-content ${open ? "is-open" : ""} ${!enabled ? "is-empty" : ""}`}
        role={open ? "dialog" : undefined}
        aria-modal={open ? true : undefined}
        aria-label={title}
      >
        <div className="settings-heading">
          <h2>{title}</h2>
          <button
            className="btn-secondary settings-close"
            aria-label="Close settings"
            onClick={() => setOpen(false)}
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
