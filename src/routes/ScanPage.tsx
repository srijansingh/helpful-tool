import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, FileCheck2, Plus, FolderOpen } from "lucide-react";
import { CameraCapture } from "../components/scan/CameraCapture";
import { CropEditor } from "../components/scan/CropEditor";
import { FilterPicker } from "../components/scan/FilterPicker";
import { PageFilmstrip } from "../components/scan/PageFilmstrip";
import { Card } from "../components/Card";
import { FilenameInput } from "../components/FilenameInput";
import { StatusMessage, type Status } from "../components/StatusMessage";
import { PdfPreview } from "../components/PdfPreview";
import { useSeo } from "../hooks/useSeo";
import { useScanStore } from "../store/useScanStore";
import { useScanLibrary } from "../hooks/useScanLibrary";
import { warpPerspective } from "../lib/scan/perspective";
import type { Quad } from "../lib/scan/perspective";
import { applyFilter, FILTERS } from "../lib/scan/filters";
import type { FilterType } from "../lib/scan/filters";
import { downscale } from "../lib/scan/downscale";
import { loadImage } from "../lib/scan/loadImage";
import { dataUrlToFile } from "../lib/scan/dataUrlToFile";
import { imagesToPdf } from "../lib/pdf/imagesToPdf";
import { downloadBytes } from "../lib/download";
import { formatSize } from "../lib/formatSize";

type Step = "capture" | "crop" | "filter";

