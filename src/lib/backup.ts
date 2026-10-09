import { zipSync, unzipSync, strToU8, strFromU8 } from "fflate";
import type { SavedDocument } from "./library.ts";
export async function backupDocuments(docs: SavedDocument[]) {
  const files: Record<string, Uint8Array> = {};
  const records = [];
  for (const [i, doc] of docs.entries()) {
    const key = `files/${i}`;
    files[key] = new Uint8Array(await doc.blob.arrayBuffer());
    records.push({ ...doc, blob: undefined, id: undefined, key });
  }
  files["manifest.json"] = strToU8(
    JSON.stringify({ version: 1, documents: records }),
  );
  return new Blob([new Uint8Array(zipSync(files))], {
    type: "application/zip",
  });
}
export async function restoreBackup(file: File): Promise<SavedDocument[]> {
  if (file.size > 50 * 1024 * 1024)
    throw new Error("This backup is over 50 MB. Import files individually.");
  let total = 0;
  const files = unzipSync(new Uint8Array(await file.arrayBuffer()), {
    filter: (entry) => {
      total += entry.originalSize;
      if (total > 100 * 1024 * 1024 || entry.originalSize > 50 * 1024 * 1024)
        throw new Error(
          "Backup is too large to restore safely on this device.",
        );
      return true;
    },
  });
  if (!files["manifest.json"]) throw new Error("Choose a LocalPDF backup ZIP.");
  const data = JSON.parse(strFromU8(files["manifest.json"]));
  if (
    data.version !== 1 ||
    !Array.isArray(data.documents) ||
    data.documents.length > 1000
  )
    throw new Error("Unsupported backup format.");
  return data.documents.map(
    (d: {
      key: string;
      name: string;
      type: string;
      folder: string;
      ocrText?: string;
      scanPages?: SavedDocument["scanPages"];
    }) => {
      if (
        typeof d.name !== "string" ||
        typeof d.type !== "string" ||
        !files[d.key]
      )
        throw new Error("This backup is incomplete.");
      if (
        d.scanPages?.some((p) =>
          [p.dataUrl, p.warpedDataUrl, p.rawDataUrl]
            .filter(Boolean)
            .some((u) => !/^data:image\/(jpeg|png|webp);base64,/.test(u!)),
        )
      )
        throw new Error("Backup scan sources must be local image data.");
      const blob = new Blob([new Uint8Array(files[d.key])], { type: d.type });
      return {
        id: crypto.randomUUID(),
        name: d.name.slice(0, 200),
        type: d.type,
        size: blob.size,
        updatedAt: Date.now(),
        blob,
        folder: typeof d.folder === "string" ? d.folder.slice(0, 100) : "",
        ocrText: typeof d.ocrText === "string" ? d.ocrText : undefined,
        scanPages: Array.isArray(d.scanPages) ? d.scanPages : undefined,
      };
    },
  );
}
