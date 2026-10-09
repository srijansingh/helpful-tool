import { useRef, useState } from "react";
import type { DragEvent, ChangeEvent } from "react";
import { UploadCloud } from "lucide-react";
import { DocumentIllustration } from "./DocumentIllustration";

interface DropzoneProps {
  accept: string;
  multiple?: boolean;
  label: string;
  hint: string;
  onFiles: (files: File[]) => void;
}

export function Dropzone({ accept, multiple = false, label, hint, onFiles }: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    onFiles(Array.from(fileList));
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      className={`group flex cursor-pointer flex-col items-center gap-2.5 rounded-2xl border-2 border-dashed px-5 py-7 text-center transition-colors
        ${isDragging ? "border-accent bg-accent/10" : "border-border bg-surface-2/50 hover:border-accent/60"}`}
    >
      <DocumentIllustration className="h-14 w-14 text-muted" />
      <div className="flex items-center gap-2 font-display text-base font-semibold text-fg">
        <UploadCloud className="h-5 w-5 text-accent" aria-hidden="true" />
        {label}
      </div>
      <p className="text-sm text-muted">{hint}</p>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
