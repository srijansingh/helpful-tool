import { useState } from "react";
import { Eye, FileCheck2, RotateCcw } from "lucide-react";
import { Dropzone } from "../components/Dropzone";
import { PageGrid } from "../components/organize/PageGrid";
import { FilenameInput } from "../components/FilenameInput";
import { StatusMessage, type Status } from "../components/StatusMessage";
import { RecentActivity } from "../components/RecentActivity";
import { ToolContent } from "../components/ToolContent";
import { AdSlot } from "../components/AdSlot";
import { Card } from "../components/Card";
import { PdfPreview } from "../components/PdfPreview";
import { useSeo } from "../hooks/useSeo";
import { useRecentActivity } from "../hooks/useRecentActivity";
import { useOrganizeStore } from "../store/useOrganizeStore";
import { loadOrganizeSource, buildOrganizedPdf } from "../lib/pdf/organize";
import { renderAllPageThumbnails } from "../lib/pdf/pageThumbnails";
import { downloadBytes } from "../lib/download";
import { formatSize } from "../lib/formatSize";

export default function OrganizePage() {
  useSeo(
    "Organize PDF Online Free — Reorder, Delete, Rotate Pages | LocalPDF",
    "Drag pages into a new order, delete the ones you don't need, and rotate pages — right in your browser, no upload."
  );

  const fileName = useOrganizeStore((s) => s.fileName);
  const bytes = useOrganizeStore((s) => s.bytes);
  const rotations = useOrganizeStore((s) => s.rotations);
  const thumbs = useOrganizeStore((s) => s.thumbs);
  const pages = useOrganizeStore((s) => s.pages);
  const outputName = useOrganizeStore((s) => s.outputName);
  const setLoaded = useOrganizeStore((s) => s.setLoaded);
  const setPages = useOrganizeStore((s) => s.setPages);
  const rotatePage = useOrganizeStore((s) => s.rotatePage);
  const removePage = useOrganizeStore((s) => s.removePage);
  const setOutputName = useOrganizeStore((s) => s.setOutputName);
  const resetStore = useOrganizeStore((s) => s.reset);

  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [loading, setLoading] = useState(false);
  const [previewBytes, setPreviewBytes] = useState<Uint8Array | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const { entries, logActivity } = useRecentActivity();

  const handleFile = async (files: File[]) => {
    const file = files[0];
    setLoading(true);
    setStatus({ kind: "idle" });
    try {
      const [{ bytes: pdfBytes, rotations: pageRotations }, pageThumbs] = await Promise.all([
        loadOrganizeSource(file),
        renderAllPageThumbnails(file),
      ]);
      setLoaded(file.name, pdfBytes, pageRotations, pageThumbs);
    } catch (e) {
      setStatus({ kind: "error", message: `Couldn't read that PDF: ${(e as Error).message}` });
    } finally {
      setLoading(false);
    }
  };

  const build = () => {
    if (!bytes || pages.length === 0) return null;
    return buildOrganizedPdf(bytes, rotations, pages);
  };

  const handlePreview = async () => {
    if (previewing) return;
    setPreviewing(true);
    try {
      const built = await build();
      if (built) setPreviewBytes(built);
    } catch (e) {
      setStatus({ kind: "error", message: `Couldn't build preview: ${(e as Error).message}` });
    } finally {
      setPreviewing(false);
    }
  };

  const handleExport = async () => {
    if (pages.length === 0) {
      setStatus({ kind: "error", message: "At least one page needs to stay in the document." });
      return;
    }
    setStatus({ kind: "working", message: "Building PDF…" });
    try {
      const out = await build();
      if (!out) return;
      const filename = `${outputName.trim() || "organized"}.pdf`;
      downloadBytes(out, filename, "application/pdf");
      setStatus({
        kind: "done",
        message: `Done — ${filename} (${formatSize(out.length)}) downloaded, processed entirely on this device.`,
      });
      logActivity({ tool: "organize", label: `Organized ${fileName} into ${filename}` });
    } catch (e) {
      setStatus({ kind: "error", message: `Couldn't build PDF: ${(e as Error).message}` });
    }
  };

  return (
    <section>
      <h1 className="font-display text-2xl font-bold sm:text-3xl">Organize PDF</h1>
      <p className="mt-1 text-muted">Drag pages into order, delete the ones you don't need, rotate the rest.</p>

      <Card className="mt-6">
        {!bytes && (
          <Dropzone
            accept="application/pdf"
            label={loading ? "Reading PDF…" : "Drop a PDF here or click to browse"}
            hint="One file at a time"
            onFiles={handleFile}
          />
        )}

        {bytes && pages.length > 0 && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="truncate font-display text-sm font-semibold text-muted">
                {fileName} — {pages.length} page{pages.length === 1 ? "" : "s"}
              </h2>
              <button
                type="button"
                onClick={() => {
                  resetStore();
                  setStatus({ kind: "idle" });
                }}
                className="flex shrink-0 items-center gap-1 text-xs font-semibold text-muted hover:text-fg"
              >
                <RotateCcw className="h-3 w-3" aria-hidden="true" />
                Start Over
              </button>
            </div>

            <div className="mt-3">
              <PageGrid pages={pages} thumbs={thumbs} onReorder={setPages} onRotate={rotatePage} onRemove={removePage} />
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

            <button
              type="button"
              onClick={handleExport}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 font-display text-base font-bold text-bg transition-transform active:scale-[0.99] sm:w-auto"
            >
              <FileCheck2 className="h-5 w-5" aria-hidden="true" />
              Export PDF
            </button>

            <StatusMessage status={status} />
          </>
        )}
      </Card>

      <RecentActivity entries={entries.filter((e) => e.tool === "organize")} />

      <AdSlot label="Ad space — in-content" />

      <ToolContent>
        Your PDF never leaves this device — reordering, deleting, and rotating pages all happen right here.
      </ToolContent>

      {previewBytes && <PdfPreview bytes={previewBytes} onClose={() => setPreviewBytes(null)} />}
    </section>
  );
}
