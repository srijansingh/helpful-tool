import createModule from "@neslinesli93/qpdf-wasm";
import fs from "node:fs/promises";
const q = await createModule({
  wasmBinary: await fs.readFile(
    new URL(
      "../node_modules/@neslinesli93/qpdf-wasm/dist/qpdf.wasm",
      import.meta.url,
    ),
  ),
  noInitialRun: true,
  print: (line) => process.stdout.write(line + "\n"),
  printErr: (line) => process.stderr.write(line + "\n"),
});
console.log("version exit", q.callMain(["--version"]));
console.log("help encrypt exit", q.callMain(["--help=--encrypt"]));
