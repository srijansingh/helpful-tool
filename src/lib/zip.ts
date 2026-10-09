import { zipSync } from "fflate";

export interface NamedBytes {
  name: string;
  bytes: Uint8Array;
}

export function toZipBlob(files: NamedBytes[]): Blob {
  const entries: Record<string, Uint8Array> = {};
  for (const { name, bytes } of files) {
    entries[name] = bytes;
  }
  const zipped = zipSync(entries);
  return new Blob([new Uint8Array(zipped)], { type: "application/zip" });
}
