import createModule from "@neslinesli93/qpdf-wasm";
import { PDFDocument } from "pdf-lib";
import fs from "node:fs/promises";
const wasmBinary = await fs.readFile(
  new URL(
    "../node_modules/@neslinesli93/qpdf-wasm/dist/qpdf.wasm",
    import.meta.url,
  ),
);
const d = await PDFDocument.create();
d.addPage([600, 800]);
const b = await d.save({ useObjectStreams: false });
const marker = Buffer.from(b).lastIndexOf("startxref");
const tail = Buffer.from(b.slice(marker)).toString();
const n = Number(tail.match(/startxref\s+(\d+)/)[1]);
for (const [name, value] of [
  ["off-by-one", n + 1],
  ["zero", 0],
  ["large", 999999999],
]) {
  const q = await createModule({ wasmBinary, noInitialRun: true });
  q.FS.writeFile(
    "/input.pdf",
    Buffer.concat([
      b.slice(0, marker),
      Buffer.from(tail.replace(/startxref\s+\d+/, `startxref\n${value}`)),
    ]),
  );
  console.log(name, q.callMain(["/input.pdf", "/output.pdf"]));
}
