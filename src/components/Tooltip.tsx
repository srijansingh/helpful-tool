import {
  cloneElement,
  isValidElement,
  useId,
  useRef,
  useState,
  type ReactElement,
} from "react";

interface TooltipProps {
  label: string;
  children: ReactElement;
  side?: "top" | "right" | "bottom" | "left";
}

// A real tooltip, not a native `title` attribute (inconsistent timing,
// unstyled, invisible to touch). Required wherever a control is icon-only —
// an unlabeled icon is a guess, not a control. Positioned with `fixed` +
// getBoundingClientRect rather than CSS-absolute so it never gets clipped
// by a scrolling ancestor (the sidebar, a bottom sheet, an overflow panel).
//
// The hover/focus handlers and ref attach directly to the child (via
// cloneElement) rather than to a wrapping span: a wrapper needs
// `display: contents` to avoid affecting layout, but a `contents` element
// has no box of its own, so it can't reliably participate in mouseenter/
// mouseleave hit-testing — that produced a real bug where a tooltip never
// closed once its trigger lost mouse-geometry tracking.
export function Tooltip({ label, children, side = "right" }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const elRef = useRef<HTMLElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const id = useId();

  const show = () => {
    timer.current = setTimeout(() => {
      const r = elRef.current?.getBoundingClientRect();
      if (!r) return;
      const gap = 8;
      const byside = {
        top: { x: r.left + r.width / 2, y: r.top - gap },
        bottom: { x: r.left + r.width / 2, y: r.bottom + gap },
        left: { x: r.left - gap, y: r.top + r.height / 2 },
        right: { x: r.right + gap, y: r.top + r.height / 2 },
      };
      setPos(byside[side]);
      setOpen(true);
    }, 400);
  };
  const hide = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setOpen(false);
  };

  if (!isValidElement(children)) return children;

  const child = children as ReactElement<Record<string, unknown>>;
  const trigger = cloneElement(child, {
    ref: (node: HTMLElement | null) => {
      elRef.current = node;
      const childRef = (child as unknown as { ref?: unknown }).ref;
      if (typeof childRef === "function") childRef(node);
    },
    "aria-describedby": open ? id : undefined,
    onMouseEnter: (e: MouseEvent) => {
      (child.props.onMouseEnter as ((e: MouseEvent) => void) | undefined)?.(e);
      show();
    },
    onMouseLeave: (e: MouseEvent) => {
      (child.props.onMouseLeave as ((e: MouseEvent) => void) | undefined)?.(e);
      hide();
    },
    onFocus: (e: FocusEvent) => {
      (child.props.onFocus as ((e: FocusEvent) => void) | undefined)?.(e);
      // Only keyboard-driven focus should open the tooltip. A click also
      // focuses the button natively; showing the tooltip for that too
      // means a click-triggered re-render (e.g. this sidebar's own
      // collapse toggle moving under a still-stationary cursor) can leave
      // a tooltip open with no hover behind it at all, since nothing ever
      // calls blur. :focus-visible is exactly the "got here via keyboard
      // or programmatic focus, not a pointer" signal.
      const target = e.target as HTMLElement;
      if (target.matches?.(":focus-visible")) show();
    },
    onBlur: (e: FocusEvent) => {
      (child.props.onBlur as ((e: FocusEvent) => void) | undefined)?.(e);
      hide();
    },
    // Also close on click: besides being the right behavior generally (a
    // tooltip shouldn't linger once you've acted on its trigger), this is
    // the one reliable fix for a real browser edge case — clicking a
    // trigger that itself changes layout (e.g. this sidebar's own collapse
    // toggle) can move the element out from under a still-stationary
    // cursor, and browsers don't fire mouseleave just because content
    // moved; only an actual pointer move does.
    onMouseDown: (e: MouseEvent) => {
      (child.props.onMouseDown as ((e: MouseEvent) => void) | undefined)?.(e);
      hide();
    },
  });

  return (
    <>
      {trigger}
      {open && pos && (
        <span
          role="tooltip"
          id={id}
          className="tooltip-bubble"
          style={{
            left: pos.x,
            top: pos.y,
            transform:
              side === "right"
                ? "translateY(-50%)"
                : side === "left"
                  ? "translate(-100%, -50%)"
                  : side === "top"
                    ? "translate(-50%, -100%)"
                    : "translateX(-50%)",
          }}
        >
          {label}
        </span>
      )}
    </>
  );
}
