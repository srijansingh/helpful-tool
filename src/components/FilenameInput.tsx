import { Pencil } from "lucide-react";

interface FilenameInputProps {
  value: string;
  onChange: (value: string) => void;
  extension: string;
}

// Strips characters that are invalid (or just awkward) in filenames across
// Windows/macOS/Linux, so a pasted or typed name can't produce a download
// the user's OS silently mangles or rejects.
function sanitize(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "").slice(0, 150);
}

export function FilenameInput({ value, onChange, extension }: FilenameInputProps) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-center gap-1.5 text-sm text-muted">
        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
        Save as
      </span>
      <span className="flex items-stretch overflow-hidden rounded-xl border border-border bg-surface-2 focus-within:border-accent">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(sanitize(e.target.value))}
          className="min-w-0 flex-1 bg-transparent px-4 py-2.5 font-body text-sm font-semibold outline-none"
          aria-label="Output filename"
        />
        <span className="flex items-center bg-surface px-3 font-body text-sm text-muted">
          .{extension}
        </span>
      </span>
    </label>
  );
}
