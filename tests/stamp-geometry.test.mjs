import test from "node:test";
import assert from "node:assert/strict";
import { PDFDocument, degrees } from "pdf-lib";
import { DOMMatrix, ImageData, Path2D } from "@napi-rs/canvas";
import { applyPageNumbers } from "../src/lib/pdf/pageNumbers.ts";
import { applyWatermark } from "../src/lib/pdf/watermark.ts";
Object.assign(globalThis, { DOMMatrix, ImageData, Path2D });
const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
async function fixture() {
  const d = await PDFDocument.create();
  for (const angle of [0, 90, 180, 270]) {
    const p = d.addPage([600, 800]);
    p.setCropBox(35, 40, 500, 700);
    p.setRotation(degrees(angle));
  }
  return d.save();
}
test("numbers and watermark positions follow displayed crop geometry at every right-angle rotation", async () => {
  const source = await fixture();
  const numbered = await applyPageNumbers(source.buffer, {
    position: "bottom-left",
    format: "number",
    startAt: 1,
    fontSize: 16,
    margin: 20,
  });
  const stamped = await applyWatermark(source.buffer, {
    text: "AUDIT",
    opacity: 0.5,
    fontSize: 20,
    rotation: 0,
    position: "top-left",
  });
  for (const [bytes, kind] of [
    [numbered, "number"],
    [stamped, "watermark"],
  ]) {
    const task = getDocument({ data: bytes.slice() });
    try {
      const pdf = await task.promise;
      for (let i = 1; i <= 4; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1 });
        const item = (await page.getTextContent()).items.find(
          (it) =>
            "str" in it && it.str === (kind === "number" ? String(i) : "AUDIT"),
        );
        assert.ok(item);
        const [x, y] = viewport.convertToViewportPoint(
          item.transform[4],
          item.transform[5],
        );
        assert.ok(
          Math.abs(x - (kind === "number" ? 20 : 24)) < 0.1,
          `page ${i}: x=${x}`,
        );
        assert.ok(
          Math.abs(y - (kind === "number" ? viewport.height - 15.2 : 41)) < 0.1,
          `page ${i}: y=${y}`,
        );
      }
    } finally {
      await task.destroy();
    }
  }
});
