import { prepareImage } from "../lib/imageBudget";
import { useState } from "react";
import { Droplets, Eye } from "lucide-react";
import { Dropzone } from "../components/Dropzone";
import { FilenameInput } from "../components/FilenameInput";
import { StatusMessage, type Status } from "../components/StatusMessage";
import { RecentActivity } from "../components/RecentActivity";
import { ToolSettings } from "../components/ToolSettings";
import { sourceKey } from "../lib/sourceKey";
import { useSessionState } from "../hooks/useSessionState";
import { LivePreviewPane } from "../components/LivePreviewPane";
import { PdfPreview } from "../components/PdfPreview";
import { useSeo } from "../hooks/useSeo";
import { useRecentActivity } from "../hooks/useRecentActivity";
import { loadPdfInfo } from "../lib/pdf/split";
import { renderPdfThumbnail } from "../lib/pdf/thumbnail";
import { runPdfJob } from "../lib/pdfJobs";
import { downloadBytes } from "../lib/download";
import { formatSize } from "../lib/formatSize";
import { useWatermarkStore } from "../store/useWatermarkStore";

export default function WatermarkPage() {
  useSeo(
    "Add Watermark to PDF Online Free | LocalPDF",
    "Stamp a text watermark across every page of a PDF — right in your browser, no upload.",
  );

  const current = useWatermarkStore((s) => s.current);
  const setCurrent = useWatermarkStore((s) => s.setCurrent);
  const thumb = useWatermarkStore((s) => s.thumb);
  const setThumb = useWatermarkStore((s) => s.setThumb);
  const text = useWatermarkStore((s) => s.text);
  const setText = useWatermarkStore((s) => s.setText);
  const opacity = useWatermarkStore((s) => s.opacity);
  const setOpacity = useWatermarkStore((s) => s.setOpacity);
  const fontSize = useWatermarkStore((s) => s.fontSize);
  const setFontSize = useWatermarkStore((s) => s.setFontSize);
  const rotation = useWatermarkStore((s) => s.rotation);
  const setRotation = useWatermarkStore((s) => s.setRotation);
  const outputName = useWatermarkStore((s) => s.outputName);
  const setOutputName = useWatermarkStore((s) => s.setOutputName);
  const [position, setPosition] = useSessionState<
    "center" | "top-left" | "top-right" | "bottom-left" | "bottom-right"
  >("WatermarkPage", "position", "center");
  const [color, setColor] = useSessionState(
    "WatermarkPage",
    "color",
    "#808080",
  );
  const [ranges, setRanges] = useSessionState("WatermarkPage", "ranges", "");
  const [repeat, setRepeat] = useSessionState("WatermarkPage", "repeat", false);
  const [logo, setLogo] = useSessionState("WatermarkPage", "logo", "");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [previewBytes, setPreviewBytes] = useState<Uint8Array | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const { entries, logActivity } = useRecentActivity();

  const handleFile = async (files: File[]) => {
    const file = files[0];
    setStatus({ kind: "working", message: "Reading PDF…" });
    setThumb(null);
    try {
      const { bytes, pageCount } = await loadPdfInfo(file);
      const name = file.name.replace(/\.pdf$/i, "");
      setCurrent({ bytes, pageCount, name, size: file.size });
      setOutputName(`${name}-watermarked`);
      setStatus({ kind: "idle" });
      renderPdfThumbnail(file)
        .then(setThumb)
        .catch(() => {});
    } catch (e) {
      setStatus({
        kind: "error",
        message: `Couldn't read that PDF: ${(e as Error).message}`,
      });
    }
  };

  const build = (signal?: AbortSignal) => {
    if (!current) throw new Error("No PDF loaded");
    return runPdfJob<Uint8Array>(
      "watermark",
      [
        current.bytes,
        {
          text: text || "WATERMARK",
          opacity,
          fontSize,
          rotation,
          position,
          color,
          ranges,
          repeat,
          logo,
        },
      ],
      signal,
      !signal,
    );
  };

  const handlePreview = async () => {
    if (!current || previewing) return;
    setPreviewing(true);
    try {
      setPreviewBytes(await build());
    } catch (e) {
      setStatus({
        kind: "error",
        message: `Couldn't build preview: ${(e as Error).message}`,
      });
    } finally {
      setPreviewing(false);
    }
  };

  const handleApply = async () => {
    if (status.kind === "working") return;
    if (!current) return;
    setStatus({ kind: "working", message: "Applying watermark…" });
    try {
      const out = await build();
      const filename = `${outputName.trim() || "watermarked"}.pdf`;
      downloadBytes(out, filename, "application/pdf");
      setStatus({
        kind: "done",
        message: `Done — ${filename} (${formatSize(out.length)}) ready — download started, processed entirely on this device.`,
      });
      logActivity({
        tool: "watermark",
        label: `Watermarked ${current.name}.pdf into ${filename}`,
      });
    } catch (e) {
      setStatus({
        kind: "error",
        message: `Couldn't apply watermark: ${(e as Error).message}`,
      });
    }
  };

  return (
    <section>
      <h1 className="font-display text-2xl font-bold sm:text-3xl">
        Watermark PDF
      </h1>
      <p className="mt-1 text-muted">
        Stamp text across every page — preview it, then download.
      </p>

      <div className="mt-6 lg:grid document-workspace lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-6">
        <div className="workspace-inspector">
          <ToolSettings enabled={!!current} title="Watermark settings">
            <Dropzone
              accept="application/pdf"
              label="Drop a PDF here or click to browse"
              hint={
                current
                  ? `${current.name}.pdf — ${current.pageCount} pages — ${formatSize(current.size)}`
                  : "One file at a time"
              }
              onFiles={handleFile}
            />

            {current && (
              <div className="mt-5 flex items-center gap-3 rounded-xl bg-surface-2 p-2 pr-4">
                <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface">
                  {thumb ? (
                    <img
                      src={thumb}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="h-full w-full animate-pulse bg-border" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-display text-sm font-semibold">
                    {current.name}.pdf
                  </p>
                  <p className="text-xs text-muted">
                    {current.pageCount} page{current.pageCount === 1 ? "" : "s"}{" "}
                    — {formatSize(current.size)}
                  </p>
                </div>
              </div>
            )}

            {current && (
              <div className="mt-5 flex flex-col gap-4">
                <div className="editor-options">
                  <label className="field-label">
                    Placement
                    <select
                      className="field"
                      value={position}
                      onChange={(e) =>
                        setPosition(e.target.value as typeof position)
                      }
                    >
                      {[
                        "center",
                        "top-left",
                        "top-right",
                        "bottom-left",
                        "bottom-right",
                      ].map((p) => (
                        <option key={p}>{p}</option>
                      ))}
                    </select>
                  </label>
                  <label className="field-label">
                    Pages (blank = all)
                    <input
                      className="field"
                      placeholder="1, 3-5"
                      value={ranges}
                      onChange={(e) => setRanges(e.target.value)}
                    />
                  </label>
                  <label>
                    Color
                    <input
                      aria-label="Watermark color"
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                    />
                  </label>
                  <label className="flex gap-2">
                    <input
                      type="checkbox"
                      checked={repeat}
                      onChange={(e) => setRepeat(e.target.checked)}
                    />
                    Repeat in a grid
                  </label>
                  <label className="btn-secondary">
                    Import logo
                    <input
                      className="sr-only"
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        try {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          await prepareImage(f);
                          const b = await createImageBitmap(f);
                          const c = document.createElement("canvas");
                          const scale = Math.min(
                            1,
                            2000 / Math.max(b.width, b.height),
                          );
                          c.width = Math.max(1, Math.round(b.width * scale));
                          c.height = Math.max(1, Math.round(b.height * scale));
                          c.getContext("2d")!.drawImage(
                            b,
                            0,
                            0,
                            c.width,
                            c.height,
                          );
                          b.close();
                          setLogo(c.toDataURL("image/png"));
                        } catch (e) {
                          setStatus({
                            kind: "error",
                            message: (e as Error).message,
                          });
                        }
                      }}
                    />
                  </label>
                  {logo && (
                    <button
                      className="btn-secondary"
                      onClick={() => setLogo("")}
                    >
                      Use text instead
                    </button>
                  )}
                </div>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm text-muted">Watermark text</span>
                  <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="CONFIDENTIAL"
                    className="rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm outline-none placeholder:text-muted focus:border-accent"
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="flex justify-between text-sm text-muted">
                    <span>Opacity</span>
                    <span className="font-mono">
                      {Math.round(opacity * 100)}%
                    </span>
                  </span>
                  <input
                    type="range"
                    min={0.05}
                    max={1}
                    step={0.05}
                    value={opacity}
                    onChange={(e) => setOpacity(Number(e.target.value))}
                    className="accent-accent"
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="flex justify-between text-sm text-muted">
                    <span>Size</span>
                    <span className="font-mono">{fontSize}pt</span>
                  </span>
                  <input
                    type="range"
                    min={12}
                    max={120}
                    step={2}
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="accent-accent"
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="flex justify-between text-sm text-muted">
                    <span>Rotation</span>
                    <span className="font-mono">{rotation}°</span>
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={90}
                    step={5}
                    value={rotation}
                    onChange={(e) => setRotation(Number(e.target.value))}
                    className="accent-accent"
                  />
                </label>

                <div className="sm:max-w-xs">
                  <FilenameInput
                    value={outputName}
                    onChange={setOutputName}
                    extension="pdf"
                  />
                </div>

                <button
                  type="button"
                  onClick={handlePreview}
                  disabled={previewing}
                  className="btn-secondary"
                >
                  <Eye className="h-4 w-4" aria-hidden="true" />
                  {previewing ? "Building preview…" : "Preview PDF"}
                </button>
              </div>
            )}

            <StatusMessage status={status} />
          </ToolSettings>
          <button
            type="button"
            data-primary-action="true"
            disabled={status.kind === "working" || !current}
            onClick={handleApply}
            className="flex items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 font-display text-base font-bold text-white transition-transform active:scale-[0.99] sm:w-auto"
          >
            <Droplets className="h-5 w-5" aria-hidden="true" />
            Apply &amp; Download
          </button>

          <div className="lg:hidden">
            <RecentActivity
              entries={entries.filter((e) => e.tool === "watermark")}
            />
          </div>
        </div>

        <div className="workspace-document">
          <div className="min-h-0 flex-1">
            {current ? (
              <LivePreviewPane
                build={build}
                watch={`${sourceKey(current.bytes)}-${text}-${opacity}-${fontSize}-${rotation}-${position}-${color}-${ranges}-${repeat}-${logo}`}
                emptyMessage="Add a PDF to see a live preview of the watermark."
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-surface-2/50 p-6 text-center">
                <p className="max-w-[16rem] text-sm text-muted">
                  Add a PDF to see a live preview of the watermark.
                </p>
              </div>
            )}
          </div>
          <RecentActivity
            entries={entries.filter((e) => e.tool === "watermark")}
            className="shrink-0"
          />
        </div>
      </div>

      {previewBytes && (
        <PdfPreview
          bytes={previewBytes}
          onClose={() => setPreviewBytes(null)}
        />
      )}
    </section>
  );
}
