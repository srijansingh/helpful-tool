import { useState } from "react";
import { PageThumbnail } from "../PageThumbnail";
import { PageWindow } from "../PageWindow";
import { thumbnailSource } from "../../lib/pdf/pageThumbnails";
import { Check } from "lucide-react";

interface PageRangePickerProps {
  thumbs: string[];
  selected: Set<number>; // 0-indexed
  onToggle: (index: number) => void;
}

// A visual alternative to typing "1-3,5,7-9" blind — every page as a
// thumbnail, click to include/exclude it, kept in sync both ways with
// the text field (typing a range highlights these; clicking these
// updates the range text). Most "page range" tools only offer the text
// field; seeing the actual pages you're selecting is a real usability
// gap this closes.
export function PageRangePicker({
  thumbs,
  selected,
  onToggle,
}: PageRangePickerProps) {
  const [offset, setOffset] = useState(0);
  const start = Math.min(offset, Math.max(0, thumbs.length - 1));
  return (
    <>
      <PageWindow count={thumbs.length} offset={start} onOffset={setOffset} />
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
        {thumbs.slice(start, start + 36).map((src, local) => {
          const i = start + local;
          const isSelected = selected.has(i);
          return (
            <button
              key={i}
              type="button"
              onClick={() => onToggle(i)}
              aria-pressed={isSelected}
              aria-label={`${isSelected ? "Deselect" : "Select"} page ${i + 1}`}
              className={`group relative overflow-hidden rounded-lg border-2 transition-colors ${
                isSelected
                  ? "border-accent"
                  : "border-transparent hover:border-border"
              }`}
            >
              <PageThumbnail
                file={thumbnailSource(thumbs)}
                src={src}
                index={i}
              />
              <span
                className={`absolute inset-0 transition-colors ${isSelected ? "bg-accent/25" : "bg-transparent group-hover:bg-fg/5"}`}
              />
              <span className="absolute left-1 top-1 rounded-full bg-bg/80 px-1.5 py-0.5 font-display text-[9px] font-bold text-fg">
                {i + 1}
              </span>
              {isSelected && (
                <span className="absolute bottom-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-bg">
                  <Check className="h-2.5 w-2.5" strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </>
  );
}
