import { NavLink } from "react-router-dom";
import { TOOLS } from "../lib/tools";
import { TrustBadge } from "./TrustBadge";
import { ThemeToggle } from "./ThemeToggle";

// Desktop/tablet app shell nav — a persistent rail, not a tab row that
// scrolls off. This is the single biggest thing that makes the page read
// as an application rather than a landing page with a tool embedded in it.
export function Sidebar() {
  return (
    <aside className="hidden shrink-0 flex-col border-r border-border bg-surface px-4 py-6 sm:sticky sm:top-0 sm:flex sm:h-screen sm:w-56 sm:overflow-y-auto lg:w-64">
      <NavLink to="/" className="px-2 font-display text-lg font-extrabold tracking-tight">
        Local<span className="text-accent">PDF</span>
      </NavLink>

      <nav className="mt-8 flex flex-col gap-1" aria-label="Tools">
        {TOOLS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 font-display text-sm font-semibold transition-colors ${
                isActive
                  ? "bg-accent text-bg"
                  : "text-muted hover:bg-surface-2 hover:text-fg"
              }`
            }
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            {label}
          </NavLink>
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
