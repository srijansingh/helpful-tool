import { useState } from "react";
import { Dropzone } from "../components/Dropzone";
import { useDocumentStore } from "../store/useDocumentStore";
import { buildBooklet } from "../lib/pdf/workerOperations";
import { PdfPreview } from "../components/PdfPreview";
import { downloadBytes } from "../lib/download";
export default function BookletPage() {
  const initial = useDocumentStore((s) => s.current);
  const [file, setFile] = useState<File | null>(initial);
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
          "Booklet PDF ready. Print at actual size, two-sided, flip on the short edge, then fold the sheets.",
        );
      } else setPreview(out);
    } catch (e) {
      setStatus((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section>
      <h1 className="text-2xl font-bold">Print a booklet</h1>
      <p className="mt-2 text-muted">
        Arrange pages on landscape sheets for folding. Blank pages are added to
        make a multiple of four.
      </p>
      <div className="mt-4">
        <Dropzone
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
      <p className="text-sm text-muted mt-3">
        Export includes page content and flattened interactive form fields.
        Other annotations, links and attachments are omitted. Check the preview
        before printing. Existing certificate signatures are not retained.
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
    </section>
  );
}
