import { mergePdfs } from "../lib/pdf/merge";
import { imagesToPdf } from "../lib/pdf/imagesToPdf";
import { extractPages, splitEveryPage } from "../lib/pdf/split";
import { buildOrganizedPdf } from "../lib/pdf/organize";
import { applyWatermark } from "../lib/pdf/watermark";
import { applyPageNumbers } from "../lib/pdf/pageNumbers";
import { editPdf } from "../lib/pdf/edit";
import { buildBooklet } from "../lib/pdf/booklet";
import { friendlyError } from "../lib/importFiles";
self.onmessage = async (
  e: MessageEvent<{ operation: string; args: unknown[] }>,
) => {
  const { operation, args } = e.data;
  try {
    let result: Uint8Array | Awaited<ReturnType<typeof splitEveryPage>>;
    switch (operation) {
      case "merge":
        result = await mergePdfs(...(args as Parameters<typeof mergePdfs>));
        break;
      case "images":
        result = await imagesToPdf(...(args as Parameters<typeof imagesToPdf>));
        break;
      case "extract":
        result = await extractPages(
          ...(args as Parameters<typeof extractPages>),
        );
        break;
      case "split":
        result = await splitEveryPage(
          ...(args as Parameters<typeof splitEveryPage>),
        );
        break;
      case "organize":
        result = await buildOrganizedPdf(
          ...(args as Parameters<typeof buildOrganizedPdf>),
        );
        break;
      case "watermark":
        result = await applyWatermark(
          ...(args as Parameters<typeof applyWatermark>),
        );
        break;
      case "numbers":
        result = await applyPageNumbers(
          ...(args as Parameters<typeof applyPageNumbers>),
        );
        break;
      case "edit":
        result = await editPdf(...(args as Parameters<typeof editPdf>));
        break;
      case "booklet":
        result = await buildBooklet(
          ...(args as Parameters<typeof buildBooklet>),
        );
        break;
      default:
        throw new Error("Unsupported PDF processing task.");
    }
    const transfer =
      result instanceof Uint8Array
        ? [result.buffer]
        : result.map((r) => r.bytes.buffer);
    (
      self as unknown as {
        postMessage: (message: unknown, transfer: Transferable[]) => void;
      }
    ).postMessage({ result }, transfer as Transferable[]);
  } catch (error) {
    self.postMessage({ error: friendlyError(error) });
  }
};
