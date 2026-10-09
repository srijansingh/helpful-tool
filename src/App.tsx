import {
  leavePdfWorkspace,
  cancelPdfJobs,
  usePdfJobState,
} from "./lib/pdfJobs";
import { hasSessionDrafts } from "./hooks/useSessionState";
import { useDocumentStore } from "./store/useDocumentStore";
import { Suspense, useEffect } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { TOOLS } from "./lib/tools";
import { Sidebar } from "./components/Sidebar";
import { BottomTabBar } from "./components/BottomTabBar";
import { PageLoading } from "./components/PageLoading";
import { ToastViewport } from "./components/ToastViewport";
import { CommandPalette } from "./components/CommandPalette";
import { DocumentGate } from "./components/DocumentGate";
import { ImportPrompt } from "./components/ImportPrompt";
import { ResultPanel } from "./components/ResultPanel";
export default function App() {
  const path = useLocation().pathname;
  const jobCount = usePdfJobState((s) => s.count);
  useEffect(() => {
    leavePdfWorkspace();
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [path]);
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => {
      if (useDocumentStore.getState().current || hasSessionDrafts()) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, []);
  const tool = TOOLS.find((t) => t.to === path);
  const focused = !!tool || path === "/reader";
  return (
    <div className="flex min-h-screen bg-bg text-fg">
      <Sidebar />
      <div className="min-w-0 flex-1">
        <header className="mobile-header">
          {focused ? (
            <>
              <NavLink
                to="/tools"
                className="task-back"
                aria-label="Back to tools"
              >
                <ArrowLeft size={20} />
              </NavLink>
              <span className="font-bold">
                {tool?.shortLabel ?? "Read PDF"}
              </span>
            </>
          ) : (
            <NavLink to="/" className="font-bold">
              Local<span className="text-accent">PDF</span>
            </NavLink>
          )}
          <span className="text-xs text-muted">Private. On your device.</span>
        </header>
        <a href="#workspace" className="skip-link">
          Skip to workspace
        </a>
        <main
          id="workspace"
          tabIndex={-1}
          className={`workspace ${focused ? "focused" : ""}`}
        >
          <Suspense fallback={<PageLoading />}>
            <DocumentGate>
              <Outlet />
            </DocumentGate>
          </Suspense>
        </main>
      </div>
      {!focused && <BottomTabBar />}
      {jobCount > 0 && (
        <div className="processing-banner" role="status">
          <span>Processing on your device…</span>
          <button className="btn-secondary" onClick={cancelPdfJobs}>
            Cancel processing
          </button>
        </div>
      )}
      <ToastViewport />
      <CommandPalette />
      <ResultPanel />
      <ImportPrompt />
    </div>
  );
}
