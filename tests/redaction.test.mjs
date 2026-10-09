import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import { createCanvas, DOMMatrix, ImageData, Path2D } from "@napi-rs/canvas";
import { PDFDocument, StandardFonts, PDFName, rgb, degrees } from "pdf-lib";
Object.assign(globalThis, {
  DOMMatrix,
  ImageData,
  Path2D,
  requestAnimationFrame: (callback) => queueMicrotask(callback),
  document: {
    createElement: () => {
      const c = createCanvas(1, 1);
      c.toBlob = (callback) =>
        callback(new Blob([c.toBuffer("image/png")], { type: "image/png" }));
      return c;
    },
  },
});
const worker = pathToFileURL(
  path.resolve("node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"),
).href;
let source = await fs.readFile(
  new URL("../src/lib/pdf/redact.ts", import.meta.url),
  "utf8",
);
source = source
  .replace(
    /import workerSrc from .*?;/,
    `const workerSrc=${JSON.stringify(worker)};`,
  )
  .replace(
    'from "pdf-lib"',
    `from ${JSON.stringify(pathToFileURL(path.resolve("node_modules/pdf-lib/es/index.js")).href)}`,
  )
  .replace(
    'from "pdfjs-dist"',
    `from ${JSON.stringify(pathToFileURL(path.resolve("node_modules/pdfjs-dist/legacy/build/pdf.mjs")).href)}`,
  );
// Resolve pdf-lib through its CJS entry to avoid Node ESM extension resolution.
source = source.replace("/pdf-lib/es/index.js", "/pdf-lib/cjs/index.js");
const dir = await fs.mkdtemp(path.join(os.tmpdir(), "localpdf-redact-test-"));
const runtime = path.join(dir, "redact.mjs");
await fs.writeFile(
  runtime,
  ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2023,
      module: ts.ModuleKind.ESNext,
    },
  }).outputText,
);
const { redactPdf } = await import(pathToFileURL(runtime).href);
const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
async function fixture() {
  const d = await PDFDocument.create(),
    p = d.addPage([400, 600]),
    font = await d.embedFont(StandardFonts.Helvetica);
  p.drawText("VISIBLE_SECRET_7391", { x: 20, y: 540, size: 20, font });
  p.drawText("PUBLIC_TEXT_REMAINS", { x: 20, y: 200, size: 20, font });
  p.drawRectangle({
    x: 20,
    y: 50,
    width: 100,
    height: 50,
    color: rgb(0, 0.7, 0),
  });
  d.setAuthor("METADATA_SECRET_7391");
  d.setSubject("SUBJECT_SECRET_7391");
  await d.attach(
    new TextEncoder().encode("ATTACHMENT_SECRET_7391"),
    "secret.txt",
  );
  const f = d.getForm().createTextField("FORM_SECRET");
  f.setText("SECRET_FIELD_VALUE");
  f.addToPage(p, { x: 20, y: 460, width: 250, height: 30 });
  const p2 = d.addPage([400, 600]);
  p2.drawText("ROTATED PAGE", { x: 60, y: 200, size: 20, font });
  p2.setCropBox(20, 40, 300, 500);
  p2.setRotation(degrees(90));
  return new File([await d.save()], "fixture.pdf", { type: "application/pdf" });
}
test("raster redaction removes source objects and overwrites pixels while retaining public content and visible geometry", async () => {
  const bytes = await redactPdf(
    await fixture(),
    [{ id: "secret", page: 1, x: 0, y: 0, width: 1, height: 0.35 }],
    new AbortController().signal,
    () => {},
  );
  const out = await PDFDocument.load(bytes);
  assert.equal(out.getPageCount(), 2);
  assert.equal(out.getAuthor(), undefined);
  assert.equal(out.getSubject(), undefined);
  assert.equal(out.catalog.has(PDFName.of("Names")), false);
  assert.equal(out.catalog.has(PDFName.of("AcroForm")), false);
  assert.deepEqual(out.getPage(1).getSize(), { width: 500, height: 300 });
  const pdf = await getDocument({ data: new Uint8Array(bytes) }).promise;
  try {
    for (let i = 1; i <= 2; i++) {
      const p = await pdf.getPage(i);
      assert.equal((await p.getTextContent()).items.length, 0);
      assert.equal((await p.getAnnotations()).length, 0);
    }
    const p = await pdf.getPage(1),
      viewport = p.getViewport({ scale: 1 }),
      c = createCanvas(400, 600),
      ctx = c.getContext("2d");
    await p.render({ canvas: c, canvasContext: ctx, viewport }).promise;
    const pixel = (x, y) => [...ctx.getImageData(x, y, 1, 1).data];
    assert.deepEqual(pixel(40, 60), [0, 0, 0, 255]);
    assert.deepEqual(pixel(200, 200), [0, 0, 0, 255]);
    const green = pixel(40, 520);
    assert.ok(green[1] > 100 && green[0] < 10);
    const publicBand = ctx.getImageData(20, 380, 330, 25).data;
    assert.ok(
      publicBand.some((v, i) => i % 4 === 0 && v < 50),
      "public text remains visible in the rendered output",
    );
    assert.equal(await pdf.getAttachments(), null);
  } finally {
    await pdf.destroy();
  }
});
test("raster redaction rejects out-of-page areas and cancelled jobs", async () => {
  await assert.rejects(
    redactPdf(
      await fixture(),
      [{ id: "bad", page: 1, x: 0.9, y: 0, width: 0.2, height: 0.1 }],
      new AbortController().signal,
      () => {},
    ),
    /Invalid redaction/,
  );
  const c = new AbortController();
  c.abort();
  await assert.rejects(
    redactPdf(
      await fixture(),
      [{ id: "ok", page: 1, x: 0, y: 0, width: 0.5, height: 0.1 }],
      c.signal,
      () => {},
    ),
    (e) => e.name === "AbortError",
  );
});
after(() => fs.rm(dir, { recursive: true, force: true }));
