import { useState } from "react";
import type { DragEvent } from "react";
import { ArrowDown, ArrowUp, GripVertical, X } from "lucide-react";
import { formatSize } from "../lib/formatSize";

interface FileListProps {
  files: File[];
  onReorder: (files: File[]) => void;
  thumbnails?: Map<File, string>;
}

export function FileList({ files, onReorder, thumbnails }: FileListProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  if (files.length === 0) {
    return <p className="text-sm italic text-muted">No files added yet.</p>;
  }

  const move = (i: number, dir: -1 | 1) => {
    const next = [...files];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    onReorder(next);
  };

  const remove = (i: number) => {
    onReorder(files.filter((_, idx) => idx !== i));
  };

  const reorderTo = (from: number, to: number) => {
    if (from === to) return;
    const next = [...files];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onReorder(next);
  };

  const handleDragOver = (i: number) => (e: DragEvent<HTMLLIElement>) => {
    e.preventDefault();
    if (dragIndex !== null) setOverIndex(i);
  };

  const handleDrop = (i: number) => (e: DragEvent<HTMLLIElement>) => {
    e.preventDefault();
    if (dragIndex !== null) reorderTo(dragIndex, i);
    setDragIndex(null);
    setOverIndex(null);
  };

  return (
    <ol className="flex flex-col gap-2">
      {files.map((file, i) => {
        const thumb = thumbnails?.get(file);
        return (
          <li
            key={`${file.name}-${file.lastModified}-${i}`}
            onDragOver={handleDragOver(i)}
            onDrop={handleDrop(i)}
            className={`flex items-center gap-2 rounded-xl bg-surface-2 p-2 pr-3 transition-colors ${
              overIndex === i && dragIndex !== null && dragIndex !== i ? "ring-2 ring-accent" : ""
            } ${dragIndex === i ? "opacity-50" : ""}`}
          >
            <span
              draggable
              onDragStart={(e) => {
                setDragIndex(i);
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragEnd={() => {
                setDragIndex(null);
                setOverIndex(null);
              }}
              className="hidden shrink-0 cursor-grab touch-none items-center self-stretch text-muted active:cursor-grabbing sm:flex"
              aria-hidden="true"
            >
              <GripVertical className="h-4 w-4" />
            </span>

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
                aria-label="Move up"
                disabled={i === 0}
                onClick={() => move(i, -1)}
                className="rounded-lg border border-border bg-surface p-1.5 text-fg disabled:opacity-30"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                aria-label="Move down"
                disabled={i === files.length - 1}
                onClick={() => move(i, 1)}
                className="rounded-lg border border-border bg-surface p-1.5 text-fg disabled:opacity-30"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                aria-label="Remove"
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
