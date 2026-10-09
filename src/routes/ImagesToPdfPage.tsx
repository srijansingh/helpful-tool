import { useState } from "react";
import { Eye } from "lucide-react";
import { Dropzone } from "../components/Dropzone";
import { FileList } from "../components/FileList";
import { FilenameInput } from "../components/FilenameInput";
import { StatusMessage, type Status } from "../components/StatusMessage";
import { RecentActivity } from "../components/RecentActivity";
import { Card } from "../components/Card";
import { LivePreviewPane } from "../components/LivePreviewPane";
import { PdfPreview } from "../components/PdfPreview";
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
  const [previewBytes, setPreviewBytes] = useState<Uint8Array | null>(null);
  const [previewing, setPreviewing] = useState(false);
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

  const handlePreview = async () => {
    if (files.length === 0 || previewing) return;
    setPreviewing(true);
    try {
      setPreviewBytes(await imagesToPdf(files));
    } catch (e) {
      setStatus({ kind: "error", message: `Couldn't build preview: ${(e as Error).message}` });
    } finally {
      setPreviewing(false);
    }
  };

  const handleConvert = async () => {
    if (status.kind === "working") return;
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
        message: `Done — ${filename} (${formatSize(bytes.length)}) ready — download started, processed entirely on this device.`,
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

      <div className="mt-6 lg:grid lg:grid-cols-[1fr_380px] lg:items-start lg:gap-6">
        <div>
          <Card>
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

            {files.length > 0 && (
              <button
                type="button"
                onClick={handlePreview}
                disabled={previewing}
                className="mt-4 flex items-center gap-1.5 font-display text-sm font-semibold text-accent disabled:opacity-50 lg:hidden"
              >
                <Eye className="h-4 w-4" aria-hidden="true" />
                {previewing ? "Building preview…" : "Preview PDF"}
              </button>
            )}

            <button
              type="button"
              data-primary-action="true"
                  disabled={status.kind === "working" || files.length === 0}
                  onClick={handleConvert}
              className="mt-3 w-full rounded-xl bg-accent px-5 py-3 font-display text-base font-bold text-bg transition-transform active:scale-[0.99] sm:w-auto"
            >
              Convert &amp; Download
            </button>

            <StatusMessage status={status} />
          </Card>

          <div className="lg:hidden">
            <RecentActivity entries={entries.filter((e) => e.tool === "images-to-pdf")} />
          </div>
        </div>

        <div className="hidden lg:sticky lg:top-8 lg:flex lg:h-[calc(100vh-4rem)] lg:flex-col lg:gap-4">
          <div className="min-h-0 flex-1">
            {files.length > 0 ? (
              <LivePreviewPane
                build={() => imagesToPdf(files)}
                watch={files}
                emptyMessage="Add images to see a live preview of the PDF."
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-surface-2/50 p-6 text-center">
                <p className="max-w-[16rem] text-sm text-muted">
                  Add images to see a live preview of the PDF.
                </p>
              </div>
            )}
          </div>
          <RecentActivity entries={entries.filter((e) => e.tool === "images-to-pdf")} className="shrink-0" />
        </div>
      </div>

      {previewBytes && <PdfPreview bytes={previewBytes} onClose={() => setPreviewBytes(null)} />}
    </section>
  );
}
