import { NavLink } from "react-router-dom";
import { Search, ChevronDown, ChevronsLeft, ChevronsRight } from "lucide-react";
import { DESTINATIONS } from "./BottomTabBar";
import { TOOLS, TOOL_GROUPS } from "../lib/tools";
import { TrustBadge } from "./TrustBadge";
import { ThemeToggle } from "./ThemeToggle";
import { Tooltip } from "./Tooltip";
import { useCommandPaletteStore } from "../store/useCommandPaletteStore";
import { useSidebarState } from "../hooks/useSidebarState";

const isMac =
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad/.test(navigator.platform ?? navigator.userAgent);

// Desktop/tablet app shell nav — a persistent rail, not a tab row that
// scrolls off. This is the single biggest thing that makes the page read
// as an application rather than a landing page with a tool embedded in it.
export function Sidebar() {
  const openPalette = useCommandPaletteStore((s) => s.setOpen);
  const { collapsed, setCollapsed, isGroupOpen, toggleGroup } = useSidebarState();

  const navLinkClass = (isActive: boolean) =>
    `relative flex items-center gap-3 rounded-xl font-semibold transition-colors ${
      collapsed ? "justify-center p-2.5" : "px-3 py-3 text-sm"
    } ${
      isActive
        ? "bg-accent text-white"
        : "text-muted hover:bg-surface-2 hover:text-fg"
    } ${isActive && !collapsed ? "before:absolute before:left-0 before:top-1/2 before:h-5 before:w-[3px] before:-translate-y-1/2 before:rounded-full before:bg-white/80 before:content-['']" : ""}`;

  return (
    <aside className="app-sidebar" data-collapsed={collapsed}>
      <div
        className={`flex items-center ${collapsed ? "flex-col gap-3" : "justify-between"}`}
      >
        {collapsed ? null : (
          <NavLink
            to="/"
            className="px-2 font-display text-lg font-extrabold tracking-tight"
          >
            Local<span className="text-accent">PDF</span>
          </NavLink>
        )}
        <Tooltip label={collapsed ? "Expand sidebar" : "Collapse sidebar"} side={collapsed ? "right" : "bottom"}>
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg"
          >
            {collapsed ? (
              <ChevronsRight className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ChevronsLeft className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </Tooltip>
      </div>

      {collapsed ? (
        <Tooltip label="Jump to… (⌘K)">
          <button
            type="button"
            onClick={() => openPalette(true)}
            aria-label="Jump to…"
            className="mt-5 flex h-9 w-9 items-center justify-center self-center rounded-lg border border-border bg-surface-2 text-muted hover:border-accent/60 hover:text-fg"
          >
            <Search className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </Tooltip>
      ) : (
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
      )}

      <nav aria-label="Main navigation" className="mt-4 space-y-1">
        {DESTINATIONS.map(({ to, label, icon: Icon }) => {
          const link = (
            <NavLink
              key={to}
              end={to === "/"}
              to={to}
              className={({ isActive }) => navLinkClass(isActive)}
            >
              <Icon size={18} aria-hidden="true" />
              {!collapsed && label}
            </NavLink>
          );
          return collapsed ? (
            <Tooltip key={to} label={label}>
              {link}
            </Tooltip>
          ) : (
            link
          );
        })}
      </nav>

      <nav className="mt-4 flex flex-col gap-1" aria-label="Tools">
        {TOOL_GROUPS.map((group) => {
          const open = isGroupOpen(group.name);
          return (
            <div key={group.name}>
              {collapsed ? (
                <div className="mt-3 border-t border-border/60 pt-3 first:mt-0 first:border-t-0 first:pt-0" />
              ) : (
                <button
                  type="button"
                  onClick={() => toggleGroup(group.name)}
                  aria-expanded={open}
                  className="flex w-full items-center justify-between rounded-lg px-3 pt-4 pb-2 text-xs font-semibold text-muted hover:text-fg"
                >
                  {group.name}
                  <ChevronDown
                    className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? "" : "-rotate-90"}`}
                    aria-hidden="true"
                  />
                </button>
              )}
              {(collapsed || open) &&
                group.paths
                  .filter((path) => path !== "/scan")
                  .map((path) => {
                    const tool = TOOLS.find((t) => t.to === path)!;
                    const Icon = tool.icon;
                    const link = (
                      <NavLink
                        key={path}
                        to={path}
                        className={({ isActive }) => navLinkClass(isActive)}
                      >
                        <Icon size={18} aria-hidden="true" />
                        {!collapsed && tool.label}
                      </NavLink>
                    );
                    return collapsed ? (
                      <Tooltip key={path} label={tool.label}>
                        {link}
                      </Tooltip>
                    ) : (
                      link
                    );
                  })}
            </div>
          );
        })}
      </nav>

      <div
        className={`mt-auto flex pt-8 ${collapsed ? "flex-col items-center gap-3" : "flex-col gap-4"}`}
      >
        {collapsed ? (
          <TrustBadge compact />
        ) : (
          <>
            <TrustBadge />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">Appearance</span>
              <ThemeToggle />
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
