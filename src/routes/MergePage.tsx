import { useState } from "react";
import { Dropzone } from "../components/Dropzone";
import { FileList } from "../components/FileList";
import { FilenameInput } from "../components/FilenameInput";
import { StatusMessage, type Status } from "../components/StatusMessage";
import { RecentActivity } from "../components/RecentActivity";
import { ToolContent } from "../components/ToolContent";
import { AdSlot } from "../components/AdSlot";
import { useSeo } from "../hooks/useSeo";
import { useRecentActivity } from "../hooks/useRecentActivity";
import { usePdfThumbnails } from "../hooks/usePdfThumbnails";
import { mergePdfs } from "../lib/pdf/merge";
import { downloadBytes } from "../lib/download";
import { formatSize } from "../lib/formatSize";

export default function MergePage() {
  useSeo(
    "Merge PDF Files Online Free — LocalPDF",
    "Combine multiple PDF files into one, in your browser. See page previews, rename the result, no upload, no login."
  );

  const [files, setFiles] = useState<File[]>([]);
  const [outputName, setOutputName] = useState("merged");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const { entries, logActivity } = useRecentActivity();
  const thumbnails = usePdfThumbnails(files);

  const addFiles = (newFiles: File[]) => setFiles((prev) => [...prev, ...newFiles]);
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
      <p className="mt-1 text-muted">Pick two or more PDFs, preview and reorder them, then merge into one file.</p>

      <div className="mt-6">
        <Dropzone
          accept="application/pdf"
          multiple
          label="Drop PDFs here or click to browse"
          hint="You can add more files any time before merging"
          onFiles={addFiles}
        />
      </div>

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

      <RecentActivity entries={entries.filter((e) => e.tool === "merge")} />

      <AdSlot label="Ad space — in-content" />

      <ToolContent
        intro="Most free PDF tools work by uploading your file to a server, processing it there, and sending the result back. That's fine for most documents, but it means your file — which might have personal details, ID numbers, or anything else you'd rather not hand to a third party — leaves your device. This tool merges your PDFs entirely inside your browser using pdf-lib, an open-source library; your files never leave your computer."
        faqs={[
          { q: "Is my file actually uploaded anywhere?", a: "No. Every operation on this page runs in your browser's own JavaScript engine. There's no server call, no account, and nothing is stored once you close the tab." },
          { q: "Is there a limit on how many PDFs I can merge?", a: "No hard limit, but very large or numerous files are processed by your device's memory, not a server, so an extremely large merge may be slow on a low-end phone." },
          { q: "Can I reorder the files before merging?", a: "Yes — use the up/down arrows next to each file to set the order pages will appear in the merged PDF." },
          { q: "Does merging affect PDF quality?", a: "No. Pages are copied as-is; nothing is re-rendered or recompressed." },
        ]}
      />
    </section>
  );
}
