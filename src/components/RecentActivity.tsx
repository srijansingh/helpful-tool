import { History } from "lucide-react";
import type { ActivityEntry } from "../hooks/useRecentActivity";

function timeAgo(ts: number): string {
  const diffMin = Math.round((Date.now() - ts) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return `${Math.round(diffH / 24)}d ago`;
}

export function RecentActivity({ entries, className = "mt-8" }: { entries: ActivityEntry[]; className?: string }) {
  if (entries.length === 0) return null;
  return (
    <div className={`rounded-2xl border border-border bg-surface-2/50 p-4 ${className}`}>
      <h3 className="flex items-center gap-2 font-display text-sm font-semibold text-muted">
        <History className="h-4 w-4" aria-hidden="true" />
        Recent on this device
      </h3>
      <ul className="mt-2 flex flex-col gap-1 text-sm">
        {entries.map((e) => (
          <li key={e.id} className="flex justify-between gap-3 text-fg">
            <span className="truncate">{e.label}</span>
            <span className="shrink-0 text-muted">{timeAgo(e.timestamp)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted">
        Stored only on this device — filenames and times only, never the files themselves.
      </p>
    </div>
  );
}
