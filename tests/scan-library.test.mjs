import test from "node:test";
import assert from "node:assert/strict";
import { detectPaper, validQuad } from "../src/lib/scan/detect.ts";
import { backupDocuments, restoreBackup } from "../src/lib/backup.ts";
import { zipSync, strToU8 } from "fflate";
test("paper detector finds contrasting page and refuses low-contrast frame", () => {
  const w = 120,
    h = 160,
    pixels = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const n = (y * w + x) * 4;
      const l = x >= 20 && x < 100 && y >= 25 && y < 140 ? 250 : 100;
      pixels[n] = pixels[n + 1] = pixels[n + 2] = l;
      pixels[n + 3] = 255;
    }
  assert.deepEqual(detectPaper(pixels, w, h), [
    { x: 20, y: 25 },
    { x: 99, y: 25 },
    { x: 99, y: 139 },
    { x: 20, y: 139 },
  ]);
  pixels.fill(255);
  assert.equal(detectPaper(pixels, w, h), null);
});
test("crop validation rejects crossing corners and collapsed areas", () => {
  assert.equal(
    validQuad(
      [
        { x: 0, y: 0 },
        { x: 100, y: 100 },
        { x: 100, y: 0 },
        { x: 0, y: 100 },
      ],
      100,
      100,
    ),
    false,
  );
  assert.equal(
    validQuad(
      [
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        { x: 0, y: 0 },
      ],
      100,
      100,
    ),
    false,
  );
});
test("backup restores original bytes, folders and OCR text with fresh identity", async () => {
  const blob = new Blob(["%PDF-synthetic"], { type: "application/pdf" });
  const original = {
    id: "old",
    name: "Receipt.pdf",
    type: blob.type,
    size: blob.size,
    blob,
    folder: "Receipts",
    updatedAt: 1,
    ocrText: "Total 50",
    scanPages: [
      {
        id: "page",
        dataUrl: "data:image/jpeg;base64,test",
        warpedDataUrl: "data:image/jpeg;base64,source",
        filter: "original",
      },
    ],
  };
  const backup = await backupDocuments([original]);
  const [restored] = await restoreBackup(new File([backup], "backup.zip"));
  assert.notEqual(restored.id, original.id);
  assert.equal(await restored.blob.text(), await blob.text());
  assert.equal(restored.folder, "Receipts");
  assert.equal(restored.ocrText, "Total 50");
  assert.deepEqual(restored.scanPages, original.scanPages);
});
test("restore rejects arbitrary ZIPs and missing document bodies", async () => {
  await assert.rejects(
    restoreBackup(
      new File(
        [new Uint8Array(zipSync({ "hello.txt": strToU8("hello") }))],
        "other.zip",
      ),
    ),
    /LocalPDF/,
  );
  const zip = zipSync({
    "manifest.json": strToU8(
      JSON.stringify({
        version: 1,
        documents: [
          { name: "Missing.pdf", type: "application/pdf", key: "files/0" },
        ],
      }),
    ),
  });
  await assert.rejects(
    restoreBackup(new File([new Uint8Array(zip)], "broken.zip")),
    /incomplete/,
  );
});
