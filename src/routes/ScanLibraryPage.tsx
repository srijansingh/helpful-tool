import { useState } from "react";
import { FileCheck2, Trash2, FolderOpen } from "lucide-react";
import { Card } from "../components/Card";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { useSeo } from "../hooks/useSeo";
import { useScanLibrary } from "../hooks/useScanLibrary";
import type { ScanDocument } from "../hooks/useScanLibrary";
import { imagesToPdf } from "../lib/pdf/imagesToPdf";
import { dataUrlToFile } from "../lib/scan/dataUrlToFile";
import { downloadBytes } from "../lib/download";

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

interface DocumentCardProps {
  doc: ScanDocument;
  onRename: (id: string, name: string) => void;
  onRequestDelete: (doc: ScanDocument) => void;
  onExport: (doc: ScanDocument) => void;
  exporting: boolean;
}

function DocumentCard({
  doc,
  onRename,
  onRequestDelete,
  onExport,
  exporting,
}: DocumentCardProps) {
  // Uncontrolled-ish local value, committed to the store only on blur —
  // persisting (and round-tripping through IndexedDB) on every keystroke
  // would both lag the input and risk out-of-order writes clobbering each
  // other if someone types quickly.
  const [name, setName] = useState(doc.name);

  return (
    <Card className="p-3">
      <div className="aspect-[3/4] overflow-hidden rounded-lg bg-surface-2">
        {doc.pages[0] && (
          <img
            src={doc.pages[0].dataUrl}
            alt={doc.name}
            className="h-full w-full object-cover"
          />
        )}
      </div>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => {
          const trimmed = name.trim();
          if (trimmed && trimmed !== doc.name) onRename(doc.id, trimmed);
          else setName(doc.name);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        aria-label="Document name — tap to rename"
        title="Tap to rename"
        className="mt-2 w-full truncate rounded bg-transparent font-display text-sm font-semibold outline-none focus:bg-surface-2 focus:px-1"
      />
      <p className="text-xs text-muted">
        {doc.pages.length} page{doc.pages.length === 1 ? "" : "s"} —{" "}
        {formatDate(doc.createdAt)}
      </p>
      <div className="mt-2 flex gap-1.5">
        <button
          type="button"
          onClick={() => onExport(doc)}
          disabled={exporting}
          aria-label="Export as PDF"
          className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-accent px-2 py-1.5 text-xs font-bold text-white disabled:opacity-50"
        >
          <FileCheck2 className="h-3.5 w-3.5" />
          PDF
        </button>
        <button
          type="button"
          aria-label={`Delete ${doc.name}`}
          onClick={() => onRequestDelete(doc)}
          className="rounded-lg border border-border bg-surface p-1.5 text-bad focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </Card>
  );
}

export default function ScanLibraryPage() {
  useSeo(
    "Scan Library — Saved Documents | LocalPDF",
    "Your scanned documents, saved locally on this device.",
  );

  const { documents, loaded, deleteDocument, renameDocument } =
    useScanLibrary();
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ScanDocument | null>(null);

  const handleExport = async (doc: ScanDocument) => {
    setExportingId(doc.id);
    try {
      const files = await Promise.all(
        doc.pages.map((p, i) => dataUrlToFile(p.dataUrl, `page-${i + 1}.jpg`)),
      );
      const bytes = await imagesToPdf(files);
      downloadBytes(bytes, `${doc.name}.pdf`, "application/pdf");
    } finally {
      setExportingId(null);
    }
  };

  return (
    <section>
      <h1 className="font-display text-2xl font-bold sm:text-3xl">
        Scan Library
      </h1>
      <p className="mt-1 text-muted">
        Documents you've scanned and saved, stored locally on this device.
      </p>

      <div className="mt-6">
        {!loaded ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="aspect-[3/4] animate-pulse rounded-xl bg-surface-2"
              />
            ))}
          </div>
        ) : documents.length === 0 ? (
          <Card className="flex flex-col items-center gap-3 py-12 text-center">
            <FolderOpen className="h-10 w-10 text-muted" aria-hidden="true" />
            <p className="font-display font-semibold">No scans saved yet</p>
            <p className="text-sm text-muted">
              Scan a document and tap "Save to Library" to see it here.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {documents.map((doc) => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                onRename={renameDocument}
                onRequestDelete={setPendingDelete}
                onExport={handleExport}
                exporting={exportingId === doc.id}
              />
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title={`Delete "${pendingDelete?.name ?? ""}"?`}
        description={`This removes it from your library on this device. It's a ${pendingDelete?.pages.length ?? 0}-page document — this can't be undone.`}
        confirmLabel="Delete"
        onConfirm={() => {
          if (pendingDelete) deleteDocument(pendingDelete.id);
          setPendingDelete(null);
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </section>
  );
}
