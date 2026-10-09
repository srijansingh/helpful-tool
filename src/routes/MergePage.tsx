import { runPdfJob } from "../lib/pdfJobs";
import { useState } from "react";
import { Dropzone } from "../components/Dropzone";
import { FileList } from "../components/FileList";
import { FilenameInput } from "../components/FilenameInput";
import { StatusMessage, type Status } from "../components/StatusMessage";
import { RecentActivity } from "../components/RecentActivity";
import { Card } from "../components/Card";
import { LivePreviewPane } from "../components/LivePreviewPane";
import { useSeo } from "../hooks/useSeo";
import { useRecentActivity } from "../hooks/useRecentActivity";
import { usePdfThumbnails } from "../hooks/usePdfThumbnails";
import { mergePdfs } from "../lib/pdf/workerOperations";
import { downloadBytes } from "../lib/download";
import { formatSize } from "../lib/formatSize";
import { useMergeStore } from "../store/useMergeStore";
import { useToastStore } from "../store/useToastStore";

export default function MergePage() {
  useSeo(
    "Merge PDF Files Online Free — LocalPDF",
    "Combine multiple PDF files into one, in your browser. See page previews, rename the result, no upload, no login.",
  );

  const files = useMergeStore((s) => s.files);
  const setFiles = useMergeStore((s) => s.setFiles);
  const addFiles = useMergeStore((s) => s.addFiles);
  const outputName = useMergeStore((s) => s.outputName);
  const setOutputName = useMergeStore((s) => s.setOutputName);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const { entries, logActivity } = useRecentActivity();
  const thumbnails = usePdfThumbnails(files);
  const pushToast = useToastStore((s) => s.push);

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  const handleRemoveFile = (file: File, index: number) => {
    pushToast({
      message: `Removed ${file.name}`,
      actionLabel: "Undo",
      onAction: () => {
        const current = useMergeStore.getState().files;
        const next = [...current];
        next.splice(Math.min(index, next.length), 0, file);
        setFiles(next);
      },
    });
  };

  const handleMerge = async () => {
    if (status.kind === "working") return;
    if (files.length < 2) {
      setStatus({
        kind: "error",
        message: "Add at least two PDFs or images to merge.",
      });
      return;
    }
    setStatus({ kind: "working", message: "Merging…" });
    try {
      const bytes = await mergePdfs(files);
      const filename = `${outputName.trim() || "merged"}.pdf`;
      downloadBytes(bytes, filename, "application/pdf");
      setStatus({
        kind: "done",
        message: `Done — ${filename} (${formatSize(bytes.length)}) ready — download started, processed entirely on this device.`,
      });
      logActivity({
        tool: "merge",
        label: `Merged ${files.length} PDFs into ${filename}`,
      });
    } catch (e) {
      setStatus({
        kind: "error",
        message: `Couldn't merge: ${(e as Error).message}`,
      });
    }
  };

  return (
    <section>
      <h1 className="font-display text-2xl font-bold sm:text-3xl">
        Merge PDFs
      </h1>
      <p className="mt-1 text-muted">Combine PDFs and photos in any order.</p>

      <div className="mt-6 lg:grid file-workspace lg:grid-cols-[minmax(0,1fr)_minmax(320px,1fr)] lg:items-start lg:gap-6">
        <div>
          <Card>
            <Dropzone
              accept="application/pdf,image/*"
              multiple
              label="Drop PDFs or images here or click to browse"
              hint="You can add more files any time before merging"
              onFiles={addFiles}
            />

            <div className="mt-5">
              <FileList
                disabled={status.kind === "working"}
                files={files}
                onReorder={setFiles}
                onRemove={handleRemoveFile}
                thumbnails={thumbnails}
              />
            </div>

            {files.length > 0 && (
              <p className="mt-2 text-xs text-muted">
                {files.length} file{files.length === 1 ? "" : "s"} selected —{" "}
                {formatSize(totalSize)} total
              </p>
            )}

            <div className="mt-5 flex flex-col gap-3 sm:max-w-xs">
              <FilenameInput
                value={outputName}
                onChange={setOutputName}
                extension="pdf"
              />
            </div>

            <button
              type="button"
              data-primary-action="true"
              disabled={status.kind === "working" || files.length < 2}
              onClick={handleMerge}
              className="mt-3 w-full rounded-xl bg-accent px-5 py-3 font-display text-base font-bold text-white transition-transform active:scale-[0.99] sm:w-auto"
            >
              Merge &amp; Download
            </button>

            <StatusMessage status={status} />
          </Card>

          <div className="lg:hidden">
            <RecentActivity
              entries={entries.filter((e) => e.tool === "merge")}
            />
          </div>
        </div>

        <div className="file-workspace-preview">
          <div className="min-h-0 flex-1">
            {files.length > 0 ? (
              <LivePreviewPane
                build={(signal) =>
                  runPdfJob<Uint8Array>("merge", [files], signal, false)
                }
                watch={files}
                emptyMessage="Add PDFs to see a live preview of the merged result."
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-surface-2/50 p-6 text-center">
                <p className="max-w-[16rem] text-sm text-muted">
                  Add PDFs to see a live preview of the merged result.
                </p>
              </div>
            )}
          </div>
          <RecentActivity
            entries={entries.filter((e) => e.tool === "merge")}
            className="shrink-0"
          />
        </div>
      </div>
    </section>
  );
}
