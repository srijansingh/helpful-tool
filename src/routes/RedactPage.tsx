import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Dropzone } from "../components/Dropzone";
import { PdfReader } from "../components/PdfReader";
import { PdfPreview } from "../components/PdfPreview";
import { useDocumentStore } from "../store/useDocumentStore";
import { redactPdf, type RedactionBox } from "../lib/pdf/redact";
import { downloadBytes } from "../lib/download";
export default function RedactPage() {
  const current = useDocumentStore((s) => s.current);
  const [file, setFile] = useState<File | null>(
    current?.type === "application/pdf" ? current : null,
  );
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [boxes, setBoxes] = useState<RedactionBox[]>([]);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [preview, setPreview] = useState<Uint8Array | null>(null);
  const start = useRef<[number, number] | null>(null);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    let active = true;
    setBytes(null);
    setBoxes([]);
    setPage(1);
    if (file)
      file
        .arrayBuffer()
        .then((b) => {
          if (active) setBytes(new Uint8Array(b));
        })
        .catch((e) => setStatus(e.message));
    return () => {
      active = false;
    };
  }, [file]);
  const point = (e: PointerEvent<SVGSVGElement>): [number, number] => {
    const r = e.currentTarget.getBoundingClientRect();
    return [
      Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
      Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)),
    ];
  };
  const up = (e: PointerEvent<SVGSVGElement>) => {
    if (!start.current) return;
    const [x, y] = point(e),
      [sx, sy] = start.current;
    start.current = null;
    if (Math.abs(x - sx) < 0.003 || Math.abs(y - sy) < 0.003) return;
    setBoxes((b) => [
      ...b,
      {
        id: crypto.randomUUID(),
        page,
        x: Math.min(x, sx),
        y: Math.min(y, sy),
        width: Math.abs(x - sx),
        height: Math.abs(y - sy),
      },
    ]);
  };
  const build = async (download: boolean) => {
    if (!file || busy || !accepted) return;
    setBusy(true);
    controller.current = new AbortController();
    try {
      const out = await redactPdf(
        file,
        boxes,
        controller.current.signal,
        setStatus,
      );
      if (download) {
        downloadBytes(
          out,
          file.name.replace(/\.pdf$/i, "") + "-redacted.pdf",
          "application/pdf",
        );
        setStatus(
          "New redacted PDF created. Inspect all pages and share only this new file.",
        );
      } else {
        setPreview(out);
        setStatus("Preview the rebuilt output before export.");
      }
    } catch (e) {
      setStatus(
        controller.current?.signal.aborted
          ? "Cancelled. Original file is unchanged."
          : (e as Error).message,
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <section>
      <h1 className="text-2xl font-bold">Redact to a photo PDF</h1>
      <p className="text-muted mt-2">
        Black out areas and rebuild every page from pixels. Marked pixels,
        original text layers, attachments, forms, links and document metadata
        are excluded from the new file.
      </p>
      <div className="mt-4">
        <Dropzone
          disabled={busy}
          accept="application/pdf"
          label="Choose a PDF to redact"
          hint={file?.name || "Original file stays on your device"}
          onFiles={(files) => {
            setFile(files[0]);
            setAccepted(false);
          }}
        />
      </div>
      {bytes && (
        <>
          <p className="mt-3 text-sm">
            Drag a rectangle around each sensitive area. Review every page.
            Redaction marks below are a preview; export rebuilds the actual
            file.
          </p>
          <PdfReader
            bytes={bytes}
            page={page}
            onPage={setPage}
            overlay={
              <svg
                className="pdf-overlay"
                viewBox="0 0 1000 1000"
                preserveAspectRatio="none"
                aria-label="Redaction canvas"
                onPointerDown={(e) => {
                  if (busy) return;
                  e.currentTarget.setPointerCapture(e.pointerId);
                  start.current = point(e);
                }}
                onPointerUp={up}
                onPointerCancel={() => {
                  start.current = null;
                }}
              >
                {boxes
                  .filter((b) => b.page === page)
                  .map((b) => (
                    <rect
                      key={b.id}
                      x={b.x * 1000}
                      y={b.y * 1000}
                      width={b.width * 1000}
                      height={b.height * 1000}
                      fill="black"
                    />
                  ))}
              </svg>
            }
          />
          <div className="editor-options">
            <button
              className="btn-secondary"
              disabled={!boxes.length || busy}
              onClick={() => setBoxes(boxes.slice(0, -1))}
            >
              Undo last area
            </button>
            <button
              className="btn-secondary"
              disabled={!boxes.length || busy}
              onClick={() => setBoxes([])}
            >
              Clear marked areas
            </button>
          </div>
          <details className="panel">
            <summary>Mark area by percentage (keyboard alternative)</summary>
            <NumericArea page={page} onAdd={(b) => setBoxes([...boxes, b])} />
          </details>
          <label className="panel flex gap-2 mt-4">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
            />
            I accept a photo PDF with no selectable text or interactive
            features. I have checked the areas to remove.
          </label>
          <button
            className="btn-secondary mt-4"
            disabled={!boxes.length || !accepted || busy}
            onClick={() => void build(false)}
          >
            Preview rebuilt PDF
          </button>
          <button
            className="btn mt-4"
            data-primary-action
            disabled={!boxes.length || !accepted || busy}
            onClick={() => void build(true)}
          >
            {busy ? "Rebuilding…" : "Export redacted PDF"}
          </button>
          {busy && (
            <button
              className="btn-secondary mt-3"
              onClick={() => controller.current?.abort()}
            >
              Cancel
            </button>
          )}
          <p className="text-sm text-muted mt-3">
            The original and any older saved copies remain on your device. This
            tool does not delete them. Output is limited to 144 dpi or 2600
            pixels per edge; redacting tiny text may require a larger marked
            area.
          </p>
        </>
      )}
      <p role="status" className="mt-3">
        {status}
      </p>
      {preview && (
        <PdfPreview bytes={preview} onClose={() => setPreview(null)} />
      )}
    </section>
  );
}
function NumericArea({
  page,
  onAdd,
}: {
  page: number;
  onAdd: (b: RedactionBox) => void;
}) {
  const [values, setValues] = useState([10, 10, 40, 10]);
  return (
    <div className="editor-options">
      {["Left %", "Top %", "Width %", "Height %"].map((label, i) => (
        <label className="field-label" key={label}>
          {label}
          <input
            className="field"
            type="number"
            min="0"
            max="100"
            value={values[i]}
            onChange={(e) =>
              setValues(
                values.map((n, j) =>
                  j === i
                    ? Math.max(0, Math.min(100, Number(e.target.value)))
                    : n,
                ),
              )
            }
          />
        </label>
      ))}
      <button
        className="btn-secondary"
        disabled={
          values[2] <= 0 ||
          values[3] <= 0 ||
          values[0] + values[2] > 100 ||
          values[1] + values[3] > 100
        }
        onClick={() =>
          onAdd({
            id: crypto.randomUUID(),
            page,
            x: values[0] / 100,
            y: values[1] / 100,
            width: values[2] / 100,
            height: values[3] / 100,
          })
        }
      >
        Add area to this page
      </button>
    </div>
  );
}
