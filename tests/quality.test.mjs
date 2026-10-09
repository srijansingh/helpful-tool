import test from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import { selectedPages } from "../src/lib/pdf/pageRanges.ts";
import { extractPages, loadPdfInfo } from "../src/lib/pdf/split.ts";
import { backupDocuments, restoreBackup } from "../src/lib/backup.ts";
import { buildOrganizedPdf } from "../src/lib/pdf/organize.ts";
async function fixture() {
  const pdf = await PDFDocument.create();
  for (let i = 0; i < 7; i++) pdf.addPage([300 + i, 500]);
  return pdf.save();
}
test("split rejects mixed invalid range tokens instead of exporting a silent subset", async () => {
  const bytes = await fixture();
  for (const range of [
    "1,99,abc",
    "1,abc",
    "0,1",
    "1,",
    "1.5",
    "99999999999999999999",
    " ",
  ])
    await assert.rejects(extractPages(bytes.buffer, range, 7));
  const out = await PDFDocument.load(
    await extractPages(bytes.buffer, "2,5-7", 7),
  );
  assert.equal(out.getPageCount(), 4);
  assert.equal(out.getPage(0).getWidth(), 301);
});
test("range validation bounds unsafe input and retains defined sorted unique behavior", () => {
  assert.deepEqual(selectedPages("5-3,3,1", 7), [0, 2, 3, 4]);
  assert.throws(() => selectedPages("1-999999999", 7));
});
test("zero-page input cannot be accepted by split", async () => {
  const pdf = await PDFDocument.create();
  const bytes = await pdf.save({ addDefaultPage: false });
  await assert.rejects(loadPdfInfo(new File([bytes], "empty.pdf")), /no pages/);
});
test("organize cannot export an accidental empty document", async () => {
  await assert.rejects(
    buildOrganizedPdf((await fixture()).buffer, [], []),
    /at least one page/,
  );
});
test("backup cannot export more records than its own restore supports", async () => {
  const docs = Array.from({ length: 1001 }, (_, i) => ({
    id: String(i),
    name: "audit.pdf",
    type: "application/pdf",
    size: 5,
    updatedAt: 0,
    folder: "",
    blob: new Blob(["audit"]),
  }));
  await assert.rejects(backupDocuments(docs), /1,000/);
});
test("backup rejects malformed editable scan state rather than accepting unsafe source records", async () => {
  const doc = {
    id: "audit",
    name: "audit.pdf",
    type: "application/pdf",
    size: 5,
    updatedAt: 0,
    folder: "",
    blob: new Blob(["audit"]),
    scanPages: [
      {
        id: "page",
        dataUrl: "data:image/jpeg;base64,YQ==",
        warpedDataUrl: "data:image/jpeg;base64,YQ==",
        filter: "invalid",
      },
    ],
  };
  const blob = await backupDocuments([doc]);
  await assert.rejects(
    restoreBackup(new File([blob], "audit.zip")),
    /invalid editable scan/,
  );
});

test("image header budgets reject oversized PNG before allocating its pixels", async () => {
  const { headerImageDimensions, checkImageDimensions } =
    await import("../src/lib/imageBudget.ts");
  const bytes = new Uint8Array(24);
  bytes[0] = 0x89;
  bytes[1] = 0x50;
  const view = new DataView(bytes.buffer);
  view.setUint32(16, 50000);
  view.setUint32(20, 50000);
  assert.deepEqual(headerImageDimensions(bytes), [50000, 50000]);
  assert.throws(
    () => checkImageDimensions(...headerImageDimensions(bytes)),
    /too large/,
  );
});
