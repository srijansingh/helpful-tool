import { useRef, useState } from "react";
import { Dropzone } from "../components/Dropzone";
import { FilenameInput } from "../components/FilenameInput";
import { StatusMessage, type Status } from "../components/StatusMessage";
import { RecentActivity } from "../components/RecentActivity";
import { Card } from "../components/Card";
import { useSeo } from "../hooks/useSeo";
import { useRecentActivity } from "../hooks/useRecentActivity";
import { renderPdfToImages } from "../lib/pdf/pdfToImages";
import { renderPdfThumbnail } from "../lib/pdf/thumbnail";
import { renderAllPageThumbnails } from "../lib/pdf/pageThumbnails";
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
  const pageThumbs = usePdfToImagesStore((s) => s.pageThumbs);
  const setPageThumbs = usePdfToImagesStore((s) => s.setPageThumbs);
  const format = usePdfToImagesStore((s) => s.format);
  const setFormat = usePdfToImagesStore((s) => s.setFormat);
  const outputName = usePdfToImagesStore((s) => s.outputName);
  const setOutputName = usePdfToImagesStore((s) => s.setOutputName);
  const [ranges,setRanges]=useState("");const [scale,setScale]=useState(2);const [quality,setQuality]=useState(0.9);const cancel=useRef<AbortController|null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const { entries, logActivity } = useRecentActivity();

  const handleFile = (files: File[]) => {
    const f = files[0];
    setFile(f);
    setThumb(null);
    setPageThumbs([]);
    setOutputName(f.name.replace(/\.pdf$/i, "-images"));
    renderPdfThumbnail(f).then(setThumb).catch(() => {});
    renderAllPageThumbnails(f).then(setPageThumbs).catch(() => {});
  };

  const handleConvert = async () => {
    if (status.kind === "working") return;
    if (!file) {
      setStatus({ kind: "error", message: "Choose a PDF first." });
      return;
    }
    setStatus({ kind: "working", message: "Rendering pages…" });
    try {
      cancel.current=new AbortController();
      const images = await renderPdfToImages(file, { format,ranges,scale,quality,signal:cancel.current.signal,onProgress:(done,total)=>setStatus({kind:"working",message:`Rendering ${done} of ${total} pages…`}) });
      const base = outputName.trim() || "images";
      if (images.length === 1) {
        const blob = new Blob([new Uint8Array(images[0].bytes)], { type: format });
        const ext = format === "image/png" ? "png" : "jpg";
        downloadBlob(blob, `${base}.${ext}`);
        setStatus({
          kind: "done",
          message: `Done — ${base}.${ext} (${formatSize(blob.size)}) ready — download started, processed entirely on this device.`,
        });
      } else {
        const zipBlob = toZipBlob(images);
        downloadBlob(zipBlob, `${base}.zip`);
        setStatus({
          kind: "done",
          message: `Done — ${base}.zip (${formatSize(zipBlob.size)}, ${images.length} images) ready — download started, processed entirely on this device.`,
        });
      }
      logActivity({ tool: "pdf-to-images", label: `Exported ${images.length} images as ${base}` });
    } catch (e) {
      setStatus({ kind: "error", message: cancel.current?.signal.aborted?"Export cancelled. Original file is unchanged.":`Couldn't render that PDF: ${(e as Error).message}` });
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

        <div className="editor-options"><label className="field-label">Pages (blank = all)<input className="field" placeholder="1, 3-5" value={ranges} onChange={e=>setRanges(e.target.value)}/></label><label className="field-label">Resolution<select className="field" value={scale} onChange={e=>setScale(Number(e.target.value))}><option value="1">72 dpi · small</option><option value="2">144 dpi · balanced</option><option value="3">216 dpi · detailed</option></select></label><label className="field-label">JPEG quality<input type="range" min="0.3" max="1" step="0.1" value={quality} onChange={e=>setQuality(Number(e.target.value))}/></label>{status.kind==="working"&&<button className="btn-secondary" onClick={()=>cancel.current?.abort()}>Cancel export</button>}</div>
        {file && (
          <div className="mt-5">
            <p className="mb-2 text-sm text-muted">
              {pageThumbs.length > 0
                ? `${pageThumbs.length} page${pageThumbs.length === 1 ? "" : "s"} will be exported`
                : "Loading pages…"}
            </p>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
              {pageThumbs.map((src, i) => (
                <div key={i} className="relative overflow-hidden rounded-lg">
                  <img src={src} alt={`Page ${i + 1}`} className="aspect-[3/4] w-full object-cover" />
                  <span className="absolute left-1 top-1 rounded-full bg-bg/80 px-1.5 py-0.5 font-display text-[9px] font-bold text-fg">
                    {i + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          data-primary-action="true"
                  disabled={status.kind === "working" || !file}
                  onClick={handleConvert}
          className="mt-5 w-full rounded-xl bg-accent px-5 py-3 font-display text-base font-bold text-bg transition-transform active:scale-[0.99] sm:w-auto"
        >
          Convert &amp; Download
        </button>

        <StatusMessage status={status} />
      </Card>

      <RecentActivity entries={entries.filter((e) => e.tool === "pdf-to-images")} />
    </section>
  );
}
