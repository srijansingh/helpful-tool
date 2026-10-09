import { ShieldCheck } from "lucide-react";

// A persistent, always-visible trust signal — not buried in a footer. The
// whole pitch of this tool is "nothing leaves your device," so that claim
// stays in view, not just stated once and forgotten.
export function TrustBadge() {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-good/30 bg-good/10 px-3 py-1.5 font-display text-xs font-semibold text-good">
      <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
      100% on-device — files never uploaded
    </div>
  );
}
