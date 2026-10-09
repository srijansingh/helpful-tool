import { useEffect, useRef, useState } from "react";
import { Dropzone } from "../components/Dropzone";
import { useDocumentStore } from "../store/useDocumentStore";
import {
  recognizeFile,
  prepareOcr,
  ocrTexts,
  type OcrLanguage,
} from "../lib/ocr";
import { downloadBytes, downloadBlob } from "../lib/download";
export default function OcrPage() {
  const file = useDocumentStore((s) => s.current);
  const [language, setLanguage] = useState<OcrLanguage>("eng");
  const [ranges, setRanges] = useState("");
  const [status, setStatus] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const run = async () => {
    if (!file || busy) return;
    setBusy(true);
    setText("");
    controller.current = new AbortController();
    try {
      const result = await recognizeFile(
        file,
        language,
        ranges,
        controller.current.signal,
        setStatus,
      );
      setText(result.text);
      downloadBytes(
        result.bytes,
        file.name.replace(/\.[^.]+$/, "") + "-searchable.pdf",
        "application/pdf",
      );
      const output = useDocumentStore.getState().current;
      if (output) ocrTexts.set(output, result.text);
      setStatus(
        "Searchable PDF ready. Check the extracted text for errors before using it.",
      );
    } catch (e) {
      setStatus((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section>
      <h1 className="text-2xl font-bold">Read text from scans</h1>
      <p className="mt-2 text-muted">
        Create a searchable PDF or copy text from a photo. Recognition runs on
        this device; accuracy depends on lighting and print quality.
      </p>
      <div className="mt-4">
        <Dropzone
          disabled={busy}
          accept="application/pdf,image/*"
          label="Choose a scan or photo"
          hint={file?.name || "PDF or image"}
          onFiles={(files) => useDocumentStore.getState().setCurrent(files[0])}
        />
      </div>
      <div className="editor-options">
        <label className="field-label">
          Language
          <select
            className="field"
            value={language}
            disabled={busy}
            onChange={(e) => setLanguage(e.target.value as OcrLanguage)}
          >
            <option value="eng">English</option>
            <option value="eng+hin">English + Hindi</option>
          </select>
        </label>
        <label className="field-label">
          PDF pages (up to 20; blank = all)
          <input
            className="field"
            placeholder="1, 3-5"
            disabled={busy}
            value={ranges}
            onChange={(e) => setRanges(e.target.value)}
          />
        </label>
      </div>
      <button
        className="btn-secondary"
        disabled={busy}
        onClick={async () => {
          controller.current = null;
          setBusy(true);
          try {
            await prepareOcr(language, setStatus);
          } catch (e) {
            setStatus((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        Download OCR for offline use
      </button>
      <p className="text-sm text-muted mt-2">
        Initial OCR files are about 13 MB plus language data. This optional
        download makes them available offline after the app service worker is
        active.
      </p>
      <button
        className="btn mt-4"
        data-primary-action
        disabled={
          !file ||
          (!file.type.startsWith("image/") &&
            file.type !== "application/pdf") ||
          busy
        }
        onClick={() => void run()}
      >
        {busy ? "Working…" : "Recognize text & export PDF"}
      </button>
      {busy && controller.current && (
        <button
          className="btn-secondary mt-3"
          onClick={() => controller.current?.abort()}
        >
          Cancel OCR
        </button>
      )}
      <p className="mt-3" role="status">
        {status}
      </p>
      {text && (
        <div className="panel mt-4">
          <h2 className="font-bold">Review extracted text</h2>
          <textarea
            className="field mt-3 min-h-48"
            aria-label="Extracted text"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="editor-options">
            <button
              className="btn-secondary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(text);
                  setStatus("Text copied.");
                } catch {
                  setStatus("Select and copy the text from the box.");
                }
              }}
            >
              Copy text
            </button>
            <button
              className="btn-secondary"
              onClick={() =>
                downloadBlob(
                  new Blob([text], { type: "text/plain" }),
                  "extracted-text.txt",
                  false,
                )
              }
            >
              Download text
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
