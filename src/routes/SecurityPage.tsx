import { useEffect, useRef, useState } from "react";
import { useDocumentStore } from "../store/useDocumentStore";
import { Dropzone } from "../components/Dropzone";
import { FilenameInput } from "../components/FilenameInput";
import { preparePdf, originalFile } from "../lib/pdf/preflight";
import { qpdfJob } from "../lib/pdf/qpdfJob";
import type { QpdfAction } from "../lib/pdf/qpdfOptions";
import { downloadBytes } from "../lib/download";
import { formatSize } from "../lib/formatSize";
import { useRecentActivity } from "../hooks/useRecentActivity";
export default function SecurityPage() {
  const file = useDocumentStore((s) => s.current);
  const [action, setAction] = useState<QpdfAction>("protect");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [outputName, setOutputName] = useState("");
  const { logActivity } = useRecentActivity();
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const run = async () => {
    if (!file || busy) return;
    if (action === "protect" && (password.length < 8 || password !== confirm)) {
      setStatus("Use at least 8 characters and confirm the same password.");
      return;
    }
    setBusy(true);
    controller.current = new AbortController();
    try {
      const source = originalFile(file);
      const prepared = await preparePdf(
        source,
        "/security",
        controller.current.signal,
        action === "unlock" ? password : "",
      );
      const result = await qpdfJob(
        prepared,
        action,
        action === "unlock" ? "" : password,
        controller.current.signal,
        setStatus,
      );
      setPassword("");
      setConfirm("");
      const defaultName = file.name.replace(/\.pdf$/i, "") + `-${action}`;
      const name = `${outputName.trim() || defaultName}.pdf`;
      if (action === "optimize" && result.bytes.length >= file.size) {
        setStatus(
          `The original (${formatSize(file.size)}) is already smaller than the optimized result (${formatSize(result.bytes.length)}). Keep your original.`,
        );
        return;
      }
      downloadBytes(result.bytes, name, "application/pdf");
      setStatus(
        `${name} ready (${formatSize(result.bytes.length)}). ${result.warning}`,
      );
      logActivity({
        tool: "security",
        label: `${action === "protect" ? "Protected" : action === "unlock" ? "Unlocked" : "Optimized"} ${file.name} into ${name}`,
      });
    } catch (e) {
      setStatus((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section>
      <h1 className="text-2xl font-bold">Protect & optimize PDF</h1>
      <p className="text-muted mt-2">
        Passwords and files stay on this device. Keep a separate original and
        remember the password you choose.
      </p>
      <div className="mt-4">
        <Dropzone
          disabled={busy}
          accept="application/pdf"
          label="Choose a PDF"
          hint={file?.type === "application/pdf" ? file.name : "Up to 50 MB"}
          onFiles={(files) => {
            useDocumentStore.getState().setCurrent(files[0]);
            setOutputName(files[0].name.replace(/\.pdf$/i, "") + `-${action}`);
          }}
        />
      </div>
      <div className="tool-form mt-4">
        <label className="field-label">
          Action
          <select
            className="field"
            disabled={busy}
            value={action}
            onChange={(e) => {
              const next = e.target.value as QpdfAction;
              setAction(next);
              setPassword("");
              setConfirm("");
              setStatus("");
              if (file) setOutputName(file.name.replace(/\.pdf$/i, "") + `-${next}`);
            }}
          >
            <option value="protect">Add password · AES-256</option>
            <option value="unlock">
              Remove password · known password required
            </option>
            <option value="optimize">
              Optimize PDF · preserve text and page quality
            </option>
          </select>
        </label>
        {(action === "protect" || action === "unlock") && (
          <label className="field-label">
            {action === "protect" ? "New password" : "Known document password"}
            <input
              className="field"
              type="password"
              autoComplete="off"
              disabled={busy}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
        )}
        {action === "protect" && (
          <label className="field-label">
            Confirm new password
            <input
              className="field"
              type="password"
              autoComplete="off"
              disabled={busy}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </label>
        )}
        <p className="text-sm text-muted">
          Optimization recompresses internal PDF streams; the size reduction
          varies. Rewriting a PDF invalidates existing certificate signatures.
        </p>
        <FilenameInput value={outputName} onChange={setOutputName} extension="pdf" />
        <div className="flex flex-wrap gap-3">
          <button
            className="btn"
            data-primary-action
            disabled={busy || file?.type !== "application/pdf"}
            onClick={() => void run()}
          >
            {busy
              ? "Working…"
              : action === "protect"
                ? "Protect PDF"
                : action === "unlock"
                  ? "Remove password"
                  : "Optimize PDF"}
          </button>
          {busy && (
            <button
              className="btn-secondary"
              onClick={() => controller.current?.abort()}
            >
              Cancel
            </button>
          )}
        </div>
        {status && (
          <p role="status">{status}</p>
        )}
      </div>
    </section>
  );
}
