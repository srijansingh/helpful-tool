import { editImage } from "../lib/editImage";
import { useSessionState } from "../hooks/useSessionState";
import { sourceKey } from "../lib/sourceKey";
import { useEffect, useState } from "react";
import { useDocumentStore } from "../store/useDocumentStore";
import { Dropzone } from "../components/Dropzone";
import { FilenameInput } from "../components/FilenameInput";
import { StatusMessage, type Status } from "../components/StatusMessage";
import { downloadBlob } from "../lib/download";
import { friendlyError } from "../lib/importFiles";
import { formatSize } from "../lib/formatSize";
import { useRecentActivity } from "../hooks/useRecentActivity";
export default function ImagePage() {
  const initial = useDocumentStore((s) => s.current);
  const [file, setFile] = useState<File | null>(initial);
  const [url, setUrl] = useState("");
  const scope = `image:${file ? sourceKey(file) : "empty"}`;
  const [rotation, setRotation] = useSessionState(scope, "rotation", 0);
  const [width, setWidth] = useSessionState(scope, "width", 1600);
  const [crop, setCrop] = useSessionState(scope, "crop", 0);
  const [quality, setQuality] = useSessionState(scope, "quality", 0.85);
  const [format, setFormat] = useSessionState(scope, "format", "image/jpeg");
  const [outputName, setOutputName] = useState(
    initial ? initial.name.replace(/\.[^.]+$/, "") + "-edited" : "",
  );
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewBusy, setPreviewBusy] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [busy, setBusy] = useState(false);
  const { logActivity } = useRecentActivity();
  const extension = format.split("/")[1].replace("jpeg", "jpg");
  useEffect(() => {
    setStatus({ kind: "idle" });
    if (!file?.type.startsWith("image/")) return;
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  useEffect(() => {
    if (!file?.type.startsWith("image/")) return;
    let active = true;
    let objectUrl = "";
    setPreviewUrl("");
    setPreviewBusy(true);
    const timer = setTimeout(() => {
      void editImage(file, { rotation, width, crop, quality, format }, true)
        .then((blob) => {
          if (!active) return;
          objectUrl = URL.createObjectURL(blob);
          setPreviewUrl(objectUrl);
          setStatus({ kind: "idle" });
        })
        .catch((e) => {
          if (active) setStatus({ kind: "error", message: friendlyError(e) });
        })
        .finally(() => {
          if (active) setPreviewBusy(false);
        });
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file, rotation, width, crop, quality, format]);
  const build = async () => {
    if (!file || busy) return;
    setBusy(true);
    setStatus({ kind: "working", message: "Processing…" });
    try {
      const out = await editImage(file, {
        rotation,
        width,
        crop,
        quality,
        format,
      });
      const ext = out.type.split("/")[1].replace("jpeg", "jpg");
      const name = `${outputName.trim() || file.name.replace(/\.[^.]+$/, "") + "-edited"}.${ext}`;
      downloadBlob(out, name);
      setStatus({
        kind: "done",
        message: `${name} ready. Original ${formatSize(file.size)} → result ${formatSize(out.size)}.`,
      });
      logActivity({ tool: "image", label: `Edited ${file.name} into ${name}` });
    } catch (e) {
      setStatus({ kind: "error", message: friendlyError(e) });
    } finally {
      setBusy(false);
    }
  };
  return (
    <section aria-busy={busy}>
      <fieldset disabled={busy} className="contents">
        <h1 className="text-2xl font-bold">Edit & compress image</h1>
        <p className="text-muted mt-2">
          Crop edges, rotate, resize and convert. Your original image stays on
          your device.
        </p>
        <div className="mt-4">
          <Dropzone
            disabled={busy}
            accept="image/*"
            label="Choose a photo"
            hint={
              file?.type.startsWith("image/")
                ? file.name
                : "JPG, PNG, WebP, GIF or BMP"
            }
            onFiles={(f) => {
              setFile(f[0]);
              useDocumentStore.getState().setCurrent(f[0]);
              setOutputName(f[0].name.replace(/\.[^.]+$/, "") + "-edited");
            }}
          />
        </div>
        {url && file?.type.startsWith("image/") && (
          <>
            <img
              className="mt-4 max-h-[40vh] mx-auto object-contain"
              src={previewUrl || url}
              alt={previewUrl ? "Edited image preview" : "Original image"}
            />
            <p className="text-sm text-muted text-center" role="status">
              {previewBusy
                ? "Updating preview…"
                : "Edited preview · export uses your selected full resolution"}
            </p>
            <div className="tool-form mt-4">
              <div className="editor-options" style={{ margin: 0 }}>
                <label className="field-label">
                  Rotation
                  <select
                    className="field"
                    value={rotation}
                    onChange={(e) => setRotation(Number(e.target.value))}
                  >
                    {[0, 90, 180, 270].map((r) => (
                      <option key={r} value={r}>
                        {r}°
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field-label">
                  Trim each edge (%)
                  <input
                    className="field"
                    type="number"
                    min="0"
                    max="40"
                    value={crop}
                    onChange={(e) =>
                      setCrop(Math.max(0, Math.min(40, Number(e.target.value))))
                    }
                  />
                </label>
                <label className="field-label">
                  Maximum width (px)
                  <input
                    className="field"
                    type="number"
                    min="100"
                    max="6000"
                    value={width}
                    onChange={(e) =>
                      setWidth(
                        Math.max(
                          100,
                          Math.min(6000, Number(e.target.value) || 1600),
                        ),
                      )
                    }
                  />
                </label>
                <label className="field-label">
                  Format
                  <select
                    className="field"
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                  >
                    <option value="image/jpeg">JPEG</option>
                    <option value="image/png">PNG (lossless)</option>
                    <option value="image/webp">WebP</option>
                  </select>
                </label>
                <label className="field-label">
                  Quality
                  <input
                    type="range"
                    min="0.2"
                    max="1"
                    step="0.05"
                    value={quality}
                    onChange={(e) => setQuality(Number(e.target.value))}
                  />
                </label>
              </div>
              <FilenameInput
                value={outputName}
                onChange={setOutputName}
                extension={extension}
              />
              <button
                className="btn"
                data-primary-action
                disabled={busy || previewBusy || !previewUrl}
                onClick={() => void build()}
              >
                {busy ? "Processing…" : "Export image"}
              </button>
              <StatusMessage status={status} />
            </div>
          </>
        )}
      </fieldset>
    </section>
  );
}
