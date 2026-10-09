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
export function PageRangePicker({ thumbs, selected, onToggle }: PageRangePickerProps) {
  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
      {thumbs.map((src, i) => {
        const isSelected = selected.has(i);
        return (
          <button
            key={i}
            type="button"
            onClick={() => onToggle(i)}
            aria-pressed={isSelected}
            aria-label={`${isSelected ? "Deselect" : "Select"} page ${i + 1}`}
            className={`group relative overflow-hidden rounded-lg border-2 transition-colors ${
              isSelected ? "border-accent" : "border-transparent hover:border-border"
            }`}
          >
            <img src={src} alt={`Page ${i + 1}`} className="aspect-[3/4] w-full object-cover" />
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
  );
}
