import { useEffect } from "react";

// Locks background scroll while a modal/dialog is open — without it, a
// page tall enough to scroll keeps scrolling behind a "fixed" overlay,
// which reads as a broken nested-scroll bug (two things scrolling at
// once, the overlay feeling detached from the page). Restores whatever
// the body's overflow was before, not a hardcoded value, so this composes
// if something else ever sets it.
export function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [locked]);
}
