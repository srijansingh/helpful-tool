import { bookletOrder } from "../lib/pdf/booklet";
import { PDFDocument } from "pdf-lib";
import { useEffect } from "react";
import { useState } from "react";
import { Dropzone } from "../components/Dropzone";
import { useDocumentStore } from "../store/useDocumentStore";
import { buildBooklet } from "../lib/pdf/workerOperations";
import { PdfPreview } from "../components/PdfPreview";
import { downloadBytes } from "../lib/download";
export default function BookletPage() {
  const initial = useDocumentStore((s) => s.current);
  const [file, setFile] = useState<File | null>(initial);
  const [count, setCount] = useState(0);
  useEffect(() => {
    let active = true;
    setCount(0);
    if (file?.type === "application/pdf")
      void file
        .arrayBuffer()
        .then((b) => PDFDocument.load(b))
        .then((d) => {
          if (active) setCount(d.getPageCount());
        })
        .catch(() => {});
    return () => {
      active = false;
    };
  }, [file]);
  const [paper, setPaper] = useState<"a4" | "letter">("a4");
  const [right, setRight] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [preview, setPreview] = useState<Uint8Array | null>(null);
  const build = async (exportFile: boolean) => {
    if (!file || busy) return;
    setBusy(true);
    try {
      const out = await buildBooklet(
        new Uint8Array(await file.arrayBuffer()),
        paper,
        right,
      );
      if (exportFile) {
        downloadBytes(
          out,
          file.name.replace(/\.pdf$/i, "") + "-booklet.pdf",
          "application/pdf",
        );
        setStatus(
          "Booklet PDF ready. Print a test sheet at actual size, two-sided, flip on the short edge. Check orientation, then print the remaining sheets and fold them.",
        );
      } else setPreview(out);
    } catch (e) {
      setStatus((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section aria-busy={busy}>
      <fieldset disabled={busy} className="contents">
        <h1 className="text-2xl font-bold">Print a booklet</h1>
        <p className="mt-2 text-muted">
          Arrange pages on landscape sheets for folding. Blank pages are added
          to make a multiple of four.
        </p>
        <div className="mt-4">
          <Dropzone
            disabled={busy}
            accept="application/pdf"
            label="Choose a PDF"
            hint={
              file?.type === "application/pdf"
                ? file.name
                : "Pages will be fitted to half a sheet"
            }
            onFiles={(f) => {
              setFile(f[0]);
              useDocumentStore.getState().setCurrent(f[0]);
            }}
          />
        </div>
        <label className="field-label mt-4">
          Paper
          <select
            className="field"
            value={paper}
            onChange={(e) => setPaper(e.target.value as typeof paper)}
          >
            <option value="a4">A4</option>
            <option value="letter">Letter</option>
          </select>
        </label>
        <label className="panel flex gap-2 mt-4">
          <input
            type="checkbox"
            checked={right}
            onChange={(e) => setRight(e.target.checked)}
          />
          Right-side binding
        </label>
        {count > 0 && (
          <details className="panel mt-3">
            <summary>
              Sheet plan · {Math.ceil(count / 4)} sheets ·{" "}
              {Math.ceil(count / 4) * 4 - count} blank pages
            </summary>
            <ol className="text-sm mt-3 space-y-2">
              {bookletOrder(count, right)
                .slice(0, 40)
                .map((pair, i) => (
                  <li key={i}>
                    Sheet {Math.floor(i / 2) + 1}, {i % 2 ? "back" : "front"}:{" "}
                    {pair
                      .map((n) => (n === null ? "blank" : `page ${n + 1}`))
                      .join(" | ")}
                  </li>
                ))}
            </ol>
            {Math.ceil(count / 2) > 40 && (
              <p>Preview the PDF for the remaining sheet sides.</p>
            )}
          </details>
        )}
        <p className="text-sm text-muted mt-3">
          Export includes page content and flattened interactive form fields.
          Other annotations, links and attachments are omitted. Check the
          preview before printing. Existing certificate signatures are not
          retained.
        </p>
        <button
          className="btn-secondary mt-4"
          disabled={busy || file?.type !== "application/pdf"}
          onClick={() => void build(false)}
        >
          Preview booklet
        </button>
        <button
          className="btn mt-4"
          data-primary-action
          disabled={busy || file?.type !== "application/pdf"}
          onClick={() => void build(true)}
        >
          {busy ? "Arranging pages…" : "Export booklet PDF"}
        </button>
        <p role="status" className="mt-3">
          {status}
        </p>
        {preview && (
          <PdfPreview bytes={preview} onClose={() => setPreview(null)} />
        )}
      </fieldset>
    </section>
  );
}
