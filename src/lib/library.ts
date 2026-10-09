import { ocrTexts } from "./ocrText.ts";
import type { ScanPage } from "../store/useScanStore";
import { createStore, get, set, setMany, del, entries } from "idb-keyval";
const savedIds = new WeakMap<File, string>();
export async function saveDocumentOnce(file: File) {
  let id = savedIds.get(file);
  if (!id) {
    id = crypto.randomUUID();
    savedIds.set(file, id);
  }
  const existing = await readDocument(id);
  if (existing && !existing.deletedAt) return existing;
  if (existing?.deletedAt) {
    id = crypto.randomUUID();
    savedIds.set(file, id);
  }
  return saveDocument(file, id);
}
const store = createStore("localpdf-documents", "documents");
export interface SavedDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  updatedAt: number;
  blob: Blob;
  folder: string;
  deletedAt?: number;
  scanPages?: ScanPage[];
  ocrText?: string;
}
export async function listDocuments(): Promise<SavedDocument[]> {
  return (await entries<string, SavedDocument>(store))
    .map(([, value]) => value)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}
export async function saveDocument(
  file: File,
  id: string = crypto.randomUUID(),
  folder = "",
  scanPages?: ScanPage[],
): Promise<SavedDocument> {
  const doc: SavedDocument = {
    id,
    name: file.name,
    type: file.type,
    size: file.size,
    updatedAt: Date.now(),
    blob: file,
    folder,
    ocrText: ocrTexts.get(file),
    scanPages,
  };
  await set(id, doc, store);
  savedIds.set(file, id);
  return doc;
}
export async function restoreDocuments(docs: SavedDocument[]) {
  await setMany(
    docs.map((doc) => [doc.id, doc]),
    store,
  );
}
export async function updateDocument(doc: SavedDocument) {
  await set(doc.id, doc, store);
}
export async function removeDocument(id: string) {
  await del(id, store);
}
export async function readDocument(id: string) {
  return get<SavedDocument>(id, store);
}
export function documentFile(doc: SavedDocument) {
  const file = new File([doc.blob], doc.name, { type: doc.type });
  savedIds.set(file, doc.id);
  if (doc.ocrText) ocrTexts.set(file, doc.ocrText);
  return file;
}
