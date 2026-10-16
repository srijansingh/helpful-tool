import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { recordTelemetryEvent } from "../lib/telemetry";

export type Status =
  | { kind: "idle" }
  | { kind: "working"; message: string }
  | { kind: "done"; message: string }
  | { kind: "error"; message: string };

export function StatusMessage({ status }: { status: Status }) {
  // Every tool already renders its errors through this one component, so
  // it's the single lowest-friction place to count error occurrences
  // (never the message text itself — just that one happened, on which
  // tool) instead of adding a telemetry call to every catch block.
  const path = useLocation().pathname;
  useEffect(() => {
    if (status.kind === "error")
      recordTelemetryEvent(path.replace(/^\//, ""), "error");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  if (status.kind === "idle") return null;

  const styles = {
    working: "text-muted",
    done: "text-good",
    error: "text-bad",
  } as const;

  const Icon = status.kind === "working" ? Loader2 : status.kind === "done" ? CheckCircle2 : AlertCircle;

  return (
    <p
      role="status"
      aria-live="polite"
      className={`mt-3 flex items-center gap-2 text-sm ${styles[status.kind as "working" | "done" | "error"]}`}
    >
      <Icon className={`h-4 w-4 ${status.kind === "working" ? "animate-spin" : ""}`} aria-hidden="true" />
      {status.message}
    </p>
  );
}
