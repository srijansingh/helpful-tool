import { PageThumbnail } from "./PageThumbnail";

// A left-side page-navigation rail, the Acrobat convention for jumping
// around a multi-page document — hidden below desktop width (see
// .page-thumb-rail in index.css) since it's chrome for a wide document
// pane, not a mobile-editor feature.
export function PageThumbRail({
  file,
  pageCount,
  page,
  onSelect,
  className = "",
}: {
  file: File | null;
  pageCount: number;
  page: number;
  onSelect: (page: number) => void;
  className?: string;
}) {
  if (!file || pageCount <= 1) return null;
  return (
    <nav className={`page-thumb-rail ${className}`} aria-label="Pages">
      {Array.from({ length: pageCount }, (_, i) => (
        <button
          key={i}
          type="button"
          className={`page-thumb-rail-item${page === i + 1 ? " is-active" : ""}`}
          aria-current={page === i + 1 ? "true" : undefined}
          onClick={() => onSelect(i + 1)}
        >
          <PageThumbnail file={file} index={i} />
          <span className="page-thumb-rail-label">{i + 1}</span>
        </button>
      ))}
    </nav>
  );
}
