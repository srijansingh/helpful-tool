import { createStore, get, set, del, entries } from "idb-keyval";
const store = createStore("localpdf-documents", "documents");
export interface SavedDocument { id: string; name: string; type: string; size: number; updatedAt: number; blob: Blob; folder: string; deletedAt?: number }
export async function listDocuments(): Promise<SavedDocument[]> {return (await entries<string,SavedDocument>(store)).map(([,value])=>value).sort((a,b)=>b.updatedAt-a.updatedAt);}
export async function saveDocument(file: File, id = crypto.randomUUID(), folder = ""): Promise<SavedDocument> {
 const doc: SavedDocument = {id,name:file.name,type:file.type,size:file.size,updatedAt:Date.now(),blob:file,folder}; await set(id,doc,store); return doc;
}
export async function updateDocument(doc: SavedDocument) {await set(doc.id,doc,store);}
export async function removeDocument(id: string) {await del(id,store);}
export async function readDocument(id: string) {return get<SavedDocument>(id,store);}
export function documentFile(doc: SavedDocument) {return new File([doc.blob],doc.name,{type:doc.type});}
