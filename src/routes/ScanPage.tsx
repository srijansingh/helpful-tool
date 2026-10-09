import { useDocumentStore } from "../store/useDocumentStore";
import { useSessionState } from "../hooks/useSessionState";
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
import { useToastStore } from "../store/useToastStore";

import { warpPerspective } from "../lib/scan/perspective";
import type { Quad } from "../lib/scan/perspective";
import { applyFilter, FILTERS } from "../lib/scan/filters";
import type { FilterType } from "../lib/scan/filters";
import { downscale } from "../lib/scan/downscale";
import { loadImage } from "../lib/scan/loadImage";
import { dataUrlToFile } from "../lib/scan/dataUrlToFile";
import { saveDocument as saveFile } from "../lib/library";
import { detectImagePaper } from "../lib/scan/detect";
import { imagesToPdf } from "../lib/pdf/workerOperations";
import { downloadBytes } from "../lib/download";
import { formatSize } from "../lib/formatSize";

type Step = "capture" | "crop" | "filter";

export default function ScanPage() {
  useSeo(
    "Scan Documents Online Free — Camera to PDF | LocalPDF",
    "Scan a document with your camera, crop and flatten the perspective, apply filters, and export to PDF — entirely in your browser.",
  );

  const navigate = useNavigate();
  const pages = useScanStore((s) => s.pages);
  const addPage = useScanStore((s) => s.addPage);
  const removePage = useScanStore((s) => s.removePage);
  const insertPageAt = useScanStore((s) => s.insertPageAt);
  const reorderPages = useScanStore((s) => s.reorderPages);
  const clearSession = useScanStore((s) => s.clear);
  const pushToast = useToastStore((s) => s.push);

  const [editingId, setEditingId] = useSessionState<string | null>(
    "scan",
    "editingId",
    null,
  );
  const [mode, setMode] = useSessionState<
    "document" | "id" | "receipt" | "whiteboard"
  >("scan", "mode", "document");
  const [batchCrop, setBatchCrop] = useSessionState("scan", "batchCrop", false);
  const [step, setStep] = useSessionState<Step>("scan", "step", "capture");
  const [rawImage, setRawImage] = useSessionState<string | null>(
    "scan",
    "rawImage",
    null,
  );
  const [warpedCanvas, setWarpedCanvas] =
    useSessionState<HTMLCanvasElement | null>("scan", "warpedCanvas", null);
  const [selectedFilter, setSelectedFilter] = useSessionState<FilterType>(
    "scan",
    "selectedFilter",
    "enhance",
  );
  const [previewUrl, setPreviewUrl] = useSessionState<string | null>(
    "scan",
    "previewUrl",
    null,
  );
  const [filterThumbs, setFilterThumbs] = useSessionState<
    Partial<Record<FilterType, string>>
  >("scan", "filterThumbs", {});
  const [outputName, setOutputName] = useSessionState(
    "scan",
    "outputName",
    "scan",
  );
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [processing, setProcessing] = useState(false);
  const [previewBytes, setPreviewBytes] = useState<Uint8Array | null>(null);
  const [previewing, setPreviewing] = useState(false);

  const resetEditor = () => {
    useScanStore.getState().setCropDraft(null);
    setEditingId(null);
    setStep("capture");
    setRawImage(null);
    setWarpedCanvas(null);
    setPreviewUrl(null);
    setFilterThumbs({});
    setSelectedFilter("enhance");
  };

  const handleCapture = (dataUrl: string) => {
    setEditingId(null);
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
        rawDataUrl: dataUrl,
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

      const filter =
        mode === "receipt" ? "bw" : mode === "id" ? "original" : "enhance";
      setSelectedFilter(filter);
      const filtered = applyFilter(warped, filter);
      setPreviewUrl(filtered.toDataURL("image/jpeg", 0.9));
      setStep("filter");
    } catch (e) {
      setStatus({ kind: "error", message: (e as Error).message });
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
    const patch = {
      rawDataUrl: rawImage || undefined,
      warpedDataUrl: warpedCanvas.toDataURL("image/jpeg", 0.92),
      dataUrl: previewUrl,
      filter: selectedFilter,
    };
    if (editingId) useScanStore.getState().updatePage(editingId, patch);
    else addPage({ id: crypto.randomUUID(), ...patch });
    resetEditor();
  };

  const handleRemovePage = (id: string) => {
    const index = pages.findIndex((p) => p.id === id);
    if (index === -1) return;
    const removed = pages[index];
    removePage(id);
    pushToast({
      message: "Page removed",
      actionLabel: "Undo",
      onAction: () => insertPageAt(index, removed),
    });
  };

  const buildPdfBytes = async () => {
    const files = await Promise.all(
      pages.map((p, i) => dataUrlToFile(p.dataUrl, `page-${i + 1}.jpg`)),
    );
    return imagesToPdf(files, {
      paper: mode === "id" ? "a4" : "original",
      margin: mode === "id" ? 24 : 0,
      quality: 0.9,
    });
  };

  const handleExportPdf = async () => {
    if (status.kind === "working") return;
    if (pages.length === 0) return;
    setStatus({ kind: "working", message: "Building PDF…" });
    try {
      const bytes = await buildPdfBytes();
      const filename = `${outputName.trim() || "scan"}.pdf`;
      downloadBytes(bytes, filename, "application/pdf");
      setStatus({
        kind: "done",
        message: `Done — ${filename} (${formatSize(bytes.length)}) ready — download started, processed entirely on this device.`,
      });
    } catch (e) {
      setStatus({
        kind: "error",
        message: `Couldn't build PDF: ${(e as Error).message}`,
      });
    }
  };

  const handlePreview = async () => {
    if (pages.length === 0 || previewing) return;
    setPreviewing(true);
    try {
      setPreviewBytes(await buildPdfBytes());
    } catch (e) {
      setStatus({
        kind: "error",
        message: `Couldn't build preview: ${(e as Error).message}`,
      });
    } finally {
      setPreviewing(false);
    }
  };

  const handleSaveToLibrary = async () => {
    if (status.kind === "working") return;
    if (pages.length === 0) return;
    setStatus({ kind: "working", message: "Saving…" });
    try {
      // Wait for the IndexedDB write before navigating — otherwise the
      // library page can mount and load before this save actually lands.
      const bytes = await buildPdfBytes();
      const file = new File(
        [new Uint8Array(bytes)],
        `${outputName.trim() || "scan"}.pdf`,
        { type: "application/pdf" },
      );
      await saveFile(file, crypto.randomUUID(), "", pages);
      useDocumentStore.getState().setCurrent(file);
      clearSession();
      navigate("/files");
    } catch (e) {
      setStatus({
        kind: "error",
        message: `Couldn't save: ${(e as Error).message}`,
      });
    }
  };

  const batch = async () => {
    if (processing) return;
    setProcessing(true);
    const before = pages;
    try {
      const next = [];
      for (let i = 0; i < pages.length; i++) {
        setStatus({
          kind: "working",
          message: `Enhancing page ${i + 1} of ${pages.length}…`,
        });
        const p = pages[i];
        const img = await loadImage(
          batchCrop ? p.rawDataUrl || p.warpedDataUrl : p.warpedDataUrl,
        );
        const detected = batchCrop ? detectImagePaper(img) : null;
        const c = detected
          ? warpPerspective(img, detected)
          : document.createElement("canvas");
        if (!detected) {
          c.width = img.naturalWidth;
          c.height = img.naturalHeight;
          c.getContext("2d")!.drawImage(img, 0, 0);
        }
        next.push({
          ...p,
          warpedDataUrl: c.toDataURL("image/jpeg", 0.92),
          dataUrl: applyFilter(c, selectedFilter).toDataURL("image/jpeg", 0.9),
          filter: selectedFilter,
        });
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => resolve()),
        );
      }
      reorderPages(next);
      setStatus({
        kind: "done",
        message: "Batch enhancement applied. Check every page before export.",
      });
      pushToast({
        message: "Pages enhanced",
        actionLabel: "Undo",
        onAction: () => reorderPages(before),
      });
    } catch (e) {
      setStatus({ kind: "error", message: (e as Error).message });
    } finally {
      setProcessing(false);
    }
  };
  return (
    <section>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">
            Scan Document
          </h1>
          <p className="mt-1 text-muted">
            Camera or upload, crop, filter, export — all on this device.
          </p>
        </div>
        <Link
          to="/scans"
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface-2 px-3 py-1.5 font-display text-xs font-semibold text-fg"
        >
          <FolderOpen className="h-3.5 w-3.5" aria-hidden="true" />
          Library
        </Link>
      </div>

      <label className="field-label mt-4">
        Scan mode
        <select
          className="field"
          value={mode}
          onChange={(e) => setMode(e.target.value as typeof mode)}
        >
          <option value="document">Document · enhance</option>
          <option value="id">ID · keep color, place on A4</option>
          <option value="receipt">Receipt · black & white</option>
          <option value="whiteboard">Whiteboard · enhance contrast</option>
        </select>
      </label>
      <div
        className={
          pages.length > 0
            ? "mt-6 lg:grid lg:grid-cols-[1fr_380px] lg:items-start lg:gap-6"
            : "mt-6 lg:max-w-2xl"
        }
      >
        <Card>
          {step === "capture" && (
            <CameraCapture
              onCapture={handleCapture}
              onCaptureMultiple={handleCaptureMultiple}
            />
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
                  <img
                    src={previewUrl}
                    alt="Scanned page preview"
                    className="w-full"
                  />
                )}
              </div>

              <div className="mt-4">
                <FilterPicker
                  value={selectedFilter}
                  onChange={handleFilterChange}
                  thumbnails={filterThumbs}
                />
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={handleAddPage}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 font-display text-base font-bold text-white transition-transform active:scale-[0.99]"
                >
                  <Plus className="h-5 w-5" aria-hidden="true" />
                  {editingId ? "Save page changes" : "Add Page & Scan Another"}
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
          <Card className="mt-4 lg:sticky lg:top-8 lg:mt-0">
            <h2 className="font-display text-sm font-semibold text-muted">
              {pages.length} page{pages.length === 1 ? "" : "s"} in this scan
            </h2>
            <div className="mt-3">
              <PageFilmstrip
                pages={pages}
                onReorder={reorderPages}
                onRemove={handleRemovePage}
                onEdit={(id) => {
                  const p = pages.find((p) => p.id === id)!;
                  setEditingId(id);
                  setRawImage(p.rawDataUrl || p.warpedDataUrl);
                  setStep("crop");
                }}
              />
            </div>

            <div className="panel mt-3">
              <label className="field-label">
                Batch filter
                <select
                  className="field"
                  value={selectedFilter}
                  onChange={(e) =>
                    setSelectedFilter(e.target.value as FilterType)
                  }
                >
                  {FILTERS.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex gap-2 mt-3">
                <input
                  type="checkbox"
                  checked={batchCrop}
                  onChange={(e) => setBatchCrop(e.target.checked)}
                />
                Try automatic crop for all pages
              </label>
              <button
                className="btn-secondary mt-3"
                disabled={processing || step !== "capture"}
                onClick={() => void batch()}
              >
                Enhance all pages
              </button>
              <p className="text-sm text-muted">
                Low-contrast pages keep their full photo when edges cannot be
                detected.
              </p>
            </div>
            <div className="mt-5 sm:max-w-xs lg:max-w-none">
              <FilenameInput
                value={outputName}
                onChange={setOutputName}
                extension="pdf"
              />
            </div>

            <button
              type="button"
              onClick={handlePreview}
              disabled={previewing || processing || step !== "capture"}
              className="mt-4 flex items-center gap-1.5 font-display text-sm font-semibold text-accent disabled:opacity-50"
            >
              <Eye className="h-4 w-4" aria-hidden="true" />
              {previewing ? "Building preview…" : "Preview PDF"}
            </button>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row lg:flex-col">
              <button
                type="button"
                data-primary-action="true"
                disabled={
                  status.kind === "working" ||
                  processing ||
                  step !== "capture" ||
                  pages.length === 0
                }
                onClick={handleExportPdf}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 font-display text-base font-bold text-white transition-transform active:scale-[0.99]"
              >
                <FileCheck2 className="h-5 w-5" aria-hidden="true" />
                Export PDF
              </button>
              <button
                type="button"
                disabled={
                  status.kind === "working" || processing || step !== "capture"
                }
                onClick={handleSaveToLibrary}
                className="flex-1 rounded-xl border border-accent px-5 py-3 font-display text-base font-bold text-accent transition-transform active:scale-[0.99]"
              >
                Save to Library
              </button>
            </div>

            <StatusMessage status={status} />
          </Card>
        )}
      </div>

      {pages.length === 0 && <StatusMessage status={status} />}
      {step !== "capture" && (
        <button
          className="btn-secondary mt-4"
          disabled={processing}
          onClick={resetEditor}
        >
          Back to capture
        </button>
      )}
      {previewBytes && (
        <PdfPreview
          bytes={previewBytes}
          onClose={() => setPreviewBytes(null)}
        />
      )}
    </section>
  );
}
