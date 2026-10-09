import { NavLink } from "react-router-dom";
import { Search } from "lucide-react";
import { DESTINATIONS } from "./BottomTabBar";
import { TOOLS, TOOL_GROUPS } from "../lib/tools";
import { TrustBadge } from "./TrustBadge";
import { ThemeToggle } from "./ThemeToggle";
import { useCommandPaletteStore } from "../store/useCommandPaletteStore";

const isMac =
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad/.test(navigator.platform ?? navigator.userAgent);

// Desktop/tablet app shell nav — a persistent rail, not a tab row that
// scrolls off. This is the single biggest thing that makes the page read
// as an application rather than a landing page with a tool embedded in it.
export function Sidebar() {
  const openPalette = useCommandPaletteStore((s) => s.setOpen);

  return (
    <aside className="app-sidebar">
      <NavLink
        to="/"
        className="px-2 font-display text-lg font-extrabold tracking-tight"
      >
        Local<span className="text-accent">PDF</span>
      </NavLink>

      <button
        type="button"
        onClick={() => openPalette(true)}
        className="mt-5 flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2 text-left text-sm text-muted transition-colors hover:border-accent/60 hover:text-fg"
      >
        <Search className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="flex-1">Jump to…</span>
        <kbd className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[10px]">
          {isMac ? "⌘K" : "Ctrl K"}
        </kbd>
      </button>

      <nav aria-label="Main navigation" className="mt-4 space-y-1">
        {DESTINATIONS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            end={to === "/"}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl p-3 font-semibold ${isActive ? "bg-accent text-white" : "text-muted"}`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
      <nav className="mt-4 flex flex-col gap-1" aria-label="Tools">
        {TOOL_GROUPS.map((group) => (
          <div key={group.name}>
            <h2 className="px-3 pt-4 pb-2 text-xs font-semibold text-muted">
              {group.name}
            </h2>
            {group.paths
              .filter((path) => path !== "/scan")
              .map((path) => {
                const tool = TOOLS.find((t) => t.to === path)!;
                const Icon = tool.icon;
                return (
                  <NavLink
                    key={path}
                    to={path}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold ${isActive ? "bg-accent text-white" : "text-muted hover:bg-surface-2 hover:text-fg"}`
                    }
                  >
                    <Icon size={18} aria-hidden="true" />
                    {tool.label}
                  </NavLink>
                );
              })}
          </div>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-4 pt-8">
        <TrustBadge />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted">Appearance</span>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
