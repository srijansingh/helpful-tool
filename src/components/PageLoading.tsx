import { Loader2 } from "lucide-react";

export function PageLoading() {
  return (
    <div className="flex items-center justify-center gap-2 py-24 text-muted">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
      Loading…
    </div>
  );
}
