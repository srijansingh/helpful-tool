import { hasSessionDrafts } from "../hooks/useSessionState";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { ThemeToggle } from "../components/ThemeToggle";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { StatusMessage, type Status } from "../components/StatusMessage";
import { usePwaStore } from "../lib/pwa";
import { useDocumentStore } from "../store/useDocumentStore";
import {
  isTelemetryEnabled,
  setTelemetryEnabled,
  getTelemetryEvents,
  clearTelemetryEvents,
  summarizeTelemetry,
  type TelemetrySummary,
} from "../lib/telemetry";

function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

export default function SettingsPage() {
  const pwa = usePwaStore();
  const current = useDocumentStore((s) => s.current);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [confirmUpdate, setConfirmUpdate] = useState(false);
  const [telemetryOn, setTelemetryOn] = useState(isTelemetryEnabled);
  const [summary, setSummary] = useState<TelemetrySummary | null>(null);
  const [confirmClearUsage, setConfirmClearUsage] = useState(false);
  const refreshSummary = () =>
    getTelemetryEvents().then((events) => setSummary(summarizeTelemetry(events)));
  useEffect(() => {
    refreshSummary();
  }, []);
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
                setStatus({
                  kind: "error",
                  message: "Use your browser menu to install LocalPDF.",
                });
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
            onClick={() => setConfirmUpdate(true)}
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
      <div className="panel mt-4">
        <h2>Usage & diagnostics</h2>
        <p className="text-muted">
          Counts of which tools get opened, finished or hit an error — kept
          only on this device, never sent anywhere automatically. No
          filenames, file contents, or error text are recorded, only which
          tool and what happened. Export this if you want to share it with
          the team yourself.
        </p>
        <label className="mt-3 flex items-center gap-2">
          <input
            type="checkbox"
            checked={telemetryOn}
            onChange={(e) => {
              setTelemetryEnabled(e.target.checked);
              setTelemetryOn(e.target.checked);
            }}
          />
          Keep this usage log on this device
        </label>
        {telemetryOn && summary && summary.totalEvents > 0 && (
          <>
            {summary.timeToFirstSuccessMs !== null && (
              <p className="mt-3 text-sm">
                Time from first tool opened to first successful export:{" "}
                <strong>{formatDuration(summary.timeToFirstSuccessMs)}</strong>
              </p>
            )}
            <div className="mt-3 overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Tool</th>
                    <th>Opened</th>
                    <th>Finished</th>
                    <th>Completion</th>
                    <th>Errors</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.perTool.map((t) => (
                    <tr key={t.tool}>
                      <td>{t.tool}</td>
                      <td>{t.opened}</td>
                      <td>{t.completed}</td>
                      <td>
                        {t.completionRate === null
                          ? "—"
                          : `${Math.round(t.completionRate * 100)}%`}
                      </td>
                      <td>{t.errors}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        {telemetryOn && summary && summary.totalEvents === 0 && (
          <p className="mt-3 text-sm text-muted">
            No usage recorded yet — this fills in as you use the tools.
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            className="btn-secondary"
            disabled={!summary || summary.totalEvents === 0}
            onClick={async () => {
              const json = JSON.stringify(await getTelemetryEvents(), null, 2);
              const blob = new Blob([json], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "localpdf-usage.json";
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Export usage data
          </button>
          <button
            className="btn-secondary"
            disabled={!summary || summary.totalEvents === 0}
            onClick={() => setConfirmClearUsage(true)}
          >
            Clear usage data
          </button>
        </div>
      </div>
      <StatusMessage status={status} />
      <ConfirmDialog
        open={confirmUpdate}
        title="Reload to update?"
        description="Save any temporary work first. Updating reloads the app and clears temporary work."
        confirmLabel="Reload and update"
        danger={false}
        onConfirm={() => {
          setConfirmUpdate(false);
          void pwa.update();
        }}
        onCancel={() => setConfirmUpdate(false)}
      />
      <ConfirmDialog
        open={confirmClearUsage}
        title="Clear usage data?"
        description="Deletes the local usage log on this device. This can't be undone."
        confirmLabel="Clear usage data"
        danger
        onConfirm={() => {
          setConfirmClearUsage(false);
          clearTelemetryEvents().then(refreshSummary);
        }}
        onCancel={() => setConfirmClearUsage(false)}
      />
    </section>
  );
}
