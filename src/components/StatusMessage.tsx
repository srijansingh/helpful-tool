import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export type Status =
  | { kind: "idle" }
  | { kind: "working"; message: string }
  | { kind: "done"; message: string }
  | { kind: "error"; message: string };

export function StatusMessage({ status }: { status: Status }) {
  if (status.kind === "idle") return null;

  const styles = {
    working: "text-muted",
    done: "text-good",
    error: "text-bad",
  } as const;

  const Icon = status.kind === "working" ? Loader2 : status.kind === "done" ? CheckCircle2 : AlertCircle;

  return (
    <p className={`mt-3 flex items-center gap-2 text-sm ${styles[status.kind as "working" | "done" | "error"]}`}>
      <Icon className={`h-4 w-4 ${status.kind === "working" ? "animate-spin" : ""}`} aria-hidden="true" />
      {status.message}
    </p>
  );
}
