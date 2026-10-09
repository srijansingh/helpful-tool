export function AdSlot({ label = "Ad space" }: { label?: string }) {
  return (
    <div
      aria-hidden="true"
      className="my-6 flex min-h-[60px] items-center justify-center rounded-xl border border-dashed border-border font-display text-[11px] uppercase tracking-wide text-muted"
    >
      {label}
    </div>
  );
}
