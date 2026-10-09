import test from "node:test";
import assert from "node:assert/strict";
import { PDFDocument, degrees } from "pdf-lib";
import { bookletOrder, buildBooklet } from "../src/lib/pdf/booklet.ts";
test("five page booklet pads to eight and places readable pages in fold order", () => {
  assert.deepEqual(bookletOrder(5), [
    [null, 0],
    [1, null],
    [null, 2],
    [3, 4],
  ]);
  assert.deepEqual(bookletOrder(4, true), [
    [0, 3],
    [2, 1],
  ]);
});
test("booklet emits landscape sides and leaves the rotated cropped source unchanged", async () => {
  const d = await PDFDocument.create();
  for (let i = 0; i < 5; i++) {
    const p = d.addPage([600, 800]);
    p.drawText(`Page ${i + 1}`);
    if (i === 0) {
      p.setCropBox(20, 30, 560, 740);
      p.setRotation(degrees(90));
    }
  }
  const original = await d.save();
  const out = await PDFDocument.load(await buildBooklet(original, "a4"));
  assert.equal(out.getPageCount(), 4);
  assert.deepEqual(out.getPage(0).getSize(), { width: 841.89, height: 595.28 });
  const source = await PDFDocument.load(original);
  assert.equal(source.getPage(0).getRotation().angle, 90);
  assert.deepEqual(source.getPage(0).getCropBox(), {
    x: 20,
    y: 30,
    width: 560,
    height: 740,
  });
});
