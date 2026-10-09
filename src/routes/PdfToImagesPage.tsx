import { useState } from "react";
import { Dropzone } from "../components/Dropzone";
import { FilenameInput } from "../components/FilenameInput";
import { StatusMessage, type Status } from "../components/StatusMessage";
import { RecentActivity } from "../components/RecentActivity";
import { ToolContent } from "../components/ToolContent";
import { AdSlot } from "../components/AdSlot";
import { useSeo } from "../hooks/useSeo";
import { useRecentActivity } from "../hooks/useRecentActivity";
import { renderPdfToImages } from "../lib/pdf/pdfToImages";
import { renderPdfThumbnail } from "../lib/pdf/thumbnail";
import { downloadBlob } from "../lib/download";
import { toZipBlob } from "../lib/zip";
import { formatSize } from "../lib/formatSize";

export default function PdfToImagesPage() {
  useSeo(
    "Convert PDF to Images Online Free — PDF to JPG/PNG | LocalPDF",
    "Export every page of a PDF as a JPG or PNG image, right in your browser. No upload, no login."
  );

  const [file, setFile] = useState<File | null>(null);
  const [thumb, setThumb] = useState<string | null>(null);
  const [format, setFormat] = useState<"image/jpeg" | "image/png">("image/jpeg");
  const [outputName, setOutputName] = useState("images");
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
      <p className="mt-1 text-muted">
        Pick a PDF — each page is exported as an image (zipped if there's more than one).
      </p>

      <div className="mt-6">
        <Dropzone
          accept="application/pdf"
          label="Drop a PDF here or click to browse"
          hint={file ? `${file.name} — ${formatSize(file.size)}` : "One file at a time"}
          onFiles={handleFile}
        />
      </div>

      {file && (
        <div className="mt-5 flex items-center gap-3 rounded-xl bg-surface-2 p-2 pr-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface">
            {thumb ? <img src={thumb} alt="" className="h-full w-full object-cover" /> : null}
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
            className="rounded-xl border border-border bg-surface-2 px-3 py-2.5 font-display text-sm outline-none focus:border-accent"
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

      <RecentActivity entries={entries.filter((e) => e.tool === "pdf-to-images")} />

      <AdSlot label="Ad space — in-content" />

      <ToolContent
        intro="Most free PDF-to-image tools work by uploading your file to a server, rendering it there, and sending images back. This tool renders every page entirely inside your browser using pdf.js, the same open-source engine Firefox uses to display PDFs; your file never leaves your computer."
        faqs={[
          { q: "What formats can I export to?", a: "JPG or PNG. JPG is smaller; PNG preserves transparency and sharp edges better for text-heavy pages." },
          { q: "Will I get one file or a zip?", a: "A single-page PDF downloads as one image. Anything with more than one page downloads as a zip of images, one per page." },
          { q: "Is my file actually uploaded anywhere?", a: "No. Every operation on this page runs in your browser's own JavaScript engine. There's no server call, no account, and nothing is stored once you close the tab." },
          { q: "Is there a page limit?", a: "No hard limit is enforced, but rendering many pages at once uses your device's memory, not a server, so very long PDFs may be slow on a low-end phone." },
        ]}
      />
    </section>
  );
}
