import { useDocumentStore } from "../store/useDocumentStore";
export function downloadBlob(blob: Blob, filename: string, publish = true): void {
  if (publish) useDocumentStore.getState().publish(new File([blob], filename, {type:blob.type}));
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadBytes(bytes: Uint8Array, filename: string, mime: string): void {
  downloadBlob(new Blob([new Uint8Array(bytes)], { type: mime }), filename);
}
