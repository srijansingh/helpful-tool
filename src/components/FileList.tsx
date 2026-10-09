import { useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { ArrowDown, ArrowUp, GripVertical, X } from "lucide-react";
import { formatSize } from "../lib/formatSize";

interface FileListProps {
  files: File[];
  onReorder: (files: File[]) => void;
  onRemove?: (file: File, index: number) => void;
  thumbnails?: Map<File, string>;
}

// Drag-to-reorder via Pointer Events (not HTML5 drag-and-drop, which this
// used previously) — the same mechanism as the scan filmstrip and
// Organize's page grid, so dragging behaves identically, and works, on
// touch everywhere in the app rather than only here on desktop with a
// mouse. The Move up/down buttons stay as the keyboard-operable path.
export function FileList({ files, onReorder, onRemove, thumbnails }: FileListProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const filesRef = useRef(files);
  filesRef.current = files;

  if (files.length === 0) {
    return <p className="text-sm italic text-muted">No files added yet.</p>;
  }

  const keyOf = (file: File, i: number) => `${file.name}-${file.lastModified}-${i}`;

  const move = (i: number, dir: -1 | 1) => {
    const next = [...files];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    onReorder(next);
  };

  const remove = (i: number) => {
    onRemove?.(files[i], i);
    onReorder(files.filter((_, idx) => idx !== i));
  };

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>, i: number) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragIndex(i);
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (dragIndex === null) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const li = el?.closest<HTMLElement>("[data-file-index]");
    const overIndex = li ? Number(li.dataset.fileIndex) : null;
    if (overIndex === null || overIndex === dragIndex) return;

    const current = filesRef.current;
    const next = [...current];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(overIndex, 0, moved);
    onReorder(next);
    setDragIndex(overIndex);
  };

  const endDrag = () => setDragIndex(null);

  return (
    <ol className="flex flex-col gap-2">
      {files.map((file, i) => {
        const thumb = thumbnails?.get(file);
        return (
          <li
            key={keyOf(file, i)}
            data-file-index={i}
            className={`flex items-center gap-2 rounded-xl bg-surface-2 p-2 pr-3 transition-shadow ${
              dragIndex === i ? "relative z-10 shadow-lg ring-2 ring-accent" : ""
            }`}
          >
            <div
              onPointerDown={(e) => handlePointerDown(e, i)}
              onPointerMove={handlePointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              className="flex shrink-0 touch-none cursor-grab items-center self-stretch text-muted active:cursor-grabbing"
              aria-hidden="true"
            >
              <GripVertical className="h-4 w-4" />
            </div>

            <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface">
              {thumb ? (
                <img src={thumb} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="h-full w-full animate-pulse bg-border" />
              )}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-display text-sm">{file.name}</span>
              <span className="text-xs text-muted">{formatSize(file.size)}</span>
            </span>
            <span className="flex shrink-0 gap-1">
              <button
                type="button"
                aria-label={`Move ${file.name} up`}
                disabled={i === 0}
                onClick={() => move(i, -1)}
                className="rounded-lg border border-border bg-surface p-1.5 text-fg disabled:opacity-30"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                aria-label={`Move ${file.name} down`}
                disabled={i === files.length - 1}
                onClick={() => move(i, 1)}
                className="rounded-lg border border-border bg-surface p-1.5 text-fg disabled:opacity-30"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                aria-label={`Remove ${file.name}`}
                onClick={() => remove(i)}
                className="rounded-lg border border-border bg-surface p-1.5 text-bad"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
