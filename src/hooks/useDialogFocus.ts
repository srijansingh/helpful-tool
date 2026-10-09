import { useEffect, useRef, type RefObject } from "react";
const activeDialogs: HTMLElement[] = [];
let dialogOverflow: string | null = null;
export function useDialogFocus(
  ref: RefObject<HTMLElement | null>,
  open: boolean,
  close: () => void,
) {
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    if (!open) return;
    const el = ref.current;
    if (!el) return;
    if (!activeDialogs.length) dialogOverflow = document.body.style.overflow;
    activeDialogs.push(el);
    const previous = document.activeElement as HTMLElement | null;
    const focusable = () =>
      [
        ...el.querySelectorAll<HTMLElement>(
          'button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),summary,a[href],[tabindex]:not([tabindex="-1"])',
        ),
      ].filter(
        (x) =>
          x.getClientRects().length && x.tabIndex >= 0 && !x.closest("[inert]"),
      );
    const inert: [HTMLElement, boolean][] = [];
    let branch: HTMLElement = el;
    while (
      branch.parentElement &&
      branch.parentElement !== document.documentElement
    ) {
      for (const sibling of branch.parentElement.children) {
        if (
          sibling !== branch &&
          sibling instanceof HTMLElement &&
          !sibling.classList.contains("settings-backdrop")
        ) {
          inert.push([sibling, sibling.inert]);
          sibling.inert = true;
        }
      }
      branch = branch.parentElement;
    }
    const oldTabIndex = el.getAttribute("tabindex");
    el.tabIndex = -1;
    (focusable()[0] ?? el).focus();
    const handler = (e: KeyboardEvent) => {
      if (activeDialogs.at(-1) !== el) return;
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopImmediatePropagation();
        closeRef.current();
      }
      if (e.key === "Tab") {
        const items = focusable(),
          first = items[0],
          last = items.at(-1);
        if (!first) {
          e.preventDefault();
          el.focus();
        } else if (
          e.shiftKey &&
          (document.activeElement === first ||
            !el.contains(document.activeElement))
        ) {
          e.preventDefault();
          last?.focus();
        } else if (
          !e.shiftKey &&
          (document.activeElement === last ||
            !el.contains(document.activeElement))
        ) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      const index = activeDialogs.indexOf(el);
      if (index >= 0) activeDialogs.splice(index, 1);
      document.removeEventListener("keydown", handler);
      if (!activeDialogs.length) {
        document.body.style.overflow = dialogOverflow ?? "";
        dialogOverflow = null;
      } else document.body.style.overflow = "hidden";
      for (const [sibling, wasInert] of inert) sibling.inert = wasInert;
      if (oldTabIndex === null) el.removeAttribute("tabindex");
      else el.setAttribute("tabindex", oldTabIndex);
      if (previous?.isConnected) previous.focus();
    };
  }, [open, ref]);
}
