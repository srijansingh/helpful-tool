import { sourceKey } from "../lib/sourceKey";
import { useNavigate, useLocation } from "react-router-dom";
import { useDocumentStore } from "../store/useDocumentStore";
import { ResultActions } from "./ResultActions";
import { useDialogFocus } from "../hooks/useDialogFocus";
import { useEffect, useRef, useState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import {
  shouldAskFeedback,
  markFeedbackAsked,
  recordTelemetryEvent,
} from "../lib/telemetry";
export function ResultPanel() {
  const result = useDocumentStore((s) => s.result);
  const close = useDocumentStore((s) => s.dismissResult);
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  useDialogFocus(ref, !!result, close);
  // Derived from the route rather than threaded through downloadBytes'
  // many call sites — every tool's completion already lands here, on
  // its own page, so the current path is the tool.
  const tool = useLocation().pathname.replace(/^\//, "");
  const [feedback, setFeedback] = useState<"ask" | "answered" | "skip">("skip");
  useEffect(() => {
    if (!result) return;
    if (shouldAskFeedback(tool)) {
      markFeedbackAsked(tool);
      setFeedback("ask");
    } else {
      setFeedback("skip");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result?.id]);
  if (!result) return null;
  const answerFeedback = (value: "easy" | "hard") => {
    recordTelemetryEvent(tool, "feedback", value);
    setFeedback("answered");
  };
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
        {feedback === "ask" && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2">
            <p className="flex-1 text-sm">Was that easy?</p>
            <button
              type="button"
              aria-label="Yes, that was easy"
              onClick={() => answerFeedback("easy")}
              className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-good"
            >
              <ThumbsUp className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="No, that was not easy"
              onClick={() => answerFeedback("hard")}
              className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-bad"
            >
              <ThumbsDown className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}
        {feedback === "answered" && (
          <p className="mt-3 text-sm text-muted">Thanks for the feedback.</p>
        )}
        <ResultActions key={sourceKey(result.file)} file={result.file} />
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
