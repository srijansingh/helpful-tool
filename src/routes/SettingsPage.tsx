import { hasSessionDrafts } from "../hooks/useSessionState";
import { Link } from "react-router-dom";
import { useState } from "react";
import { ThemeToggle } from "../components/ThemeToggle";
import { usePwaStore } from "../lib/pwa";
import { useDocumentStore } from "../store/useDocumentStore";
export default function SettingsPage() {
  const pwa = usePwaStore();
  const current = useDocumentStore((s) => s.current);
  const [error, setError] = useState("");
  return (
    <section>
      <h1 className="text-3xl font-bold">Settings</h1>
      <div className="panel mt-5">
        <h2>Appearance</h2>
        <p className="text-muted mb-3">Follow your device or choose a theme.</p>
        <ThemeToggle />
      </div>
      <div className="panel mt-4">
        <h2>Install LocalPDF</h2>
        <p className="text-muted">
          Keep your document tools on your home screen.
        </p>
        {pwa.install ? (
          <button
            className="btn mt-3"
            onClick={async () => {
              try {
                await pwa.install?.prompt();
                usePwaStore.setState({ install: null });
              } catch {
                setError("Use your browser menu to install LocalPDF.");
              }
            }}
          >
            Install app
          </button>
        ) : (
          <p className="mt-3 text-sm">
            On iPhone: open in Safari, tap Share, then Add to Home Screen. On
            Android: open the browser menu and choose Install app or Add to Home
            screen.
          </p>
        )}
        <p className="mt-3 text-sm" role="status">
          {pwa.offlineReady
            ? "The app and PDF processing assets are cached for offline use in this browser."
            : "Visit online once to download the app tools. Offline processing assets are cached after installation."}
        </p>
        <p className="text-sm text-muted mt-3">
          OCR language files need a separate download.{" "}
          <Link to="/ocr" className="text-accent underline">
            Prepare OCR offline
          </Link>
          . Browser storage can be evicted; test an important task offline
          before travelling.
        </p>
        <p className="text-sm text-muted">
          {pwa.online
            ? "You are online."
            : "You are offline. Cached tools remain available."}
        </p>
      </div>
      {pwa.updateReady && (
        <div className="panel mt-4">
          <h2>Update available</h2>
          <p className="text-muted">
            {current || hasSessionDrafts()
              ? "Save or download your current document first. Updating reloads the app and clears temporary work."
              : "Install the latest version when you are ready."}
          </p>
          <button
            className="btn mt-3"
            onClick={() => {
              if (
                window.confirm(
                  "Reload to update? Save any temporary work first.",
                )
              )
                void pwa.update();
            }}
          >
            Reload and update
          </button>
        </div>
      )}
      <div className="panel mt-4">
        <h2>Privacy & storage</h2>
        <p className="text-muted">
          Documents are processed on this device. Files are saved only when you
          choose Save on device. Browser storage can be cleared by the browser
          or operating system, so export important files as a backup.
        </p>
      </div>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
