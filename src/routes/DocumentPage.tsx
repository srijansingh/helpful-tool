import { preparePdf, originalFile, canCopyText } from "../lib/pdf/preflight";
import { friendlyError } from "../lib/importFiles";
import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDocumentStore } from "../store/useDocumentStore";
import { TOOLS } from "../lib/tools";
import { PdfPreview } from "../components/PdfPreview";
import { ResultActions } from "../components/ResultActions";
export default function DocumentPage() {
  const file = useDocumentStore((s) => s.current);
  const [preview, setPreview] = useState<Uint8Array | null>(null);
  const navigate = useNavigate();
  const controller = useRef<AbortController | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [allowCopy, setAllowCopy] = useState(true);
  useEffect(() => () => controller.current?.abort(), []);
  if (!file)
    return (
      <section>
        <h1 className="text-3xl font-bold">Open a document</h1>
        <p className="mt-3 text-muted">
          Choose a PDF or photo from Home or My files.
        </p>
        <Link className="btn mt-4" to="/">
          Open a file
        </Link>
      </section>
    );
  return (
    <section>
      <p className="eyebrow">CURRENT DOCUMENT · TEMPORARY UNTIL SAVED</p>
      <h1 className="text-2xl font-bold break-words">{file.name}</h1>
      {file.type.startsWith("image/") ? (
        <ImageView file={file} />
      ) : file.type === "application/pdf" ? (
        <button
          className="btn mt-4"
          disabled={busy}
          onClick={async () => {
            controller.current = new AbortController();
            setBusy(true);
            setError("");
            try {
              const ready = await preparePdf(
                file,
                "/document",
                controller.current.signal,
              );
              setAllowCopy(canCopyText(ready));
              setPreview(new Uint8Array(await ready.arrayBuffer()));
            } catch (e) {
              if (!controller.current.signal.aborted)
                setError(friendlyError(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          Read PDF
        </button>
      ) : (
        <p className="mt-4 text-muted">
          Download or share this file to open it in a compatible app.
        </p>
      )}
      {error && (
        <p role="alert" className="text-bad mt-3">
          {error}
        </p>
      )}
      <ResultActions file={originalFile(file)} />
      <h2 className="mt-6 text-lg font-bold">Continue with a tool</h2>
      <div className="tool-grid">
        {TOOLS.filter((t) =>
          file.type === "application/pdf"
            ? t.to !== "/images-to-pdf" && t.to !== "/scan" && t.to !== "/image"
            : file.type.startsWith("image/") &&
              (t.to === "/images-to-pdf" ||
                t.to === "/image" ||
                t.to === "/ocr"),
        ).map(({ to, label, icon: Icon }) => (
          <button
            className="tool-tile"
            key={to}
            onClick={() => {
              useDocumentStore.getState().continueTo(to, file);
              navigate(to);
            }}
          >
            <Icon />
            <strong>{label}</strong>
          </button>
        ))}
      </div>
      {preview && (
        <PdfPreview
          allowCopy={allowCopy}
          bytes={preview}
          onClose={() => setPreview(null)}
        />
      )}
    </section>
  );
}
function ImageView({ file }: { file: File }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return (
    <img
      className="mt-4 max-h-[50vh] rounded-xl object-contain"
      src={url}
      alt={file.name}
    />
  );
}
