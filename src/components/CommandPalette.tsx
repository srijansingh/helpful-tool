import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FolderOpen, Home, Search } from "lucide-react";
import { TOOLS } from "../lib/tools";
import { useCommandPaletteStore } from "../store/useCommandPaletteStore";
import { useScrollLock } from "../hooks/useScrollLock";

interface PaletteItem {
  id: string;
  label: string;
  description: string;
  icon: typeof Home;
  to: string;
}

const ITEMS: PaletteItem[] = [
  { id: "home", label: "Home", description: "Overview of every tool", icon: Home, to: "/" },
  ...TOOLS.map((t) => ({ id: t.to, label: t.label, description: t.description, icon: t.icon, to: t.to })),
  { id: "scans", label: "Scan Library", description: "Your saved scanned documents", icon: FolderOpen, to: "/scans" },
];

// A keyboard-first way to jump anywhere in the app — Cmd/Ctrl+K from any
// screen, or the search trigger in the sidebar. Enterprise apps with more
// than a handful of destinations lean on this rather than making people
// hunt through nav every time; this app only has a few tools today, but
// the pattern (and the muscle memory) matters more as it grows.
export function CommandPalette() {
  const open = useCommandPaletteStore((s) => s.open);
  const setOpen = useCommandPaletteStore((s) => s.setOpen);
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useScrollLock(open);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ITEMS;
    return ITEMS.filter(
      (item) => item.label.toLowerCase().includes(q) || item.description.toLowerCase().includes(q)
    );
  }, [query]);

  // The global Cmd/Ctrl+K shortcut — lives here since this component is
  // always mounted (in App.tsx), so it works from any screen.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        useCommandPaletteStore.getState().toggle();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIndex(0);
    // Let the dialog mount before focusing — otherwise the input isn't
    // in the DOM yet on the same tick the store flips `open`.
    requestAnimationFrame(() => inputRef.current?.focus());

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, setOpen]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const select = (item: PaletteItem) => {
    navigate(item.to);
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-bg/60 px-4 pt-[15vh] backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Jump to a tool…"
            aria-label="Search tools"
            className="flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-muted"
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setOpen(false);
              } else if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIndex((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                const item = filtered[activeIndex];
                if (item) select(item);
              }
            }}
          />
          <kbd className="hidden shrink-0 rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted sm:block">
            Esc
          </kbd>
        </div>

        <ul role="listbox" className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 && <li className="p-4 text-center text-sm text-muted">No matches.</li>}
          {filtered.map((item, i) => (
            <li key={item.id}>
              <button
                type="button"
                role="option"
                aria-selected={i === activeIndex}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => select(item)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                  i === activeIndex ? "bg-accent text-bg" : "text-fg"
                }`}
              >
                <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-sm font-semibold">{item.label}</span>
                  <span className={`block truncate text-xs ${i === activeIndex ? "text-bg/70" : "text-muted"}`}>
                    {item.description}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
