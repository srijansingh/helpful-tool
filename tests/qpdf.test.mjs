import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import createModule from "@neslinesli93/qpdf-wasm";
import { PDFDocument } from "pdf-lib";
import { qpdfArgs } from "../src/lib/pdf/qpdfOptions.ts";
const wasmBinary = await fs.readFile(
  new URL(
    "../node_modules/@neslinesli93/qpdf-wasm/dist/qpdf.wasm",
    import.meta.url,
  ),
);
async function engine() {
  return createModule({
    wasmBinary,
    noInitialRun: true,
    print: () => {},
    printErr: () => {},
  });
}
async function fixture(objectStreams = true) {
  const d = await PDFDocument.create();
  const p = d.addPage([600, 800]);
  const field = d.getForm().createTextField("Name");
  field.setText("Alice");
  field.addToPage(p, { x: 50, y: 50, width: 100, height: 30 });
  return d.save({ useObjectStreams: objectStreams });
}
function run(q, args) {
  const code = q.callMain(args);
  process.exitCode = 0;
  return code;
}
test("AES256 requires password; wrong password fails; correct unlock preserves forms", async () => {
  const q = await engine();
  q.FS.writeFile("/input.pdf", await fixture());
  assert.equal(
    run(q, qpdfArgs("protect", "@strong-päसword", "owner-private")),
    0,
  );
  const protectedBytes = q.FS.readFile("/output.pdf");
  await assert.rejects(PDFDocument.load(protectedBytes), /encrypted/);
  q.FS.writeFile("/input.pdf", protectedBytes);
  q.FS.unlink("/output.pdf");
  assert.notEqual(run(q, qpdfArgs("unlock", "wrong")), 0);
  assert.equal(run(q, qpdfArgs("unlock", "@strong-päसword")), 0);
  const d = await PDFDocument.load(q.FS.readFile("/output.pdf"));
  assert.equal(d.getForm().getTextField("Name").getText(), "Alice");
  assert.deepEqual(d.getPage(0).getSize(), { width: 600, height: 800 });
});
test("lossless optimization preserves interactive fields and page geometry", async () => {
  const q = await engine();
  q.FS.writeFile("/input.pdf", await fixture());
  assert.equal(run(q, qpdfArgs("optimize")), 0);
  const d = await PDFDocument.load(q.FS.readFile("/output.pdf"));
  assert.equal(d.getForm().getTextField("Name").getText(), "Alice");
  assert.equal(d.getPageCount(), 1);
});
test("repair gate: this WASM build rejects broken startxref without an output", async () => {
  const q = await engine();
  const bytes = await fixture(false);
  const text = new TextDecoder("latin1").decode(bytes);
  const marker = text.lastIndexOf("startxref");
  const tail = new TextDecoder().decode(bytes.slice(marker));
  const altered = new Uint8Array([
    ...bytes.slice(0, marker),
    ...new TextEncoder().encode(
      tail.replace(/startxref\s+\d+/, "startxref\n999999999"),
    ),
  ]);
  q.FS.writeFile("/input.pdf", altered);
  assert.equal(run(q, qpdfArgs("repair")), 2);
  assert.throws(() => q.FS.readFile("/output.pdf"));
});
