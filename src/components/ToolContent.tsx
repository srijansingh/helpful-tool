import { ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

// A short, scannable trust note — not a FAQ block. One line is enough to
// say "this runs on your device," said plainly instead of the
// upload-vs-local explainer this used to carry.
export function ToolContent({ children }: { children: ReactNode }) {
  return (
    <p className="mt-10 flex items-start gap-2 border-t border-border pt-6 text-sm leading-relaxed text-muted">
      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}
