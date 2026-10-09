import { useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { ChevronLeft, ChevronRight, GripVertical, X } from "lucide-react";
import type { ScanPage } from "../../store/useScanStore";

interface PageFilmstripProps {
  pages: ScanPage[];
  onReorder: (pages: ScanPage[]) => void;
  onRemove: (id: string) => void;
}

// Drag-to-reorder via the Pointer Events API (not HTML5 drag-and-drop,
// which touch browsers don't support well) so dragging a page works the
// same with a mouse or a finger. Dragging the handle moves the tile with
// the pointer; crossing a neighbor's midpoint swaps it into that slot
// immediately, so the order always matches what's on screen.
export function PageFilmstrip({ pages, onReorder, onRemove }: PageFilmstripProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragX, setDragX] = useState(0);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const startXRef = useRef(0);
  const pagesRef = useRef(pages);
  pagesRef.current = pages;

  if (pages.length === 0) return null;

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>, i: number) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    startXRef.current = e.clientX;
    setDragIndex(i);
    setDragX(0);
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (dragIndex === null) return;
    const dx = e.clientX - startXRef.current;
    setDragX(dx);

    const draggedRect = itemRefs.current[dragIndex]?.getBoundingClientRect();
    if (!draggedRect) return;
    const draggedCenter = draggedRect.left + draggedRect.width / 2 + dx;

    const current = pagesRef.current;
    for (let j = 0; j < current.length; j++) {
      if (j === dragIndex) continue;
      const rect = itemRefs.current[j]?.getBoundingClientRect();
      if (!rect) continue;
      const neighborCenter = rect.left + rect.width / 2;
      const crossed = j < dragIndex ? draggedCenter < neighborCenter : draggedCenter > neighborCenter;
      if (crossed) {
        const next = [...current];
        const [moved] = next.splice(dragIndex, 1);
        next.splice(j, 0, moved);
        onReorder(next);
        setDragIndex(j);
        startXRef.current = e.clientX;
        setDragX(0);
        break;
      }
    }
  };

  const endDrag = () => {
    setDragIndex(null);
    setDragX(0);
  };

  // The keyboard-operable fallback for the pointer-drag handle below —
  // plain divs can't be focused or activated with a keyboard, so without
  // this, reordering has no accessible path at all.
  const move = (i: number, dir: -1 | 1) => {
    const next = [...pages];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    onReorder(next);
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      {pages.map((page, i) => (
        <div
          key={page.id}
          ref={(el) => {
            itemRefs.current[i] = el;
          }}
          className="relative shrink-0"
          style={
            i === dragIndex
              ? { transform: `translateX(${dragX}px)`, zIndex: 10, transition: "none" }
              : undefined
          }
        >
          <img
            src={page.dataUrl}
            alt={`Page ${i + 1}`}
            className="h-24 w-20 rounded-lg border border-border object-cover"
            draggable={false}
          />
          <span className="absolute left-1 top-1 rounded-full bg-bg/80 px-1.5 py-0.5 font-display text-[10px] font-bold text-fg">
            {i + 1}
          </span>
          <button
            type="button"
            aria-label={`Remove page ${i + 1}`}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onRemove(page.id)}
            className="absolute right-1 top-1 rounded-full bg-bad p-0.5 text-white focus-visible:ring-2 focus-visible:ring-accent"
          >
            <X className="h-3 w-3" />
          </button>
          <div
            onPointerDown={(e) => handlePointerDown(e, i)}
            onPointerMove={handlePointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            className="mt-1 flex touch-none select-none items-center justify-center gap-1 rounded-md border border-border bg-surface py-1 text-muted active:bg-surface-2"
          >
            <GripVertical className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="text-[10px] font-medium">Drag</span>
          </div>
          <div className="mt-1 flex gap-1">
            <button
              type="button"
              aria-label={`Move page ${i + 1} earlier`}
              disabled={i === 0}
              onClick={() => move(i, -1)}
              className="flex flex-1 items-center justify-center rounded-md border border-border bg-surface py-0.5 text-muted focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-30"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              aria-label={`Move page ${i + 1} later`}
              disabled={i === pages.length - 1}
              onClick={() => move(i, 1)}
              className="flex flex-1 items-center justify-center rounded-md border border-border bg-surface py-0.5 text-muted focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-30"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
