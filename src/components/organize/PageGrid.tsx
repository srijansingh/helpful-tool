import { PageThumbnail } from "../PageThumbnail";
import { PageWindow } from "../PageWindow";
import { thumbnailSource } from "../../lib/pdf/pageThumbnails";
import { useRef, useState } from "react";
import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  RotateCw,
  X,
} from "lucide-react";
import type { OrganizePageState } from "../../lib/pdf/organize";

interface PageGridProps {
  pages: OrganizePageState[];
  thumbs: string[]; // indexed by source page index
  onReorder: (pages: OrganizePageState[]) => void;
  onRotate: (id: string) => void;
  onRemove: (id: string) => void;
  selected: Set<string>;
  onToggleSelect: (id: string, index: number, shiftKey: boolean) => void;
}

// A grid version of the scan filmstrip's drag-to-reorder: since tiles wrap
// onto multiple rows here, a drag can move both across and down, so this
// locates the tile under the pointer with elementFromPoint instead of the
// filmstrip's left/right midpoint comparison (which only works for a
// single row).
export function PageGrid({
  pages,
  thumbs,
  onReorder,
  onRotate,
  onRemove,
  selected,
  onToggleSelect,
}: PageGridProps) {
  const [dragId, setDragId] = useState<string | null>(null);
  const pagesRef = useRef(pages);
  pagesRef.current = pages;

  const handlePointerDown = (
    e: ReactPointerEvent<HTMLDivElement>,
    id: string,
  ) => {
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

  // The keyboard-operable fallback for the pointer-drag handle below —
  // plain divs can't be focused or activated with a keyboard, so without
  // this, reordering has no accessible path at all.
  const move = (i: number, dir: -1 | 1) => {
    const next = [...pages];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    onReorder(next);
  };

  const [offset, setOffset] = useState(0);
  const start = Math.min(offset, Math.max(0, pages.length - 1));
  return (
    <>
      <PageWindow count={pages.length} offset={start} onOffset={setOffset} />
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
        {pages.slice(start, start + 36).map((page, local) => {
          const i = start + local;
          const isSelected = selected.has(page.id);
          return (
            <div
              key={page.id}
              data-page-id={page.id}
              className={`relative rounded-xl border bg-surface-2 p-1.5 transition-shadow ${
                dragId === page.id
                  ? "z-10 border-accent shadow-lg"
                  : isSelected
                    ? "border-accent"
                    : "border-border"
              }`}
            >
              <div className="relative overflow-hidden rounded-lg bg-black">
                <PageThumbnail
                  file={thumbnailSource(thumbs)}
                  src={thumbs[page.index]}
                  index={page.index}
                  rotation={page.rotation}
                  crop={page.crop}
                />
                {isSelected && (
                  <span className="pointer-events-none absolute inset-0 bg-accent/25" />
                )}
              </div>
              <button
                type="button"
                aria-pressed={isSelected}
                aria-label={`${isSelected ? "Deselect" : "Select"} page ${i + 1}`}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e: ReactMouseEvent) =>
                  onToggleSelect(page.id, i, e.shiftKey)
                }
                className={`absolute left-2.5 top-2.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 font-display text-[10px] font-bold transition-colors focus-visible:ring-2 focus-visible:ring-accent ${
                  isSelected ? "bg-accent text-bg" : "bg-bg/80 text-fg"
                }`}
              >
                {isSelected ? (
                  <Check className="h-3 w-3" strokeWidth={3} />
                ) : (
                  i + 1
                )}
              </button>
              <button
                type="button"
                aria-label={`Remove page ${i + 1}`}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => onRemove(page.id)}
                className="absolute right-2.5 top-2.5 rounded-full bg-bad p-1 text-white focus-visible:ring-2 focus-visible:ring-accent"
              >
                <X className="h-3 w-3" />
              </button>

              <div className="mt-1.5 flex items-center gap-1.5">
                <button
                  type="button"
                  aria-label={`Rotate page ${i + 1}`}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => onRotate(page.id)}
                  className="flex flex-1 items-center justify-center gap-1 rounded-md border border-border bg-surface py-1 text-muted focus-visible:ring-2 focus-visible:ring-accent active:bg-surface-2"
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
              <div className="mt-1.5 flex gap-1.5">
                <button
                  type="button"
                  aria-label={`Move page ${i + 1} earlier`}
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                  className="flex flex-1 items-center justify-center rounded-md border border-border bg-surface py-1 text-muted focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-30"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-label={`Move page ${i + 1} later`}
                  disabled={i === pages.length - 1}
                  onClick={() => move(i, 1)}
                  className="flex flex-1 items-center justify-center rounded-md border border-border bg-surface py-1 text-muted focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-30"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
