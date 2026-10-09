// A small hand-drawn, stroke-based document glyph used across empty states.
// Kept as a single reusable component so the line weight/style stays
// consistent everywhere it appears.
export function DocumentIllustration({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect x="20" y="42" width="56" height="70" rx="6" className="fill-surface-2 stroke-accent" strokeWidth="2.5" />
      <rect x="34" y="28" width="56" height="70" rx="6" className="fill-surface stroke-accent" strokeWidth="2.5" />
      <path d="M46 46h32M46 58h32M46 70h20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-muted" />
      <circle cx="94" cy="88" r="16" className="fill-accent" />
      <path d="M87 88l5 5 10-10" stroke="var(--color-bg)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
