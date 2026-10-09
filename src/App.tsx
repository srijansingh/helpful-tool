import { Suspense } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Search } from "lucide-react";
import { Sidebar } from "./components/Sidebar";
import { BottomTabBar } from "./components/BottomTabBar";
import { ThemeToggle } from "./components/ThemeToggle";
import { TrustBadge } from "./components/TrustBadge";
import { PageLoading } from "./components/PageLoading";
import { ToastViewport } from "./components/ToastViewport";
import { CommandPalette } from "./components/CommandPalette";
import { useCommandPaletteStore } from "./store/useCommandPaletteStore";

export default function App() {
  const openPalette = useCommandPaletteStore((s) => s.setOpen);

  return (
    <div className="flex min-h-screen bg-bg text-fg">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile-only top bar — a single compact row, like a native app's,
            not a second line of marketing copy on every screen. The sidebar
            carries the full brand/theme/trust badge on larger screens. */}
        <header className="flex items-center justify-between border-b border-border px-4 py-3 sm:hidden">
          <NavLink to="/" className="font-display text-base font-extrabold tracking-tight">
            Local<span className="text-accent">PDF</span>
          </NavLink>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openPalette(true)}
              aria-label="Jump to a tool"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface-2 text-muted"
            >
              <Search className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <TrustBadge compact />
            <ThemeToggle />
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-5 sm:px-8 sm:pb-12 sm:pt-8">
          <Suspense fallback={<PageLoading />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      <BottomTabBar />
      <ToastViewport />
      <CommandPalette />
    </div>
  );
}
