import { useNavigate } from "react-router-dom";
import { useDocumentStore } from "../store/useDocumentStore";
import { ResultActions } from "./ResultActions";
import { useDialogFocus } from "../hooks/useDialogFocus";
import { useRef } from "react";
export function ResultPanel() {
  const result = useDocumentStore((s) => s.result);
  const close = useDocumentStore((s) => s.dismissResult);
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  useDialogFocus(ref, !!result, close);
  if (!result) return null;
  return (
    <div className="sheet-overlay">
      <div
        ref={ref}
        className="bottom-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="result-title"
      >
        <div className="flex justify-between items-start gap-3">
          <h2 id="result-title" className="text-xl font-bold">
            Your file is ready
          </h2>
          <button
            className="btn-icon"
            aria-label="Close result"
            onClick={close}
          >
            ×
          </button>
        </div>
        <p className="mt-2 break-words">{result.file.name}</p>
        <p className="text-sm text-muted">
          Download started. You can share, save or keep editing.
        </p>
        {result.sources.length > 0 && (
          <p className="text-sm text-muted mt-2">
            Original{result.sources.length > 1 ? "s" : ""} retained for this
            session: {result.sources.map((f) => f.name).join(", ")}
          </p>
        )}
        <ResultActions file={result.file} />
        {result.sources.length === 1 && (
          <button
            className="btn-secondary mt-3"
            onClick={() => {
              useDocumentStore.getState().setCurrent(result.sources[0]);
              close();
              navigate("/document");
            }}
          >
            Return to original document
          </button>
        )}
        <button
          className="btn w-full mt-4"
          onClick={() => {
            close();
            navigate("/document");
          }}
        >
          {result.file.type === "application/pdf" ||
          result.file.type.startsWith("image/")
            ? "Continue with this document"
            : "Return to source document"}
        </button>
      </div>
    </div>
  );
}
