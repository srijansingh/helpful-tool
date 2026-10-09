import { zipSync } from "../vendor/fflate.esm.js";

// Bundles [{ name, bytes }] into one downloadable zip Blob.
export function toZipBlob(files) {
  const entries = {};
  for (const { name, bytes } of files) {
    entries[name] = bytes;
  }
  const zipped = zipSync(entries);
  return new Blob([zipped], { type: "application/zip" });
}
