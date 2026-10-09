import { Component, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useDocumentStore } from "../store/useDocumentStore";
import { originalFile } from "../lib/pdf/preflight";
import { downloadBlob } from "../lib/download";
export class WorkspaceErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    const current = useDocumentStore.getState().current;
    return (
      <section role="alert">
        <h1 className="text-2xl font-bold">This workspace could not load</h1>
        <p className="mt-3 text-muted">
          Reconnect once if this tool has not been cached. Your current document
          remains in this session. Reloading clears temporary edits; download
          your original first.
        </p>
        <div className="flex flex-wrap gap-2 mt-4">
          {current && (
            <button
              className="btn"
              onClick={() => {
                const file = originalFile(current);
                downloadBlob(file, file.name, false);
              }}
            >
              Download original
            </button>
          )}
          <Link className="btn-secondary" to="/tools">
            Return to tools
          </Link>
          <button
            className="btn-secondary"
            onClick={() => window.location.reload()}
          >
            Reload app
          </button>
        </div>
      </section>
    );
  }
}
