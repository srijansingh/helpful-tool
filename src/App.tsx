import { Suspense } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { BottomTabBar } from "./components/BottomTabBar";
import { ThemeToggle } from "./components/ThemeToggle";
import { TrustBadge } from "./components/TrustBadge";
import { PageLoading } from "./components/PageLoading";
import { ToastViewport } from "./components/ToastViewport";

export default function App() {
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
            <TrustBadge compact />
            <ThemeToggle />
          </div>
        </header>

        <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-24 pt-5 sm:px-8 sm:pb-12 sm:pt-8">
          <Suspense fallback={<PageLoading />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      <BottomTabBar />
      <ToastViewport />
    </div>
  );
}
