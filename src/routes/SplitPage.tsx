import { useState } from "react";
import { Dropzone } from "../components/Dropzone";
import { FilenameInput } from "../components/FilenameInput";
import { StatusMessage, type Status } from "../components/StatusMessage";
import { RecentActivity } from "../components/RecentActivity";
import { ToolContent } from "../components/ToolContent";
import { AdSlot } from "../components/AdSlot";
import { useSeo } from "../hooks/useSeo";
import { useRecentActivity } from "../hooks/useRecentActivity";
import { loadPdfInfo, extractPages, splitEveryPage } from "../lib/pdf/split";
import { renderPdfThumbnail } from "../lib/pdf/thumbnail";
import { downloadBytes, downloadBlob } from "../lib/download";
import { toZipBlob } from "../lib/zip";
import { formatSize } from "../lib/formatSize";

export default function SplitPage() {
  useSeo(
    "Split PDF Online Free — Extract or Separate Pages | LocalPDF",
    "Extract specific pages from a PDF or split every page into its own file, right in your browser. No upload, no login."
  );

  const [current, setCurrent] = useState<{ bytes: ArrayBuffer; pageCount: number; name: string; size: number } | null>(null);
  const [thumb, setThumb] = useState<string | null>(null);
  const [range, setRange] = useState("");
  const [outputName, setOutputName] = useState("pages");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const { entries, logActivity } = useRecentActivity();

  const handleFile = async (files: File[]) => {
    const file = files[0];
    setStatus({ kind: "working", message: "Reading PDF…" });
    setThumb(null);
    try {
      const { bytes, pageCount } = await loadPdfInfo(file);
      const name = file.name.replace(/\.pdf$/i, "");
      setCurrent({ bytes, pageCount, name, size: file.size });
      setOutputName(`${name}-pages`);
      setStatus({ kind: "idle" });
      renderPdfThumbnail(file).then(setThumb).catch(() => {});
    } catch (e) {
      setStatus({ kind: "error", message: `Couldn't read that PDF: ${(e as Error).message}` });
    }
  };

  const handleExtract = async () => {
    if (!current) return;
    setStatus({ kind: "working", message: "Extracting…" });
    try {
      const out = await extractPages(current.bytes, range, current.pageCount);
      const filename = `${outputName.trim() || "pages"}.pdf`;
      downloadBytes(out, filename, "application/pdf");
      setStatus({
        kind: "done",
        message: `Done — ${filename} (${formatSize(out.length)}) downloaded, processed entirely on this device.`,
      });
      logActivity({ tool: "split", label: `Extracted pages from ${current.name}.pdf into ${filename}` });
    } catch (e) {
      setStatus({ kind: "error", message: (e as Error).message });
    }
  };

  const handleSplitEvery = async () => {
    if (!current) return;
    setStatus({ kind: "working", message: "Splitting every page…" });
    try {
      const pages = await splitEveryPage(current.bytes, current.pageCount);
      const zipBlob = toZipBlob(pages);
      const filename = `${outputName.trim() || "pages"}.zip`;
      downloadBlob(zipBlob, filename);
      setStatus({
        kind: "done",
        message: `Done — ${filename} (${formatSize(zipBlob.size)}, ${pages.length} files) downloaded, processed entirely on this device.`,
      });
      logActivity({ tool: "split", label: `Split ${current.name}.pdf into ${pages.length} files` });
    } catch (e) {
      setStatus({ kind: "error", message: (e as Error).message });
    }
  };

  return (
    <section>
      <h1 className="font-display text-2xl font-bold sm:text-3xl">Split PDF</h1>
      <p className="mt-1 text-muted">
        Pick a PDF, then either pull out specific pages or split every page into its own file.
      </p>

      <div className="mt-6">
        <Dropzone
          accept="application/pdf"
          label="Drop a PDF here or click to browse"
          hint={current ? `${current.name}.pdf — ${current.pageCount} pages — ${formatSize(current.size)}` : "One file at a time"}
          onFiles={handleFile}
        />
      </div>

      {current && (
        <div className="mt-5 flex items-center gap-3 rounded-xl bg-surface-2 p-2 pr-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface">
            {thumb ? <img src={thumb} alt="" className="h-full w-full object-cover" /> : null}
          </span>
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-semibold">{current.name}.pdf</p>
            <p className="text-xs text-muted">
              {current.pageCount} page{current.pageCount === 1 ? "" : "s"} — {formatSize(current.size)}
            </p>
          </div>
        </div>
      )}

      {current && (
        <div className="mt-5 flex flex-col gap-3">
          <label className="text-sm text-muted" htmlFor="range">
            Pages to extract (e.g. 1-3,5,8)
          </label>
          <input
            id="range"
            type="text"
            value={range}
            onChange={(e) => setRange(e.target.value)}
            placeholder="1-3,5,8"
            className="rounded-xl border border-border bg-surface-2 px-4 py-2.5 font-display text-sm outline-none focus:border-accent"
          />

          <div className="sm:max-w-xs">
            <FilenameInput value={outputName} onChange={setOutputName} extension="pdf / zip" />
          </div>

          <button
            type="button"
            onClick={handleExtract}
            className="rounded-xl bg-accent px-5 py-3 font-display text-base font-bold text-bg transition-transform active:scale-[0.99]"
          >
            Extract Pages
          </button>
          <button
            type="button"
            onClick={handleSplitEvery}
            className="rounded-xl border border-accent px-5 py-3 font-display text-base font-bold text-accent transition-transform active:scale-[0.99]"
          >
            Split Every Page (zip)
          </button>
        </div>
      )}

      <StatusMessage status={status} />

      <RecentActivity entries={entries.filter((e) => e.tool === "split")} />

      <AdSlot label="Ad space — in-content" />

      <ToolContent
        intro="Most free PDF tools work by uploading your file to a server, processing it there, and sending the result back. That's fine for most documents, but it means your file — which might have personal details, ID numbers, or anything else you'd rather not hand to a third party — leaves your device. This tool splits your PDF entirely inside your browser using pdf-lib, an open-source library; your file never leaves your computer."
        faqs={[
          { q: "What page range formats are supported?", a: "Comma-separated numbers and ranges, e.g. 1-3,5,8 extracts pages 1, 2, 3, 5 and 8. Duplicate or out-of-range entries are ignored automatically." },
          { q: "What's the difference between Extract Pages and Split Every Page?", a: "Extract Pages pulls your chosen pages into one new PDF. Split Every Page breaks the whole document into one PDF per page, zipped together." },
          { q: "Is my file actually uploaded anywhere?", a: "No. Every operation on this page runs in your browser's own JavaScript engine. There's no server call, no account, and nothing is stored once you close the tab." },
          { q: "Is there a file size or page limit?", a: "No hard limit is enforced, but very large PDFs are processed by your device's memory, not a server, so extremely large files may be slow on a low-end phone." },
        ]}
      />
    </section>
  );
}
