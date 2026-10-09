import { FILTERS } from "../../lib/scan/filters";
import type { FilterType } from "../../lib/scan/filters";

interface FilterPickerProps {
  value: FilterType;
  onChange: (f: FilterType) => void;
  thumbnails: Partial<Record<FilterType, string>>;
}

export function FilterPicker({ value, onChange, thumbnails }: FilterPickerProps) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      {FILTERS.map((f) => (
        <button
          key={f.id}
          type="button"
          onClick={() => onChange(f.id)}
          className={`flex shrink-0 flex-col items-center gap-1.5 rounded-xl p-1.5 transition-colors ${
            value === f.id ? "bg-accent/15 ring-2 ring-accent" : "hover:bg-surface-2"
          }`}
        >
          <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg bg-surface-2">
            {thumbnails[f.id] ? (
              <img src={thumbnails[f.id]} className="h-full w-full object-cover" alt="" />
            ) : (
              <span className="h-full w-full animate-pulse bg-border" />
            )}
          </span>
          <span className="font-display text-xs font-semibold">{f.label}</span>
        </button>
      ))}
    </div>
  );
}
