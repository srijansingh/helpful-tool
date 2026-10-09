import { NavLink } from "react-router-dom";
import { MoreHorizontal } from "lucide-react";
import { PRIMARY_MOBILE_TOOLS } from "../lib/tools";
import { useCommandPaletteStore } from "../store/useCommandPaletteStore";

// Native-app-style fixed bottom tab bar for mobile — replaces a
// horizontally scrolling pill row, which reads as a website control, not
// an app's primary navigation. Capped at the 4 most-used tools plus
// "More" (opens the command palette) rather than cramming every tool in,
// which stops scaling once there are more than a handful.
export function BottomTabBar() {
  const openPalette = useCommandPaletteStore((s) => s.setOpen);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-10 flex border-t border-border bg-surface sm:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="Tools"
    >
      {PRIMARY_MOBILE_TOOLS.map(({ to, shortLabel, icon: Icon }) => (
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
      <button
        type="button"
        onClick={() => openPalette(true)}
        className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-semibold text-muted transition-colors"
      >
        <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
        More
      </button>
    </nav>
  );
}
