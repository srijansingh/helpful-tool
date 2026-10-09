import { usePdfJobState } from "../lib/pdfJobs";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { UploadCloud } from "lucide-react";
import { validateFiles, friendlyError } from "../lib/importFiles";
import { useDocumentStore } from "../store/useDocumentStore";
interface Props {
  accept: string;
  multiple?: boolean;
  label: string;
  hint: string;
  onFiles: (files: File[]) => void | Promise<void>;
  disabled?: boolean;
}
export function Dropzone({
  accept,
  multiple = false,
  label,
  hint,
  onFiles,
  disabled = false,
}: Props) {
  const jobsBusy = usePdfJobState((s) => s.count > 0);
  disabled = disabled || jobsBusy;
  const input = useRef<HTMLInputElement>(null);
  const controller = useRef<AbortController | null>(null);
  const callback = useRef(onFiles);
  callback.current = onFiles;
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useDocumentStore((s) => s.pending);
  const current = useDocumentStore((s) => s.current);
  const location = useLocation();
  useEffect(() => () => controller.current?.abort(), []);
  const validate = async (files: File[]) => {
    if (disabled || controller.current) return;
    const job = new AbortController();
    controller.current = job;
    setBusy(true);
    setError("");
    try {
      const { originalFile } = await import("../lib/pdf/preflight");
      if (
        files.length > 100 ||
        files.reduce((n, f) => n + f.size, 0) > 50 * 1024 * 1024
      )
        throw new Error(
          "Choose at most 100 files and 50 MB per batch for reliable on-device processing.",
        );
      const valid = await validateFiles(
        files.map(originalFile),
        accept,
        multiple,
      );
      const prepared: File[] = [];
      for (const file of valid) {
        job.signal.throwIfAborted();
        // Security preserves the encrypted source for its explicit known-password operation.
        if (file.type.startsWith("image/"))
          await (await import("../lib/imageBudget")).prepareImage(file);
        prepared.push(
          file.type === "application/pdf" && location.pathname !== "/security"
            ? await (
                await import("../lib/pdf/preflight")
              ).preparePdf(file, location.pathname, job.signal)
            : file,
        );
      }
      job.signal.throwIfAborted();
      useDocumentStore.getState().setInputs(files.map(originalFile));
      if (prepared.length === 1)
        useDocumentStore.getState().setCurrent(prepared[0]);
      await callback.current(prepared);
    } catch (e) {
      if (!job.signal.aborted) setError(friendlyError(e));
    } finally {
      if (controller.current === job) {
        controller.current = null;
        if (!job.signal.aborted) setBusy(false);
      }
    }
  };
  useEffect(() => {
    if (pending?.path !== location.pathname) return;
    const file = pending.file;
    useDocumentStore.getState().clearPending();
    void validate([file]);
  }, [pending?.id, location.pathname]);
  const compatible =
    current &&
    (accept.includes(current.type) ||
      (accept.includes("image/*") && current.type.startsWith("image/")));
  return (
    <div>
      <div
        className="dropzone"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (!busy && !disabled)
            void validate(Array.from(e.dataTransfer.files));
        }}
      >
        <button
          className="w-full py-3 text-center"
          disabled={busy || disabled}
          onClick={() => input.current?.click()}
        >
          <UploadCloud className="mx-auto mb-2 text-accent" />
          <strong>
            {busy
              ? "Opening file…"
              : label.replace(
                  /^Drop.*here or click to browse$/,
                  accept.includes("image") ? "Choose files" : "Choose a PDF",
                )}
          </strong>
          <span className="block mt-2 text-sm text-muted">{hint}</span>
        </button>
        <input
          ref={input}
          type="file"
          accept={accept}
          multiple={multiple}
          hidden
          aria-label="Choose files"
          onChange={(e) => {
            void validate(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
      </div>
      {compatible && !pending && (
        <button
          className="btn-secondary w-full mt-2 truncate"
          disabled={busy || disabled}
          onClick={() => void validate([current])}
        >
          Use current: {current.name}
        </button>
      )}
      {busy && (
        <button
          className="btn-secondary mt-2"
          onClick={() => {
            controller.current?.abort();
            controller.current = null;
            setBusy(false);
            setError("Import cancelled. Your existing work is unchanged.");
          }}
        >
          Cancel import
        </button>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-bad">
          {error}
        </p>
      )}
    </div>
  );
}
