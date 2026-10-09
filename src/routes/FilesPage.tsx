import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  listDocuments,
  saveDocument,
  documentFile,
  updateDocument,
  removeDocument,
  type SavedDocument,
} from "../lib/library";
import { backupDocuments, restoreBackup } from "../lib/backup";
import { useDocumentStore } from "../store/useDocumentStore";
import { useScanStore } from "../store/useScanStore";
import { Dropzone } from "../components/Dropzone";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { downloadBlob } from "../lib/download";
import { formatSize } from "../lib/formatSize";
import { friendlyError, validateFiles } from "../lib/importFiles";
import { useScanLibrary } from "../hooks/useScanLibrary";
import { imagesToPdf } from "../lib/pdf/imagesToPdf";
import { dataUrlToFile } from "../lib/scan/dataUrlToFile";
export default function FilesPage() {
  const [docs, setDocs] = useState<SavedDocument[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [folder, setFolder] = useState("all");
  const [trash, setTrash] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [purge, setPurge] = useState<SavedDocument | null>(null);
  const navigate = useNavigate();
  const current = useDocumentStore((s) => s.current);
  const { documents: legacy, loaded: legacyLoaded } = useScanLibrary();
  const refresh = async () => {
    try {
      setDocs(await listDocuments());
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoaded(true);
    }
  };
  useEffect(() => {
    void refresh();
  }, []);
  const action = async (task: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await task();
      await refresh();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };
  const save = (file: File) => action(() => saveDocument(file));
  const update = (doc: SavedDocument) => action(() => updateDocument(doc));
  const visible = docs.filter(
    (d) =>
      Boolean(d.deletedAt) === trash &&
      (folder === "all" || d.folder === folder) &&
      (d.name + " " + d.folder + " " + (d.ocrText || ""))
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const folders = [
    ...new Set(
      docs
        .filter((d) => !d.deletedAt)
        .map((d) => d.folder)
        .filter(Boolean),
    ),
  ];
  return (
    <section>
      <h1 className="text-3xl font-bold">My files</h1>
      <p className="mt-2 text-muted">
        Saved only on this device. Back up important files before clearing
        browser storage.
      </p>
      {current && (
        <div className="panel mt-4">
          <p className="break-words">Current: {current.name}</p>
          <button
            disabled={busy}
            className="btn mt-3"
            onClick={() => void save(current)}
          >
            Save current document on device
          </button>
        </div>
      )}
      <div className="mt-5">
        <Dropzone
          accept="application/pdf,image/*"
          label="Import and save a file"
          hint="This keeps a local copy on your device"
          onFiles={(files) => void save(files[0])}
        />
      </div>
      <div className="editor-options">
        <input
          className="field flex-1"
          aria-label="Search saved files"
          placeholder="Search names, folders or OCR text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className="field"
          aria-label="Folder"
          value={folder}
          onChange={(e) => setFolder(e.target.value)}
        >
          <option value="all">All folders</option>
          {folders.map((f) => (
            <option key={f}>{f}</option>
          ))}
        </select>
        <button
          className="btn-secondary"
          aria-pressed={trash}
          onClick={() => setTrash(!trash)}
        >
          {trash ? "Show files" : "Trash"}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-bad mt-3">
          {error}
        </p>
      )}
      <div className="mt-4 space-y-3">
        {!loaded ? (
          <p role="status">Loading files…</p>
        ) : (
          visible.map((doc) => (
            <SavedRow
              key={doc.id}
              doc={doc}
              busy={busy}
              onOpen={() => {
                useDocumentStore.getState().setCurrent(documentFile(doc));
                navigate("/document");
              }}
              onUpdate={update}
              onPurge={() => setPurge(doc)}
              onEditScan={() => {
                useScanStore.getState().reorderPages(
                  doc.scanPages!.map((p) => ({
                    ...p,
                    id: crypto.randomUUID(),
                  })),
                );
                navigate("/scan");
              }}
            />
          ))
        )}
      </div>
      {loaded && !visible.length && (
        <div className="panel mt-4">
          <p>{trash ? "Trash is empty." : "No matching files."}</p>
          <Link className="btn mt-3" to="/scan">
            Scan a document
          </Link>
        </div>
      )}
      <details className="panel mt-5">
        <summary>Backup and restore</summary>
        <p className="text-sm text-muted mt-3">
          Backup contains all active files, folders, OCR text and editable scan
          sources. Restore adds copies and keeps existing files.
        </p>
        <button
          className="btn-secondary mt-3"
          disabled={busy || !docs.some((d) => !d.deletedAt)}
          onClick={() =>
            void action(async () =>
              downloadBlob(
                await backupDocuments(docs.filter((d) => !d.deletedAt)),
                "localpdf-backup.zip",
                false,
              ),
            )
          }
        >
          Download local backup
        </button>
        <label className="btn-secondary mt-3">
          Restore backup
          <input
            className="sr-only"
            type="file"
            accept=".zip,application/zip"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f)
                void action(async () => {
                  const restored = await restoreBackup(f);
                  for (const d of restored)
                    await validateFiles(
                      [documentFile(d)],
                      "application/pdf,image/*",
                    );
                  await (
                    await import("../lib/library")
                  ).restoreDocuments(restored);
                });
              e.target.value = "";
            }}
          />
        </label>
      </details>
      {legacyLoaded && legacy.length > 0 && (
        <div className="panel mt-4">
          <p>{legacy.length} scans in your previous library.</p>
          <button
            className="btn-secondary mt-3"
            disabled={busy}
            onClick={() =>
              void action(async () => {
                for (const old of legacy) {
                  if (docs.some((d) => d.id === `legacy-scan:${old.id}`))
                    continue;
                  const files = await Promise.all(
                    old.pages.map((p, i) =>
                      dataUrlToFile(p.dataUrl, `page-${i + 1}.jpg`),
                    ),
                  );
                  const saved = await saveDocument(
                    new File(
                      [new Uint8Array(await imagesToPdf(files))],
                      old.name + ".pdf",
                      { type: "application/pdf" },
                    ),
                    `legacy-scan:${old.id}`,
                  );
                  await updateDocument({
                    ...saved,
                    scanPages: old.pages.map((p) => ({
                      id: crypto.randomUUID(),
                      dataUrl: p.dataUrl,
                      warpedDataUrl: p.warpedDataUrl || p.dataUrl,
                      rawDataUrl: p.rawDataUrl,
                      filter: p.filter as "original",
                    })),
                  });
                }
              })
            }
          >
            Import previous scans into My files
          </button>
          <Link className="block mt-3 text-accent" to="/scans">
            Open previous scan library →
          </Link>
        </div>
      )}
      <ConfirmDialog
        open={!!purge}
        title="Delete permanently?"
        description={`This removes ${purge?.name || "this file"} from this device. Export a backup first if you need a copy.`}
        confirmLabel="Delete permanently"
        onConfirm={() => {
          if (purge) void action(() => removeDocument(purge.id));
          setPurge(null);
        }}
        onCancel={() => setPurge(null)}
      />
    </section>
  );
}
function SavedRow({
  doc,
  busy,
  onOpen,
  onUpdate,
  onPurge,
  onEditScan,
}: {
  doc: SavedDocument;
  busy: boolean;
  onOpen: () => void;
  onUpdate: (d: SavedDocument) => Promise<void>;
  onPurge: () => void;
  onEditScan: () => void;
}) {
  const [name, setName] = useState(doc.name);
  const [folder, setFolder] = useState(doc.folder);
  return (
    <article className="panel">
      <button className="w-full text-left" onClick={onOpen}>
        <strong className="block break-words">{doc.name}</strong>
        <span className="text-sm text-muted">
          {formatSize(doc.size)} · {doc.folder || "No folder"} ·{" "}
          {new Date(doc.updatedAt).toLocaleDateString()}
        </span>
      </button>
      <details className="mt-3">
        <summary>File actions</summary>
        {doc.deletedAt ? (
          <div className="editor-options">
            <button
              className="btn-secondary"
              disabled={busy}
              onClick={() => void onUpdate({ ...doc, deletedAt: undefined })}
            >
              Restore from trash
            </button>
            <button className="btn-secondary" disabled={busy} onClick={onPurge}>
              Delete permanently
            </button>
          </div>
        ) : (
          <>
            <label className="field-label mt-3">
              File name
              <input
                className="field"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="field-label mt-3">
              Folder
              <input
                className="field"
                placeholder="e.g. Receipts"
                value={folder}
                onChange={(e) => setFolder(e.target.value)}
              />
            </label>
            <div className="editor-options">
              <button
                className="btn-secondary"
                disabled={busy || !name.trim()}
                onClick={() =>
                  void onUpdate({
                    ...doc,
                    name: name.trim(),
                    folder: folder.trim(),
                    updatedAt: Date.now(),
                  })
                }
              >
                Save name & folder
              </button>
              <button
                className="btn-secondary"
                disabled={busy}
                onClick={() => void onUpdate({ ...doc, deletedAt: Date.now() })}
              >
                Move to trash
              </button>
              {doc.scanPages && (
                <button className="btn-secondary" onClick={onEditScan}>
                  Edit scan pages
                </button>
              )}
              <button
                className="btn-secondary"
                onClick={() => downloadBlob(doc.blob, doc.name, false)}
              >
                Download
              </button>
            </div>
          </>
        )}
      </details>
    </article>
  );
}
