import { PdfPreview } from "../components/PdfPreview";
import { FilenameInput } from "../components/FilenameInput";
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
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [candidate, setCandidate] = useState<Uint8Array | null>(null);
  const [preview, setPreview] = useState<Uint8Array | null>(null);
  const [target, setTarget] = useState(0);
  const [outputName, setOutputName] = useState(
    initial ? initial.name.replace(/\.pdf$/i, "") + "-smaller" : "",
  );
  const { logActivity } = useRecentActivity();
  useEffect(() => {
    setCandidate(null);
    setStatus("");
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
          setStatus(`Preparing ${done} of ${total} pages…`),
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
        setStatus(
          `Your original (${formatSize(file.size)}) is smaller than this result (${formatSize(best.length)}). No replacement was downloaded. Keep your original or adjust the settings.`,
        );
        return;
      }
      setCandidate(best);
      setPreview(best);
      setStatus(
        `Original ${formatSize(file.size)} → result ${formatSize(best.length)}.${target && best.length > target * 1024 ? " The requested size could not be reached with these settings." : ""}${best.length >= file.size ? " The original file is smaller; keep it for best quality." : ""}`,
      );
    } catch (e) {
      setStatus(
        cancel.current?.signal.aborted
          ? "Cancelled. Original file is unchanged."
          : (e as Error).message,
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <section aria-busy={busy}>
      <fieldset disabled={busy} className="contents">
        <h1 className="text-2xl font-bold">Reduce scan PDF size</h1>
        <p className="text-muted mt-2">
          For photo and scan PDFs. This creates new JPEG pages and discards
          selectable text, forms, links and signatures.
        </p>
        <p className="text-sm text-muted mt-2">
          Up to 50 pages per document. Review the result before downloading;
          tiny text can lose clarity.
        </p>
        <div className="mt-4">
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
        </div>
        <div className="tool-form mt-4">
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
                onChange={(e) => setTarget(Math.max(0, Number(e.target.value)))}
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
          <FilenameInput value={outputName} onChange={setOutputName} extension="pdf" />
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
          {candidate && (
            <div className="flex gap-2">
              <button
                className="btn-secondary"
                onClick={async () => {
                  if (file) setPreview(new Uint8Array(await file.arrayBuffer()));
                }}
              >
                Review original
              </button>
              <button
                className="btn-secondary"
                onClick={() => setPreview(candidate)}
              >
                Review smaller PDF
              </button>
            </div>
          )}
          {busy && (
            <button
              className="btn-secondary"
              onClick={() => cancel.current?.abort()}
            >
              Cancel
            </button>
          )}
          {status && <p role="status">{status}</p>}
        </div>
      </fieldset>
      {preview && (
        <PdfPreview bytes={preview} onClose={() => setPreview(null)} />
      )}
    </section>
  );
}
