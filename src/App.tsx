import { Suspense } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { FileStack, Scissors, ImageIcon, Images } from "lucide-react";
import { ThemeToggle } from "./components/ThemeToggle";
import { PageLoading } from "./components/PageLoading";
import { AdSlot } from "./components/AdSlot";

const TOOLS = [
  { to: "/merge", label: "Merge PDFs", icon: FileStack },
  { to: "/split", label: "Split PDF", icon: Scissors },
  { to: "/images-to-pdf", label: "Images → PDF", icon: ImageIcon },
  { to: "/pdf-to-images", label: "PDF → Images", icon: Images },
];

export default function App() {
  return (
    <div className="min-h-screen bg-bg text-fg">
      <header className="mx-auto max-w-4xl px-4 pt-6 sm:pt-10">
        <div className="flex items-center justify-between gap-4">
          <NavLink to="/" className="font-display text-xl font-extrabold tracking-tight sm:text-2xl">
            PDF<span className="text-accent">Toolkit</span>
          </NavLink>
          <ThemeToggle />
        </div>
        <p className="mt-2 max-w-md text-sm text-muted sm:text-base">
          Merge, split and convert PDFs — entirely in your browser. Nothing is
          uploaded, no login needed.
        </p>
      </header>

      <nav className="mx-auto mt-6 flex max-w-4xl gap-2 overflow-x-auto px-4 pb-1 sm:mt-8" aria-label="Tools">
        {TOOLS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 font-display text-sm font-semibold transition-colors ${
                isActive
                  ? "border-accent bg-accent text-bg"
                  : "border-border bg-surface text-fg hover:border-accent/50"
              }`
            }
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>

      <main className="mx-auto max-w-4xl px-4 pb-16 pt-6">
        <AdSlot label="Ad space — leaderboard" />
        <Suspense fallback={<PageLoading />}>
          <Outlet />
        </Suspense>
      </main>

      <footer className="mx-auto max-w-4xl px-4 pb-10 text-center text-xs text-muted">
        Every conversion runs locally in your browser — nothing is uploaded,
        no account needed, no file is stored anywhere.
      </footer>
    </div>
  );
}
