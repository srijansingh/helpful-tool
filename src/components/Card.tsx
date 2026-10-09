import type { ReactNode } from "react";

// The elevated "workspace panel" every tool's interactive area sits inside
// — what makes the page read as an application surface rather than a
// stack of elements loose on the page background.
export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-border bg-surface p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_6px_16px_-10px_rgba(0,0,0,0.3)] sm:p-6 ${className}`}
    >
      {children}
    </div>
  );
}
