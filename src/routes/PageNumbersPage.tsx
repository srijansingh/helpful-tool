import { useState } from "react";
import { Eye, Hash } from "lucide-react";
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
import { applyPageNumbers } from "../lib/pdf/workerOperations";
import type {
  PageNumberPosition,
  PageNumberFormat,
} from "../lib/pdf/pageNumbers";
import { downloadBytes } from "../lib/download";
import { formatSize } from "../lib/formatSize";
import { usePageNumbersStore } from "../store/usePageNumbersStore";

const POSITIONS: { value: PageNumberPosition; label: string }[] = [
  { value: "bottom-left", label: "Bottom left" },
  { value: "bottom-center", label: "Bottom center" },
  { value: "bottom-right", label: "Bottom right" },
  { value: "top-left", label: "Top left" },
  { value: "top-center", label: "Top center" },
  { value: "top-right", label: "Top right" },
];

export default function PageNumbersPage() {
  useSeo(
    "Add Page Numbers to PDF Online Free | LocalPDF",
    "Number every page of a PDF — pick the position and format — right in your browser, no upload.",
  );

  const current = usePageNumbersStore((s) => s.current);
  const setCurrent = usePageNumbersStore((s) => s.setCurrent);
  const thumb = usePageNumbersStore((s) => s.thumb);
  const setThumb = usePageNumbersStore((s) => s.setThumb);
  const position = usePageNumbersStore((s) => s.position);
  const setPosition = usePageNumbersStore((s) => s.setPosition);
  const format = usePageNumbersStore((s) => s.format);
  const setFormat = usePageNumbersStore((s) => s.setFormat);
  const startAt = usePageNumbersStore((s) => s.startAt);
  const setStartAt = usePageNumbersStore((s) => s.setStartAt);
  const fontSize = usePageNumbersStore((s) => s.fontSize);
  const setFontSize = usePageNumbersStore((s) => s.setFontSize);
  const outputName = usePageNumbersStore((s) => s.outputName);
  const setOutputName = usePageNumbersStore((s) => s.setOutputName);
  const [ranges, setRanges] = useSessionState("PageNumbersPage", "ranges", "");
  const [prefix, setPrefix] = useSessionState("PageNumbersPage", "prefix", "");
  const [margin, setMargin] = useSessionState("PageNumbersPage", "margin", 24);
  const [skipCover, setSkipCover] = useSessionState(
    "PageNumbersPage",
    "skipCover",
    false,
  );
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
      setOutputName(`${name}-numbered`);
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

  const build = () => {
    if (!current) throw new Error("No PDF loaded");
    return applyPageNumbers(current.bytes, {
      position,
      format,
      startAt,
      fontSize,
      ranges,
      prefix,
      margin,
      skipCover,
    });
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
    setStatus({ kind: "working", message: "Adding page numbers…" });
    try {
      const out = await build();
      const filename = `${outputName.trim() || "numbered"}.pdf`;
      downloadBytes(out, filename, "application/pdf");
      setStatus({
        kind: "done",
        message: `Done — ${filename} (${formatSize(out.length)}) ready — download started, processed entirely on this device.`,
      });
      logActivity({
        tool: "page-numbers",
        label: `Numbered ${current.name}.pdf into ${filename}`,
      });
    } catch (e) {
      setStatus({
        kind: "error",
        message: `Couldn't add page numbers: ${(e as Error).message}`,
      });
    }
  };

  return (
    <section>
      <h1 className="font-display text-2xl font-bold sm:text-3xl">
        Page Numbers
      </h1>
      <p className="mt-1 text-muted">
        Number every page — pick where and how, preview it, then download.
      </p>

      <div className="mt-6 lg:grid document-workspace lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-6">
        <div className="workspace-inspector">
          <ToolSettings enabled={!!current} title="Number settings">
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
                <label className="field-label">
                  Pages (blank = all)
                  <input
                    className="field"
                    placeholder="1, 3-5"
                    value={ranges}
                    onChange={(e) => setRanges(e.target.value)}
                  />
                </label>
                <label className="field-label">
                  Prefix
                  <input
                    className="field"
                    placeholder="Page "
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value)}
                  />
                </label>
                <label className="field-label">
                  Margin (pt)
                  <input
                    className="field"
                    type="number"
                    min="6"
                    max="100"
                    value={margin}
                    onChange={(e) =>
                      setMargin(
                        Math.max(
                          6,
                          Math.min(100, Number(e.target.value) || 24),
                        ),
                      )
                    }
                  />
                </label>
                <label className="flex gap-2">
                  <input
                    type="checkbox"
                    checked={skipCover}
                    onChange={(e) => setSkipCover(e.target.checked)}
                  />
                  Skip cover page
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm text-muted">Position</span>
                  <select
                    value={position}
                    onChange={(e) =>
                      setPosition(e.target.value as PageNumberPosition)
                    }
                    className="rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm font-semibold outline-none focus:border-accent"
                  >
                    {POSITIONS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-sm text-muted">Format</span>
                  <select
                    value={format}
                    onChange={(e) =>
                      setFormat(e.target.value as PageNumberFormat)
                    }
                    className="rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm font-semibold outline-none focus:border-accent"
                  >
                    <option value="number">1, 2, 3…</option>
                    <option value="page-of-total">
                      1 of {current.pageCount}, 2 of {current.pageCount}…
                    </option>
                  </select>
                </label>

                <div className="flex gap-3">
                  <label className="flex flex-1 flex-col gap-1.5">
                    <span className="text-sm text-muted">Start at</span>
                    <input
                      type="number"
                      min={0}
                      value={startAt}
                      onChange={(e) => setStartAt(Number(e.target.value) || 1)}
                      className="rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm outline-none focus:border-accent"
                    />
                  </label>
                  <label className="flex flex-1 flex-col gap-1.5">
                    <span className="text-sm text-muted">Size</span>
                    <input
                      type="number"
                      min={6}
                      max={36}
                      value={fontSize}
                      onChange={(e) =>
                        setFontSize(Number(e.target.value) || 11)
                      }
                      className="rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm outline-none focus:border-accent"
                    />
                  </label>
                </div>

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
            <Hash className="h-5 w-5" aria-hidden="true" />
            Apply &amp; Download
          </button>

          <div className="lg:hidden">
            <RecentActivity
              entries={entries.filter((e) => e.tool === "page-numbers")}
            />
          </div>
        </div>

        <div className="workspace-document">
          <div className="min-h-0 flex-1">
            {current ? (
              <LivePreviewPane
                build={build}
                watch={`${sourceKey(current.bytes)}-${position}-${format}-${startAt}-${fontSize}-${ranges}-${prefix}-${margin}-${skipCover}`}
                emptyMessage="Add a PDF to see a live preview of the page numbers."
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-surface-2/50 p-6 text-center">
                <p className="max-w-[16rem] text-sm text-muted">
                  Add a PDF to see a live preview of the page numbers.
                </p>
              </div>
            )}
          </div>
          <RecentActivity
            entries={entries.filter((e) => e.tool === "page-numbers")}
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
