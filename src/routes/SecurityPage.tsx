import { useEffect, useRef, useState } from "react";
import { useDocumentStore } from "../store/useDocumentStore";
import { Dropzone } from "../components/Dropzone";
import { preparePdf, originalFile } from "../lib/pdf/preflight";
import { qpdfJob } from "../lib/pdf/qpdfJob";
import type { QpdfAction } from "../lib/pdf/qpdfOptions";
import { downloadBytes } from "../lib/download";
import { formatSize } from "../lib/formatSize";
export default function SecurityPage() {
  const file = useDocumentStore((s) => s.current);
  const [action, setAction] = useState<QpdfAction>("protect");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
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
      const name = file.name.replace(/\.pdf$/i, "") + `-${action}.pdf`;
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
          onFiles={(files) => useDocumentStore.getState().setCurrent(files[0])}
        />
      </div>
      <label className="field-label mt-4">
        Action
        <select
          className="field"
          disabled={busy}
          value={action}
          onChange={(e) => {
            setAction(e.target.value as QpdfAction);
            setPassword("");
            setConfirm("");
            setStatus("");
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
        <label className="field-label mt-4">
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
        <label className="field-label mt-4">
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
      <p className="text-sm text-muted mt-3">
        Optimization recompresses internal PDF streams; the size reduction
        varies. Rewriting a PDF invalidates existing certificate signatures.
      </p>
      <button
        className="btn mt-4"
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
          className="btn-secondary mt-3"
          onClick={() => controller.current?.abort()}
        >
          Cancel
        </button>
      )}
      <p role="status" className="mt-4">
        {status}
      </p>
    </section>
  );
}
