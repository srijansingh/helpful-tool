import { useState } from "react";
import { Dropzone } from "../components/Dropzone";
import { FileList } from "../components/FileList";
import { FilenameInput } from "../components/FilenameInput";
import { StatusMessage, type Status } from "../components/StatusMessage";
import { RecentActivity } from "../components/RecentActivity";
import { Card } from "../components/Card";
import { useSeo } from "../hooks/useSeo";
import { useRecentActivity } from "../hooks/useRecentActivity";
import { useImageThumbnails } from "../hooks/useImageThumbnails";
import { imagesToPdf } from "../lib/pdf/imagesToPdf";
import { downloadBytes } from "../lib/download";
import { formatSize } from "../lib/formatSize";
import { useImagesToPdfStore } from "../store/useImagesToPdfStore";
import { useToastStore } from "../store/useToastStore";

export default function ImagesToPdfPage() {
  useSeo(
    "Convert Images to PDF Online Free — JPG, PNG to PDF | LocalPDF",
    "Combine JPG, PNG, WebP and other images into a single PDF, right in your browser. Preview and reorder first, no upload, no login."
  );

  const files = useImagesToPdfStore((s) => s.files);
  const setFiles = useImagesToPdfStore((s) => s.setFiles);
  const addFiles = useImagesToPdfStore((s) => s.addFiles);
  const outputName = useImagesToPdfStore((s) => s.outputName);
  const setOutputName = useImagesToPdfStore((s) => s.setOutputName);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const { entries, logActivity } = useRecentActivity();
  const thumbnails = useImageThumbnails(files);
  const pushToast = useToastStore((s) => s.push);

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  const handleRemoveFile = (file: File, index: number) => {
    pushToast({
      message: `Removed ${file.name}`,
      actionLabel: "Undo",
      onAction: () => {
        const current = useImagesToPdfStore.getState().files;
        const next = [...current];
        next.splice(Math.min(index, next.length), 0, file);
        setFiles(next);
      },
    });
  };

  const handleConvert = async () => {
    if (files.length === 0) {
      setStatus({ kind: "error", message: "Add at least one image." });
      return;
    }
    setStatus({ kind: "working", message: "Converting…" });
    try {
      const bytes = await imagesToPdf(files);
      const filename = `${outputName.trim() || "images"}.pdf`;
      downloadBytes(bytes, filename, "application/pdf");
      setStatus({
        kind: "done",
        message: `Done — ${filename} (${formatSize(bytes.length)}) downloaded, processed entirely on this device.`,
      });
      logActivity({ tool: "images-to-pdf", label: `Converted ${files.length} images to ${filename}` });
    } catch (e) {
      setStatus({ kind: "error", message: `Couldn't convert: ${(e as Error).message}` });
    }
  };

  return (
    <section>
      <h1 className="font-display text-2xl font-bold sm:text-3xl">Images to PDF</h1>
      <p className="mt-1 text-muted">Add your images, drag them into order, combine into one PDF.</p>

      <Card className="mt-6">
        <Dropzone
          accept="image/*"
          multiple
          label="Drop images here or click to browse"
          hint="One page per image, in the order you add them"
          onFiles={addFiles}
        />

        <div className="mt-5">
          <FileList files={files} onReorder={setFiles} onRemove={handleRemoveFile} thumbnails={thumbnails} />
        </div>

        {files.length > 0 && (
          <p className="mt-2 text-xs text-muted">
            {files.length} image{files.length === 1 ? "" : "s"} selected — {formatSize(totalSize)} total
          </p>
        )}

        <div className="mt-5 flex flex-col gap-3 sm:max-w-xs">
          <FilenameInput value={outputName} onChange={setOutputName} extension="pdf" />
        </div>

        <button
          type="button"
          onClick={handleConvert}
          className="mt-5 w-full rounded-xl bg-accent px-5 py-3 font-display text-base font-bold text-bg transition-transform active:scale-[0.99] sm:w-auto"
        >
          Convert &amp; Download
        </button>

        <StatusMessage status={status} />
      </Card>

      <RecentActivity entries={entries.filter((e) => e.tool === "images-to-pdf")} />
    </section>
  );
}
