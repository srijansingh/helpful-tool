import { ArrowDown, ArrowUp, X } from "lucide-react";
import type { ScanPage } from "../../store/useScanStore";

interface PageFilmstripProps {
  pages: ScanPage[];
  onReorder: (pages: ScanPage[]) => void;
  onRemove: (id: string) => void;
}

export function PageFilmstrip({ pages, onReorder, onRemove }: PageFilmstripProps) {
  if (pages.length === 0) return null;

  const move = (i: number, dir: -1 | 1) => {
    const next = [...pages];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    onReorder(next);
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      {pages.map((page, i) => (
        <div key={page.id} className="relative shrink-0">
          <img
            src={page.dataUrl}
            alt={`Page ${i + 1}`}
            className="h-24 w-20 rounded-lg border border-border object-cover"
          />
          <span className="absolute left-1 top-1 rounded-full bg-bg/80 px-1.5 py-0.5 font-display text-[10px] font-bold text-fg">
            {i + 1}
          </span>
          <button
            type="button"
            aria-label={`Remove page ${i + 1}`}
            onClick={() => onRemove(page.id)}
            className="absolute right-1 top-1 rounded-full bg-bad p-0.5 text-white"
          >
            <X className="h-3 w-3" />
          </button>
          <div className="mt-1 flex justify-center gap-1">
            <button
              type="button"
              aria-label="Move left"
              disabled={i === 0}
              onClick={() => move(i, -1)}
              className="rounded-md border border-border bg-surface p-0.5 text-fg disabled:opacity-30"
            >
              <ArrowUp className="h-3 w-3 -rotate-90" />
            </button>
            <button
              type="button"
              aria-label="Move right"
              disabled={i === pages.length - 1}
              onClick={() => move(i, 1)}
              className="rounded-md border border-border bg-surface p-0.5 text-fg disabled:opacity-30"
            >
              <ArrowDown className="h-3 w-3 -rotate-90" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
