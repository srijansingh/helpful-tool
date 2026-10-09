import { useState } from "react";
import { Eye } from "lucide-react";
import { Dropzone } from "../components/Dropzone";
import { FilenameInput } from "../components/FilenameInput";
import { StatusMessage, type Status } from "../components/StatusMessage";
import { RecentActivity } from "../components/RecentActivity";
import { Card } from "../components/Card";
import { PdfPreview } from "../components/PdfPreview";
import { PageRangePicker } from "../components/split/PageRangePicker";
import { useSeo } from "../hooks/useSeo";
import { useRecentActivity } from "../hooks/useRecentActivity";
import { loadPdfInfo, extractPages, splitEveryPage } from "../lib/pdf/split";
import { renderPdfThumbnail } from "../lib/pdf/thumbnail";
import { renderAllPageThumbnails } from "../lib/pdf/pageThumbnails";
import { parsePageRanges, stringifyPageRanges } from "../lib/pdf/pageRanges";
import { downloadBytes, downloadBlob } from "../lib/download";
import { toZipBlob } from "../lib/zip";
import { formatSize } from "../lib/formatSize";
import { useSplitStore } from "../store/useSplitStore";

export default function SplitPage() {
  useSeo(
    "Split PDF Online Free — Extract or Separate Pages | LocalPDF",
    "Extract specific pages from a PDF or split every page into its own file, right in your browser. No upload, no login."
  );

  const current = useSplitStore((s) => s.current);
  const setCurrent = useSplitStore((s) => s.setCurrent);
  const thumb = useSplitStore((s) => s.thumb);
  const setThumb = useSplitStore((s) => s.setThumb);
  const pageThumbs = useSplitStore((s) => s.pageThumbs);
  const setPageThumbs = useSplitStore((s) => s.setPageThumbs);
  const range = useSplitStore((s) => s.range);
  const setRange = useSplitStore((s) => s.setRange);
  const outputName = useSplitStore((s) => s.outputName);
  const setOutputName = useSplitStore((s) => s.setOutputName);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [previewBytes, setPreviewBytes] = useState<Uint8Array | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const { entries, logActivity } = useRecentActivity();

  const handleFile = async (files: File[]) => {
    const file = files[0];
    setStatus({ kind: "working", message: "Reading PDF…" });
    setThumb(null);
    setPageThumbs([]);
    try {
      const { bytes, pageCount } = await loadPdfInfo(file);
      const name = file.name.replace(/\.pdf$/i, "");
      setCurrent({ bytes, pageCount, name, size: file.size });
      setOutputName(`${name}-pages`);
      setStatus({ kind: "idle" });
      renderPdfThumbnail(file).then(setThumb).catch(() => {});
      renderAllPageThumbnails(file).then(setPageThumbs).catch(() => {});
    } catch (e) {
      setStatus({ kind: "error", message: `Couldn't read that PDF: ${(e as Error).message}` });
    }
  };

  const selectedPages = new Set(current ? parsePageRanges(range, current.pageCount) : []);
  const togglePage = (index: number) => {
    if (!current) return;
    const next = new Set(selectedPages);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setRange(stringifyPageRanges([...next]));
  };

  const handlePreview = async () => {
    if (!current || previewing) return;
    setPreviewing(true);
    try {
      setPreviewBytes(await extractPages(current.bytes, range, current.pageCount));
    } catch (e) {
      setStatus({ kind: "error", message: `Couldn't build preview: ${(e as Error).message}` });
    } finally {
      setPreviewing(false);
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
      <p className="mt-1 text-muted">Pull out specific pages, or split every page into its own file.</p>

      <Card className="mt-6">
        <Dropzone
          accept="application/pdf"
          label="Drop a PDF here or click to browse"
          hint={current ? `${current.name}.pdf — ${current.pageCount} pages — ${formatSize(current.size)}` : "One file at a time"}
          onFiles={handleFile}
        />

        {current && (
          <div className="mt-5 flex items-center gap-3 rounded-xl bg-surface-2 p-2 pr-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface">
              {thumb ? (
                <img src={thumb} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="h-full w-full animate-pulse bg-border" />
              )}
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
              Pages to extract
            </label>
            <input
              id="range"
              type="text"
              value={range}
              onChange={(e) => setRange(e.target.value)}
              placeholder="e.g. 1-3,5,8"
              className="rounded-xl border border-border bg-surface-2 px-4 py-2.5 font-mono text-sm outline-none placeholder:font-body placeholder:text-muted focus:border-accent"
            />
            <p className="-mt-1.5 text-xs text-muted">
              Comma-separated numbers and ranges, or just click the pages below.
            </p>

            {pageThumbs.length > 0 ? (
              <PageRangePicker thumbs={pageThumbs} selected={selectedPages} onToggle={togglePage} />
            ) : (
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
                {Array.from({ length: Math.min(current.pageCount, 10) }).map((_, i) => (
                  <span key={i} className="aspect-[3/4] animate-pulse rounded-lg bg-surface-2" />
                ))}
              </div>
            )}

            <div className="sm:max-w-xs">
              <FilenameInput value={outputName} onChange={setOutputName} extension="pdf / zip" />
            </div>

            <button
              type="button"
              onClick={handlePreview}
              disabled={previewing || selectedPages.size === 0}
              className="flex items-center gap-1.5 font-display text-sm font-semibold text-accent disabled:opacity-50"
            >
              <Eye className="h-4 w-4" aria-hidden="true" />
              {previewing ? "Building preview…" : "Preview extracted pages"}
            </button>

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
      </Card>

      <RecentActivity entries={entries.filter((e) => e.tool === "split")} />

      {previewBytes && <PdfPreview bytes={previewBytes} onClose={() => setPreviewBytes(null)} />}
    </section>
  );
}