export default function ScanPage() {
  useSeo(
    "Scan Documents Online Free — Camera to PDF | LocalPDF",
    "Scan a document with your camera, crop and flatten the perspective, apply filters, and export to PDF — entirely in your browser."
  );

  const navigate = useNavigate();
  const pages = useScanStore((s) => s.pages);
  const addPage = useScanStore((s) => s.addPage);
  const removePage = useScanStore((s) => s.removePage);
  const reorderPages = useScanStore((s) => s.reorderPages);
  const clearSession = useScanStore((s) => s.clear);
  const { saveDocument } = useScanLibrary();

  const [step, setStep] = useState<Step>("capture");
  const [rawImage, setRawImage] = useState<string | null>(null);
  const [warpedCanvas, setWarpedCanvas] = useState<HTMLCanvasElement | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>("enhance");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [filterThumbs, setFilterThumbs] = useState<Partial<Record<FilterType, string>>>({});
  const [outputName, setOutputName] = useState("scan");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [processing, setProcessing] = useState(false);
  const [previewBytes, setPreviewBytes] = useState<Uint8Array | null>(null);
  const [previewing, setPreviewing] = useState(false);

  const resetEditor = () => {
    setStep("capture");
    setRawImage(null);
    setWarpedCanvas(null);
    setPreviewUrl(null);
    setFilterThumbs({});
    setSelectedFilter("enhance");
  };

  const handleCapture = (dataUrl: string) => {
    setRawImage(dataUrl);
    setStep("crop");
  };

  // A batch upload skips the per-image crop/filter editor — cropping each
  // of several photos one at a time isn't what picking a batch is for.
  // Pages land in the filmstrip below exactly as uploaded, ready to
  // reorder and export.
  const handleCaptureMultiple = (dataUrls: string[]) => {
    for (const dataUrl of dataUrls) {
      addPage({
        id: crypto.randomUUID(),
        warpedDataUrl: dataUrl,
        dataUrl,
        filter: "original",
      });
    }
  };

  const handleCropConfirm = async (quad: Quad) => {
    if (!rawImage) return;
    setProcessing(true);
    try {
      const img = await loadImage(rawImage);
      const warped = warpPerspective(img, quad);
      setWarpedCanvas(warped);

      const small = downscale(warped, 140);
      const thumbs: Partial<Record<FilterType, string>> = {};
      for (const f of FILTERS) {
        thumbs[f.id] = applyFilter(small, f.id).toDataURL("image/jpeg", 0.8);
      }
      setFilterThumbs(thumbs);

      const filtered = applyFilter(warped, "enhance");
      setPreviewUrl(filtered.toDataURL("image/jpeg", 0.9));
      setStep("filter");
    } finally {
      setProcessing(false);
    }
  };

  const handleFilterChange = (filter: FilterType) => {
    setSelectedFilter(filter);
    if (!warpedCanvas) return;
    const filtered = applyFilter(warpedCanvas, filter);
    setPreviewUrl(filtered.toDataURL("image/jpeg", 0.9));
  };

  const handleAddPage = () => {
    if (!warpedCanvas || !previewUrl) return;
    addPage({
      id: crypto.randomUUID(),
      warpedDataUrl: warpedCanvas.toDataURL("image/jpeg", 0.92),
      dataUrl: previewUrl,
      filter: selectedFilter,
    });
    resetEditor();
  };

  const buildPdfBytes = async () => {
    const files = await Promise.all(
      pages.map((p, i) => dataUrlToFile(p.dataUrl, `page-${i + 1}.jpg`))
    );
    return imagesToPdf(files);
  };

  const handleExportPdf = async () => {
    if (pages.length === 0) return;
    setStatus({ kind: "working", message: "Building PDF…" });
    try {
      const bytes = await buildPdfBytes();
      const filename = `${outputName.trim() || "scan"}.pdf`;
      downloadBytes(bytes, filename, "application/pdf");
      setStatus({
        kind: "done",
        message: `Done — ${filename} (${formatSize(bytes.length)}) downloaded, processed entirely on this device.`,
      });
    } catch (e) {
      setStatus({ kind: "error", message: `Couldn't build PDF: ${(e as Error).message}` });
    }
  };

  const handlePreview = async () => {
    if (pages.length === 0 || previewing) return;
    setPreviewing(true);
    try {
      setPreviewBytes(await buildPdfBytes());
    } catch (e) {
      setStatus({ kind: "error", message: `Couldn't build preview: ${(e as Error).message}` });
    } finally {
      setPreviewing(false);
    }
  };

  const handleSaveToLibrary = async () => {
    if (pages.length === 0) return;
    setStatus({ kind: "working", message: "Saving…" });
    try {
      // Wait for the IndexedDB write before navigating — otherwise the
      // library page can mount and load before this save actually lands.
      await saveDocument(outputName.trim() || "scan", pages);
      clearSession();
      navigate("/scans");
    } catch (e) {
      setStatus({ kind: "error", message: `Couldn't save: ${(e as Error).message}` });
    }
  };

  return (
    <section>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Scan Document</h1>
          <p className="mt-1 text-muted">Camera or upload, crop, filter, export — all on this device.</p>
        </div>
        <Link
          to="/scans"
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface-2 px-3 py-1.5 font-display text-xs font-semibold text-fg"
        >
          <FolderOpen className="h-3.5 w-3.5" aria-hidden="true" />
          Library
        </Link>
      </div>

      <Card className="mt-6">
        {step === "capture" && (
          <CameraCapture onCapture={handleCapture} onCaptureMultiple={handleCaptureMultiple} />
        )}

        {step === "crop" && rawImage && (
          <CropEditor imageSrc={rawImage} onConfirm={handleCropConfirm} />
        )}

        {step === "filter" && previewUrl && (
          <div>
            <div className="overflow-hidden rounded-xl bg-black">
              {processing ? (
                <div className="flex aspect-[3/4] items-center justify-center">
                  <span className="h-10 w-10 animate-pulse rounded-full bg-border" />
                </div>
              ) : (
                <img src={previewUrl} alt="Scanned page preview" className="w-full" />
              )}
            </div>

            <div className="mt-4">
              <FilterPicker value={selectedFilter} onChange={handleFilterChange} thumbnails={filterThumbs} />
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={handleAddPage}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 font-display text-base font-bold text-bg transition-transform active:scale-[0.99]"
              >
                <Plus className="h-5 w-5" aria-hidden="true" />
                Add Page &amp; Scan Another
              </button>
              <button
                type="button"
                onClick={() => setStep("crop")}
                className="rounded-xl border border-border bg-surface-2 px-5 py-3 font-display text-base font-bold text-fg"
              >
                Re-crop
              </button>
            </div>
          </div>
        )}
      </Card>

      {pages.length > 0 && (
        <Card className="mt-4">
          <h2 className="font-display text-sm font-semibold text-muted">
            {pages.length} page{pages.length === 1 ? "" : "s"} in this scan
          </h2>
          <div className="mt-3">
            <PageFilmstrip pages={pages} onReorder={reorderPages} onRemove={removePage} />
          </div>

          <div className="mt-5 sm:max-w-xs">
            <FilenameInput value={outputName} onChange={setOutputName} extension="pdf" />
          </div>

          <button
            type="button"
            onClick={handlePreview}
            disabled={previewing}
            className="mt-4 flex items-center gap-1.5 font-display text-sm font-semibold text-accent disabled:opacity-50"
          >
            <Eye className="h-4 w-4" aria-hidden="true" />
            {previewing ? "Building preview…" : "Preview PDF"}
          </button>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={handleExportPdf}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 font-display text-base font-bold text-bg transition-transform active:scale-[0.99]"
            >
              <FileCheck2 className="h-5 w-5" aria-hidden="true" />
              Export PDF
            </button>
            <button
              type="button"
              onClick={handleSaveToLibrary}
              className="flex-1 rounded-xl border border-accent px-5 py-3 font-display text-base font-bold text-accent transition-transform active:scale-[0.99]"
            >
              Save to Library
            </button>
          </div>

          <StatusMessage status={status} />
        </Card>
      )}

      {previewBytes && <PdfPreview bytes={previewBytes} onClose={() => setPreviewBytes(null)} />}
    </section>
  );
}
