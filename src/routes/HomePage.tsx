import { Link } from "react-router-dom";
import { ArrowRight, Infinity as InfinityIcon, Lock, Zap } from "lucide-react";
import { TOOLS } from "../lib/tools";
import { RecentActivity } from "../components/RecentActivity";
import { useSeo } from "../hooks/useSeo";
import { useRecentActivity } from "../hooks/useRecentActivity";

const PITCH = [
  { icon: Lock, text: "Nothing is ever uploaded" },
  { icon: InfinityIcon, text: "No daily limits, no account" },
  { icon: Zap, text: "Starts instantly, works offline" },
];

export default function HomePage() {
  useSeo(
    "LocalPDF — Free PDF Tools That Never Leave Your Device",
    "Merge, split, organize, scan, and convert PDFs entirely in your browser. No upload, no account, no daily limits."
  );

  const { entries } = useRecentActivity();

  return (
    <section>
      <div className="flex flex-col items-start gap-3">
        <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          Every PDF tool you need.
          <br />
          Nothing ever leaves your device.
        </h1>
        <p className="max-w-lg text-muted">
          Merge, split, organize, scan, and convert — all of it runs right here in your browser, not on a server
          somewhere else.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {PITCH.map(({ icon: Icon, text }) => (
          <div
            key={text}
            className="flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-3 py-1.5 text-xs font-semibold text-fg"
          >
            <Icon className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
            {text}
          </div>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map(({ to, label, description, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="group flex items-start gap-4 rounded-2xl border border-border bg-surface p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors hover:border-accent/60"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-base font-bold text-fg">{label}</h2>
              <p className="mt-0.5 text-sm text-muted">{description}</p>
            </div>
            <ArrowRight
              className="mt-2 h-4 w-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-accent"
              aria-hidden="true"
            />
          </Link>
        ))}
      </div>

      <RecentActivity entries={entries} />
    </section>
  );
}
