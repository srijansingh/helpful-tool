import { Suspense } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { BottomTabBar } from "./components/BottomTabBar";
import { ThemeToggle } from "./components/ThemeToggle";
import { TrustBadge } from "./components/TrustBadge";
import { PageLoading } from "./components/PageLoading";
import { AdSlot } from "./components/AdSlot";

export default function App() {
  return (
    <div className="flex min-h-screen bg-bg text-fg">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile-only top bar — the sidebar carries the brand/theme/trust
            badge on larger screens, so this would be redundant there. */}
        <header className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:hidden">
          <div className="flex items-center justify-between">
            <NavLink to="/" className="font-display text-lg font-extrabold tracking-tight">
              Local<span className="text-accent">PDF</span>
            </NavLink>
            <ThemeToggle />
          </div>
          <TrustBadge />
        </header>

        <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-24 pt-6 sm:px-8 sm:pb-12 sm:pt-10">
          <AdSlot label="Ad space — leaderboard" />
          <Suspense fallback={<PageLoading />}>
            <Outlet />
          </Suspense>
        </main>

        <footer className="mx-auto hidden w-full max-w-3xl px-8 pb-10 text-xs text-muted sm:block">
          Every conversion runs locally in your browser — nothing is uploaded,
          no account needed, no file is stored anywhere.
        </footer>
      </div>

      <BottomTabBar />
    </div>
  );
}
