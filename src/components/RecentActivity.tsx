import { Link } from "react-router-dom";
import { History } from "lucide-react";
import type { ActivityEntry } from "../hooks/useRecentActivity";
import { TOOLS } from "../lib/tools";

function timeAgo(ts: number): string {
  const diffMin = Math.round((Date.now() - ts) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return `${Math.round(diffH / 24)}d ago`;
}

// Entries are metadata only (see useRecentActivity) — a filename and a
// timestamp, never the file itself, which is the deliberate trade-off
// that keeps the privacy pitch true for these tools. "Resume with your
// file" isn't on offer here; what this *can* honestly give you is a fast
// way back to the right tool, which is what each entry links to.
export function RecentActivity({
  entries,
  className = "mt-8",
  showTitle = true,
}: {
  entries: ActivityEntry[];
  className?: string;
  showTitle?: boolean;
}) {
  if (entries.length === 0) return null;
  return (
    <div className={`rounded-2xl border border-border bg-surface-2/50 p-4 ${className}`}>
      {showTitle && (
        <h3 className="flex items-center gap-2 font-display text-sm font-semibold text-muted">
          <History className="h-4 w-4" aria-hidden="true" />
          Recent on this device
        </h3>
      )}
      <ul className={`flex flex-col gap-1 text-sm ${showTitle ? "mt-2" : ""}`}>
        {entries.map((e) => {
          const tool = TOOLS.find((t) => t.to === `/${e.tool}`);
          const Icon = tool?.icon ?? History;
          return (
            <li key={e.id}>
              <Link
                to={tool?.to ?? "/"}
                className="flex items-center gap-2 rounded-lg px-1.5 py-1 text-fg transition-colors hover:bg-surface"
              >
                <Icon className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">{e.label}</span>
                <span className="shrink-0 text-xs text-muted">{timeAgo(e.timestamp)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-xs text-muted">
        Stored only on this device — filenames and times only, never the files themselves.
      </p>
    </div>
  );
}
