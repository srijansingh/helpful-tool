import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Scan as ScanLine, FolderOpen, ArrowRight, ShieldCheck, Command, X } from "@phosphor-icons/react";
import { TOOLS } from "../lib/tools";
import { useDocumentStore } from "../store/useDocumentStore";
import { Dropzone } from "../components/Dropzone";
import { RecentActivity } from "../components/RecentActivity";
import { useRecentActivity } from "../hooks/useRecentActivity";
import { useSeo } from "../hooks/useSeo";

const ONBOARDING_KEY = "pdf-toolkit:onboarding-dismissed";
function readOnboardingDismissed(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_KEY) === "1";
  } catch {
    return false;
  }
}

export default function HomePage() {
  useSeo(
    "LocalPDF — your everyday document app",
    "Scan, edit, organize and share documents privately on your device.",
  );
  const current = useDocumentStore((s) => s.current);
  const navigate = useNavigate();
  const { entries } = useRecentActivity();
  const [showOnboarding, setShowOnboarding] = useState(
    () => !readOnboardingDismissed(),
  );
  const dismissOnboarding = () => {
    setShowOnboarding(false);
    try {
      localStorage.setItem(ONBOARDING_KEY, "1");
    } catch {
      // private browsing / blocked storage — dismissal just won't persist
    }
  };

  return (
    <section>
      <p className="eyebrow">YOUR EVERYDAY DOCUMENTS</p>
      <h1 className="text-3xl font-bold">What would you like to do?</h1>
      <p className="mt-2 text-muted">Scan, edit and share. All on your device.</p>
      <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-good">
        <ShieldCheck size={18} />
        100% on-device — nothing you open here is ever uploaded.
      </p>

      {showOnboarding && (
        <div className="panel mt-4 flex items-start gap-3">
          <Command
            size={18}
            className="mt-0.5 shrink-0 text-accent"
            aria-hidden="true"
          />
          <p className="flex-1 text-sm text-muted">
            New here? Open a file below to jump straight into merging,
            compressing, signing or any other tool.
            <span className="hidden sm:inline">
              {" "}
              Or press{" "}
              <kbd className="rounded border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-xs text-fg">
                Ctrl K
              </kbd>{" "}
              any time to jump straight to a tool by name.
            </span>
          </p>
          <button
            type="button"
            className="shrink-0 rounded-lg p-1 text-muted hover:bg-surface-2 hover:text-fg"
            aria-label="Dismiss"
            onClick={dismissOnboarding}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}

      <div className="mt-5">
        <Dropzone
          accept="application/pdf,image/*"
          label="Open a file"
          hint="Choose a PDF or photo — pick what to do with it next"
          multiple={false}
          onFiles={(files) => {
            useDocumentStore.getState().setCurrent(files[0]);
            dismissOnboarding();
            navigate("/document");
          }}
        />
      </div>

      {current && (
        <Link to="/document" className="session-card mt-4">
          <span className="min-w-0">
            <small>CONTINUE YOUR DOCUMENT</small>
            <strong className="block truncate">{current.name}</strong>
          </span>
          <ArrowRight />
        </Link>
      )}

      <div className="quick-actions">
        <Link to="/scan" className="secondary-tile">
          <ScanLine size={28} className="text-accent" />
          <strong>Scan a document</strong>
          <span>Camera or photos</span>
        </Link>
        <Link to="/files" className="secondary-tile">
          <FolderOpen size={28} className="text-accent" />
          <strong>My files</strong>
          <span>Saved on this device</span>
        </Link>
      </div>

      <h2 className="mt-6 text-lg font-bold">Quick tools</h2>
      <div className="tool-grid compact">
        {TOOLS.filter((t) =>
          ["/merge", "/split", "/images-to-pdf", "/watermark"].includes(t.to),
        ).map(({ to, label, icon: Icon }) => (
          <Link className="tool-tile" to={to} key={to}>
            <Icon className="text-accent" />
            <strong>{label}</strong>
          </Link>
        ))}
      </div>

      <RecentActivity entries={entries} className="mt-6" />
    </section>
  );
}
