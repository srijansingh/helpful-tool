import { ArrowDown, ArrowUp, X, FileText } from "lucide-react";

interface FileListProps {
  files: File[];
  onReorder: (files: File[]) => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileList({ files, onReorder }: FileListProps) {
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

  return (
    <ol className="flex flex-col gap-2">
      {files.map((file, i) => (
        <li
          key={`${file.name}-${file.lastModified}-${i}`}
          className="flex items-center justify-between gap-3 rounded-xl bg-surface-2 px-3 py-2"
        >
          <span className="flex min-w-0 items-center gap-2">
            <FileText className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
            <span className="min-w-0 truncate font-display text-sm">{file.name}</span>
            <span className="shrink-0 text-xs text-muted">{formatSize(file.size)}</span>
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
      ))}
    </ol>
  );
}
