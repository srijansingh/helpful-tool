import { ShieldCheck } from "lucide-react";

// A persistent, always-visible trust signal — not buried in a footer. The
// whole pitch of this tool is "nothing leaves your device," so that claim
// stays in view, not just stated once and forgotten. `compact` drops the
// label for tight spots (the mobile top bar) — the icon alone, paired with
// an accessible name, carries the signal without costing a line of text
// on every single screen.
export function TrustBadge({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-good/30 bg-good/10 text-good"
        role="img"
        aria-label="100% on-device — files never uploaded"
      >
        <ShieldCheck className="h-4 w-4" aria-hidden="true" />
      </span>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-good/30 bg-good/10 px-3 py-1.5 font-display text-xs font-semibold text-good">
      <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
      100% on-device — files never uploaded
    </div>
  );
}
