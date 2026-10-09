import { NavLink } from "react-router-dom";
import { TOOLS } from "../lib/tools";

// Native-app-style fixed bottom tab bar for mobile — replaces a
// horizontally scrolling pill row, which reads as a website control, not
// an app's primary navigation.
export function BottomTabBar() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-10 flex border-t border-border bg-surface sm:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="Tools"
    >
      {TOOLS.map(({ to, shortLabel, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition-colors ${
              isActive ? "text-accent" : "text-muted"
            }`
          }
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
          {shortLabel}
        </NavLink>
      ))}
    </nav>
  );
}
