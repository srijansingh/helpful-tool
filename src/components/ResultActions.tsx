import { useEffect, useState } from "react";
import { saveDocument } from "../lib/library";
import { friendlyError } from "../lib/importFiles";
export function ResultActions({ file }: { file: File }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const canShare =
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [file] });
  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-2">
        {canShare && (
          <button
            className="btn"
            onClick={async () => {
              try {
                await navigator.share({ files: [file], title: file.name });
              } catch (e) {
                if (!(e instanceof DOMException && e.name === "AbortError"))
                  setMessage(friendlyError(e));
              }
            }}
          >
            Share
          </button>
        )}
        <a
          className="btn-secondary"
          href={url || undefined}
          download={file.name}
        >
          Download
        </a>
        <button
          className="btn-secondary"
          disabled={busy}
          onClick={async () => {
            if (busy) return;
            setBusy(true);
            try {
              await saveDocument(file);
              setMessage("Saved in My files on this device.");
            } catch (e) {
              setMessage(friendlyError(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          Save on device
        </button>
      </div>
      {message && (
        <p className="mt-2 text-sm" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
