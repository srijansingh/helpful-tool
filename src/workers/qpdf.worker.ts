import createModule from "@neslinesli93/qpdf-wasm";
import wasmUrl from "@neslinesli93/qpdf-wasm/dist/qpdf.wasm?url";
import { qpdfArgs, type QpdfAction } from "../lib/pdf/qpdfOptions";
type Engine = {
  FS: {
    writeFile: (path: string, data: Uint8Array) => void;
    readFile: (path: string) => Uint8Array;
    unlink: (path: string) => void;
  };
  callMain: (args: string[]) => number;
};
const factory = createModule as unknown as (options: {
  locateFile: () => string;
  noInitialRun: boolean;
  print: (line: string) => void;
  printErr: (line: string) => void;
}) => Promise<Engine>;
const send = (message: unknown, transfer: Transferable[] = []) =>
  (
    self as unknown as {
      postMessage: (message: unknown, transfer: Transferable[]) => void;
    }
  ).postMessage(message, transfer);
self.onmessage = async (
  event: MessageEvent<{
    bytes: Uint8Array;
    action: QpdfAction;
    password: string;
  }>,
) => {
  let engine: Engine | undefined;
  let errorText = "";

  try {
    send({ stage: "Loading local PDF engine…" });
    engine = await factory({
      locateFile: () => wasmUrl,
      noInitialRun: true,
      print: () => {},
      printErr: (line) => {
        errorText += line + "\n";
      },
    });
    engine.FS.writeFile("/input.pdf", event.data.bytes);
    const random = crypto.getRandomValues(new Uint8Array(32));
    const owner = [...random]
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("");
    send({ stage: "Processing PDF on this device…" });
    const exit = engine.callMain(
      qpdfArgs(event.data.action, event.data.password, owner),
    );
    if (exit !== 0 && exit !== 3)
      throw new Error(
        event.data.action === "unlock" || /invalid password/i.test(errorText)
          ? "Could not unlock this PDF. Check the known document password and that the file is valid."
          : "The PDF engine could not process this file. Try an unprotected, valid PDF.",
      );
    const bytes =
      event.data.action === "inspect"
        ? new Uint8Array()
        : new Uint8Array(engine.FS.readFile("/output.pdf"));
    send(
      {
        bytes,
        ownerPassword:
          event.data.action === "inspect" &&
          JSON.parse(
            new TextDecoder().decode(engine.FS.readFile("/inspection.json")),
          ).encrypt.ownerpasswordmatched === true,
        warning:
          exit === 3
            ? "The engine recovered the file with warnings. Inspect every page before relying on it."
            : "",
      },
      [bytes.buffer],
    );
  } catch (e) {
    send({ error: (e as Error).message });
  } finally {
    for (const path of ["/inspection.json", "/input.pdf", "/output.pdf"]) {
      try {
        engine?.FS.unlink(path);
      } catch {
        /* Missing temporary files are harmless. */
      }
    }
    event.data.password = "";
  }
};
