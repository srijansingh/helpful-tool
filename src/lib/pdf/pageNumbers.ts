import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type PageNumberPosition =
  | "bottom-center"
  | "bottom-right"
  | "bottom-left"
  | "top-center"
  | "top-right"
  | "top-left";

export type PageNumberFormat = "number" | "page-of-total";

export interface PageNumberOptions {
  position: PageNumberPosition;
  format: PageNumberFormat;
  startAt: number;
  fontSize: number;
}

const MARGIN = 24;

export async function applyPageNumbers(bytes: ArrayBuffer, options: PageNumberOptions): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();
  const lastNumber = options.startAt + pages.length - 1;
  const color = rgb(0.25, 0.25, 0.25);

  pages.forEach((page, i) => {
    const n = options.startAt + i;
    const text = options.format === "page-of-total" ? `${n} of ${lastNumber}` : `${n}`;
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(text, options.fontSize);

    const x = options.position.endsWith("center")
      ? (width - textWidth) / 2
      : options.position.endsWith("right")
        ? width - MARGIN - textWidth
        : MARGIN;
    const y = options.position.startsWith("top")
      ? height - MARGIN
      : Math.max(4, MARGIN - options.fontSize * 0.3);

    page.drawText(text, { x, y, size: options.fontSize, font, color });
  });

  return doc.save();
}
