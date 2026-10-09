import { StandardFonts, type PDFDocument } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
let fontBytes: Promise<ArrayBuffer> | undefined;
export async function textFont(doc: PDFDocument, text: string) {
  if (/^[\x00-\x7f]*$/.test(text))
    return doc.embedFont(StandardFonts.Helvetica);
  doc.registerFontkit(fontkit);
  fontBytes ??= fetch("/fonts/NotoSansDevanagari.ttf")
    .then((r) => {
      if (!r.ok)
        throw new Error(
          "The local text font could not load. Reopen the app online once.",
        );
      return r.arrayBuffer();
    })
    .catch((e) => {
      fontBytes = undefined;
      throw e;
    });
  const font = await doc.embedFont(await fontBytes, { subset: true });
  const supported = new Set(font.getCharacterSet());
  if ([...text].some((c) => !supported.has(c.codePointAt(0)!)))
    throw new Error(
      "This script is not supported yet. Use English or Devanagari text, or import the text as an image.",
    );
  return font;
}
