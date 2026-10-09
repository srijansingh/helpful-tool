import { useState } from "react";
import { Dropzone } from "../components/Dropzone";
import { FileList } from "../components/FileList";
import { FilenameInput } from "../components/FilenameInput";
import { StatusMessage, type Status } from "../components/StatusMessage";
import { RecentActivity } from "../components/RecentActivity";
import { Card } from "../components/Card";
import { useSeo } from "../hooks/useSeo";
import { useRecentActivity } from "../hooks/useRecentActivity";
import { usePdfThumbnails } from "../hooks/usePdfThumbnails";
import { mergePdfs } from "../lib/pdf/merge";
import { downloadBytes } from "../lib/download";
import { formatSize } from "../lib/formatSize";
import { useMergeStore } from "../store/useMergeStore";

export default function MergePage() {
  useSeo(
    "Merge PDF Files Online Free — LocalPDF",
    "Combine multiple PDF files into one, in your browser. See page previews, rename the result, no upload, no login."
  );

  const files = useMergeStore((s) => s.files);
  const setFiles = useMergeStore((s) => s.setFiles);
  const addFiles = useMergeStore((s) => s.addFiles);
  const outputName = useMergeStore((s) => s.outputName);
  const setOutputName = useMergeStore((s) => s.setOutputName);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const { entries, logActivity } = useRecentActivity();
  const thumbnails = usePdfThumbnails(files);

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  const handleMerge = async () => {
    if (files.length < 2) {
      setStatus({ kind: "error", message: "Add at least two PDFs to merge." });
      return;
    }
    setStatus({ kind: "working", message: "Merging…" });
    try {
      const bytes = await mergePdfs(files);
      const filename = `${outputName.trim() || "merged"}.pdf`;
      downloadBytes(bytes, filename, "application/pdf");
      setStatus({
        kind: "done",
        message: `Done — ${filename} (${formatSize(bytes.length)}) downloaded, processed entirely on this device.`,
      });
      logActivity({ tool: "merge", label: `Merged ${files.length} PDFs into ${filename}` });
    } catch (e) {
      setStatus({ kind: "error", message: `Couldn't merge: ${(e as Error).message}` });
    }
  };

  return (
    <section>
      <h1 className="font-display text-2xl font-bold sm:text-3xl">Merge PDFs</h1>
      <p className="mt-1 text-muted">Add a few PDFs, drag them into order, merge.</p>

      <Card className="mt-6">
        <Dropzone
          accept="application/pdf"
          multiple
          label="Drop PDFs here or click to browse"
          hint="You can add more files any time before merging"
          onFiles={addFiles}
        />

        <div className="mt-5">
          <FileList files={files} onReorder={setFiles} thumbnails={thumbnails} />
        </div>

        {files.length > 0 && (
          <p className="mt-2 text-xs text-muted">
            {files.length} file{files.length === 1 ? "" : "s"} selected — {formatSize(totalSize)} total
          </p>
        )}

        <div className="mt-5 flex flex-col gap-3 sm:max-w-xs">
          <FilenameInput value={outputName} onChange={setOutputName} extension="pdf" />
        </div>

        <button
          type="button"
          onClick={handleMerge}
          className="mt-5 w-full rounded-xl bg-accent px-5 py-3 font-display text-base font-bold text-bg transition-transform active:scale-[0.99] sm:w-auto"
        >
          Merge &amp; Download
        </button>

        <StatusMessage status={status} />
      </Card>

      <RecentActivity entries={entries.filter((e) => e.tool === "merge")} />
    </section>
  );
}
