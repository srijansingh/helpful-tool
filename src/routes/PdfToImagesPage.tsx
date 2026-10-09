import { useState } from "react";
import { Dropzone } from "../components/Dropzone";
import { FilenameInput } from "../components/FilenameInput";
import { StatusMessage, type Status } from "../components/StatusMessage";
import { RecentActivity } from "../components/RecentActivity";
import { ToolContent } from "../components/ToolContent";
import { AdSlot } from "../components/AdSlot";
import { Card } from "../components/Card";
import { useSeo } from "../hooks/useSeo";
import { useRecentActivity } from "../hooks/useRecentActivity";
import { renderPdfToImages } from "../lib/pdf/pdfToImages";
import { renderPdfThumbnail } from "../lib/pdf/thumbnail";
import { downloadBlob } from "../lib/download";
import { toZipBlob } from "../lib/zip";
import { formatSize } from "../lib/formatSize";
import { usePdfToImagesStore } from "../store/usePdfToImagesStore";

export default function PdfToImagesPage() {
  useSeo(
    "Convert PDF to Images Online Free — PDF to JPG/PNG | LocalPDF",
    "Export every page of a PDF as a JPG or PNG image, right in your browser. No upload, no login."
  );

  const file = usePdfToImagesStore((s) => s.file);
  const setFile = usePdfToImagesStore((s) => s.setFile);
  const thumb = usePdfToImagesStore((s) => s.thumb);
  const setThumb = usePdfToImagesStore((s) => s.setThumb);
  const format = usePdfToImagesStore((s) => s.format);
  const setFormat = usePdfToImagesStore((s) => s.setFormat);
  const outputName = usePdfToImagesStore((s) => s.outputName);
  const setOutputName = usePdfToImagesStore((s) => s.setOutputName);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const { entries, logActivity } = useRecentActivity();

  const handleFile = (files: File[]) => {
    const f = files[0];
    setFile(f);
    setThumb(null);
    setOutputName(f.name.replace(/\.pdf$/i, "-images"));
    renderPdfThumbnail(f).then(setThumb).catch(() => {});
  };

  const handleConvert = async () => {
    if (!file) {
      setStatus({ kind: "error", message: "Choose a PDF first." });
      return;
    }
    setStatus({ kind: "working", message: "Rendering pages…" });
    try {
      const images = await renderPdfToImages(file, { format });
      const base = outputName.trim() || "images";
      if (images.length === 1) {
        const blob = new Blob([new Uint8Array(images[0].bytes)], { type: format });
        const ext = format === "image/png" ? "png" : "jpg";
        downloadBlob(blob, `${base}.${ext}`);
        setStatus({
          kind: "done",
          message: `Done — ${base}.${ext} (${formatSize(blob.size)}) downloaded, processed entirely on this device.`,
        });
      } else {
        const zipBlob = toZipBlob(images);
        downloadBlob(zipBlob, `${base}.zip`);
        setStatus({
          kind: "done",
          message: `Done — ${base}.zip (${formatSize(zipBlob.size)}, ${images.length} images) downloaded, processed entirely on this device.`,
        });
      }
      logActivity({ tool: "pdf-to-images", label: `Exported ${images.length} images as ${base}` });
    } catch (e) {
      setStatus({ kind: "error", message: `Couldn't render that PDF: ${(e as Error).message}` });
    }
  };

  return (
    <section>
      <h1 className="font-display text-2xl font-bold sm:text-3xl">PDF to Images</h1>
      <p className="mt-1 text-muted">Export every page as an image — zipped if there's more than one.</p>

      <Card className="mt-6">
        <Dropzone
          accept="application/pdf"
          label="Drop a PDF here or click to browse"
          hint={file ? `${file.name} — ${formatSize(file.size)}` : "One file at a time"}
          onFiles={handleFile}
        />

        {file && (
          <div className="mt-5 flex items-center gap-3 rounded-xl bg-surface-2 p-2 pr-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface">
              {thumb ? (
                <img src={thumb} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="h-full w-full animate-pulse bg-border" />
              )}
            </span>
            <div className="min-w-0">
              <p className="truncate font-display text-sm font-semibold">{file.name}</p>
              <p className="text-xs text-muted">{formatSize(file.size)}</p>
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-muted">Format</span>
            <select
              id="format"
              value={format}
              onChange={(e) => setFormat(e.target.value as "image/jpeg" | "image/png")}
              className="rounded-xl border border-border bg-surface-2 px-3 py-2.5 font-body text-sm font-semibold outline-none focus:border-accent"
            >
              <option value="image/jpeg">JPG</option>
              <option value="image/png">PNG</option>
            </select>
          </label>
          <div className="sm:max-w-xs">
            <FilenameInput value={outputName} onChange={setOutputName} extension="jpg / png / zip" />
          </div>
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

      <RecentActivity entries={entries.filter((e) => e.tool === "pdf-to-images")} />

      <AdSlot label="Ad space — in-content" />

      <ToolContent>
        Your PDF is rendered right here in your browser — nothing gets uploaded.
      </ToolContent>
    </section>
  );
}
