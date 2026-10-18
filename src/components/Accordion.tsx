import { CaretDown as ChevronDown } from "@phosphor-icons/react";
import { useId, useState, type ReactNode } from "react";
interface AccordionProps {
  summary: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  variant?: "flat" | "card";
  /** Controlled open state. When set, the accordion follows this value
   * instead of tracking its own (e.g. to force-reopen while a required
   * file is missing); the trigger can still toggle it via onOpenChange. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}
export function Accordion({
  summary,
  children,
  defaultOpen = false,
  variant = "flat",
  open: openProp,
  onOpenChange,
}: AccordionProps) {
  const [openState, setOpenState] = useState(defaultOpen);
  const open = openProp ?? openState;
  const id = useId();
  const toggle = () => {
    if (onOpenChange) onOpenChange(!open);
    if (openProp === undefined) setOpenState((o) => !o);
  };
  return (
    <div className="accordion" data-variant={variant}>
      <button
        type="button"
        className="accordion-trigger"
        aria-expanded={open}
        aria-controls={id}
        onClick={toggle}
      >
        <span>{summary}</span>
        <ChevronDown className="accordion-chevron" aria-hidden="true" />
      </button>
      <div className="accordion-panel" data-open={open}>
        <div className="accordion-panel-inner">
          <div id={id} className="accordion-panel-content" aria-hidden={!open}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
