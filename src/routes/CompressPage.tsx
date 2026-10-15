import { PdfReader } from "../components/PdfReader";
import { FilenameInput } from "../components/FilenameInput";
import { StatusMessage, type Status } from "../components/StatusMessage";
import { Card } from "../components/Card";
import { editImage } from "../lib/editImage";
import { PDFDocument } from "pdf-lib";
import { useEffect, useRef, useState } from "react";
import { Dropzone } from "../components/Dropzone";
import { useDocumentStore } from "../store/useDocumentStore";
import { renderPdfToImages } from "../lib/pdf/pdfToImages";
import { imagesToPdf } from "../lib/pdf/workerOperations";
import { downloadBytes } from "../lib/download";
import { formatSize } from "../lib/formatSize";
import { useRecentActivity } from "../hooks/useRecentActivity";
export default function CompressPage() {
  const initial = useDocumentStore((s) => s.current);
  const [file, setFile] = useState<File | null>(initial);
  const [quality, setQuality] = useState(0.7);
  const [scale, setScale] = useState(1.5);
  const [accepted, setAccepted] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [busy, setBusy] = useState(false);
  const [candidate, setCandidate] = useState<Uint8Array | null>(null);
  const [target, setTarget] = useState(0);
  const [outputName, setOutputName] = useState(
    initial ? initial.name.replace(/\.pdf$/i, "") + "-smaller" : "",
  );
  const { logActivity } = useRecentActivity();
  useEffect(() => {
    setCandidate(null);
    setStatus({ kind: "idle" });
  }, [file, quality, scale, target]);
  const cancel = useRef<AbortController | null>(null);
  useEffect(() => () => cancel.current?.abort(), []);
  const build = async () => {
    if (!file || busy || !accepted) return;
    setBusy(true);
    cancel.current = new AbortController();
    try {
      let best: Uint8Array | null = null;
      const master = await renderPdfToImages(file, {
        format: "image/png",
        scale,
        signal: cancel.current.signal,
        onProgress: (done, total) =>
          setStatus({ kind: "working", message: `Preparing ${done} of ${total} pages…` }),
      });
      const source = await PDFDocument.load(await file.arrayBuffer());
      for (const q of target > 0
        ? [quality, Math.min(quality, 0.5), Math.min(quality, 0.3)]
        : [quality]) {
        const images: File[] = [];
        for (const image of master) {
          cancel.current.signal.throwIfAborted();
          const input = new File([new Uint8Array(image.bytes)], image.name, {
            type: "image/png",
          });
          const encoded = await editImage(input, {
            rotation: 0,
            crop: 0,
            width: 4000,
            format: "image/jpeg",
            quality: q,
          });
          images.push(
            new File([encoded], image.name.replace(/\.png$/i, ".jpg"), {
              type: "image/jpeg",
            }),
          );
        }
        const raster = await PDFDocument.load(await imagesToPdf(images));
        raster.getPages().forEach((p, i) => {
          const b = source.getPage(i).getCropBox();
          const rotated = source.getPage(i).getRotation().angle % 180 !== 0;
          const w = rotated ? b.height : b.width,
            h = rotated ? b.width : b.height;
          const old = p.getSize();
          p.scaleContent(w / old.width, h / old.height);
          p.setSize(w, h);
        });
        const bytes = await raster.save();
        if (!best || bytes.length < best.length) best = bytes;
        if (!target || bytes.length <= target * 1024) break;
      }
      cancel.current.signal.throwIfAborted();
      if (!best) throw new Error("No pages were rendered.");
      if (best.length >= file.size) {
        setStatus({
          kind: "error",
          message: `Your original (${formatSize(file.size)}) is smaller than this result (${formatSize(best.length)}). No replacement was downloaded. Keep your original or adjust the settings.`,
        });
        return;
      }
      setCandidate(best);
      setStatus({
        kind: "done",
        message: `Original ${formatSize(file.size)} → result ${formatSize(best.length)}.${target && best.length > target * 1024 ? " The requested size could not be reached with these settings." : ""}`,
      });
    } catch (e) {
      setStatus({
        kind: "error",
        message: cancel.current?.signal.aborted
          ? "Cancelled. Original file is unchanged."
          : (e as Error).message,
      });
    } finally {
      setBusy(false);
    }
  };
  return (
    <section aria-busy={busy}>
      <h1 className="text-2xl font-bold">Reduce scan PDF size</h1>
      <p className="text-muted mt-2">
        For photo and scan PDFs. This creates new JPEG pages and discards
        selectable text, forms, links and signatures.
      </p>
      <p className="text-sm text-muted mt-2">
        Up to 50 pages per document. Review the result before downloading;
        tiny text can lose clarity.
      </p>
      <div className="mt-6 lg:grid file-workspace lg:grid-cols-[minmax(0,1fr)_minmax(320px,1fr)] lg:items-start lg:gap-6">
        <fieldset disabled={busy} className="contents">
          <Card>
            <Dropzone
              disabled={busy}
              accept="application/pdf"
              label="Choose a PDF"
              hint={
                file?.type === "application/pdf"
                  ? file.name
                  : "Photo or scanned PDFs work best"
              }
              onFiles={(f) => {
                setFile(f[0]);
                useDocumentStore.getState().setCurrent(f[0]);
                setOutputName(f[0].name.replace(/\.pdf$/i, "") + "-smaller");
              }}
            />
            <div className="mt-5 flex flex-col gap-4">
              <div className="editor-options" style={{ margin: 0 }}>
                <label className="field-label">
                  Resolution
                  <select
                    className="field"
                    value={scale}
                    onChange={(e) => setScale(Number(e.target.value))}
                  >
                    <option value="1">72 dpi · smallest</option>
                    <option value="1.5">108 dpi · balanced</option>
                    <option value="2">144 dpi · detailed</option>
                  </select>
                </label>
                <label className="field-label">
                  JPEG quality
                  <input
                    type="range"
                    min="0.3"
                    max="0.95"
                    step="0.05"
                    value={quality}
                    onChange={(e) => setQuality(Number(e.target.value))}
                  />
                </label>
                <label className="field-label">
                  Try to fit upload limit (KB; 0 = none)
                  <input
                    className="field"
                    type="number"
                    min="0"
                    value={target}
                    onChange={(e) =>
                      setTarget(Math.max(0, Number(e.target.value)))
                    }
                  />
                </label>
              </div>
              <label className="flex items-start gap-2 panel">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                />
                I want a flattened photo PDF and accept the loss of text and
                interactive features.
              </label>
              <FilenameInput
                value={outputName}
                onChange={setOutputName}
                extension="pdf"
              />
              <button
                className="btn"
                data-primary-action
                disabled={
                  !file || file.type !== "application/pdf" || !accepted || busy
                }
                onClick={() => {
                  if (candidate && file) {
                    const name = `${outputName.trim() || file.name.replace(/\.pdf$/i, "") + "-smaller"}.pdf`;
                    downloadBytes(candidate, name, "application/pdf");
                    logActivity({
                      tool: "compress",
                      label: `Reduced ${file.name} into ${name}`,
                    });
                  } else void build();
                }}
              >
                {busy
                  ? "Processing…"
                  : candidate
                    ? "Download smaller PDF"
                    : "Create smaller PDF"}
              </button>
              {file && file.type === "application/pdf" && !accepted && !busy && (
                <p className="text-sm text-muted">
                  Check the box above to enable this button.
                </p>
              )}
              {busy && (
                <button
                  className="btn-secondary"
                  onClick={() => cancel.current?.abort()}
                >
                  Cancel
                </button>
              )}
              <StatusMessage status={status} />
            </div>
          </Card>
        </fieldset>

        <div className="file-workspace-preview">
          <div className="flex h-full flex-col rounded-2xl border border-border bg-surface">
            <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
              <h2 className="font-display text-sm font-bold text-fg">
                Preview
              </h2>
              {busy && (
                <span
                  className="h-3 w-3 animate-pulse rounded-full bg-accent"
                  aria-hidden="true"
                />
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-3" aria-busy={busy}>
              {busy && (
                <p className="p-4 text-sm text-muted" role="status">
                  Rendering…
                </p>
              )}
              {!busy && !candidate && (
                <div className="flex h-full flex-col items-center justify-center gap-2 py-16 text-center">
                  <p className="max-w-[16rem] text-sm text-muted">
                    Create a smaller PDF to review the result here before
                    downloading.
                  </p>
                </div>
              )}
              {!busy && candidate && <PdfReader bytes={candidate} />}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
