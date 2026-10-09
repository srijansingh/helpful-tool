import { useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { GripVertical, RotateCw, X } from "lucide-react";
import type { OrganizePageState } from "../../lib/pdf/organize";

interface PageGridProps {
  pages: OrganizePageState[];
  thumbs: string[]; // indexed by source page index
  onReorder: (pages: OrganizePageState[]) => void;
  onRotate: (id: string) => void;
  onRemove: (id: string) => void;
}

// A grid version of the scan filmstrip's drag-to-reorder: since tiles wrap
// onto multiple rows here, a drag can move both across and down, so this
// locates the tile under the pointer with elementFromPoint instead of the
// filmstrip's left/right midpoint comparison (which only works for a
// single row).
export function PageGrid({ pages, thumbs, onReorder, onRotate, onRemove }: PageGridProps) {
  const [dragId, setDragId] = useState<string | null>(null);
  const pagesRef = useRef(pages);
  pagesRef.current = pages;

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>, id: string) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragId(id);
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (dragId === null) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const tile = el?.closest<HTMLElement>("[data-page-id]");
    const overId = tile?.dataset.pageId;
    if (!overId || overId === dragId) return;

    const current = pagesRef.current;
    const fromIndex = current.findIndex((p) => p.id === dragId);
    const toIndex = current.findIndex((p) => p.id === overId);
    if (fromIndex === -1 || toIndex === -1) return;

    const next = [...current];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    onReorder(next);
  };

  const endDrag = () => setDragId(null);

  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
      {pages.map((page, i) => (
        <div
          key={page.id}
          data-page-id={page.id}
          className={`relative rounded-xl border bg-surface-2 p-1.5 transition-shadow ${
            dragId === page.id ? "z-10 border-accent shadow-lg" : "border-border"
          }`}
        >
          <div className="relative overflow-hidden rounded-lg bg-black">
            <img
              src={thumbs[page.index]}
              alt={`Page ${i + 1}`}
              draggable={false}
              className="aspect-[3/4] w-full object-contain transition-transform"
              style={{ transform: `rotate(${page.rotation}deg)` }}
            />
          </div>
          <span className="absolute left-2.5 top-2.5 rounded-full bg-bg/80 px-1.5 py-0.5 font-display text-[10px] font-bold text-fg">
            {i + 1}
          </span>
          <button
            type="button"
            aria-label={`Remove page ${i + 1}`}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onRemove(page.id)}
            className="absolute right-2.5 top-2.5 rounded-full bg-bad p-1 text-white"
          >
            <X className="h-3 w-3" />
          </button>

          <div className="mt-1.5 flex items-center gap-1.5">
            <button
              type="button"
              aria-label={`Rotate page ${i + 1}`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => onRotate(page.id)}
              className="flex flex-1 items-center justify-center gap-1 rounded-md border border-border bg-surface py-1 text-muted active:bg-surface-2"
            >
              <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <div
              data-testid="drag-handle"
              onPointerDown={(e) => handlePointerDown(e, page.id)}
              onPointerMove={handlePointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              className="flex flex-1 touch-none select-none items-center justify-center gap-1 rounded-md border border-border bg-surface py-1 text-muted active:bg-surface-2"
            >
              <GripVertical className="h-3.5 w-3.5" aria-hidden="true" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
