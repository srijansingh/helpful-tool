import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";

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
  ranges?: string;
  prefix?: string;
  margin?: number;
  skipCover?: boolean;
}

import { screenPoint } from "./edit.ts";
import { selectedPages } from "./pageRanges.ts";
const MARGIN = 24;

export async function applyPageNumbers(
  bytes: ArrayBuffer,
  options: PageNumberOptions,
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();
  const selected = options.ranges?.trim()
    ? selectedPages(options.ranges, pages.length)
    : pages.map((_, i) => i);
  const indices = selected.filter((i) => !options.skipCover || i !== 0);
  const margin = options.margin ?? MARGIN;
  if (!indices.length)
    throw new Error(
      "No pages remain after skipping the cover. Choose another page or include the cover.",
    );
  const lastNumber = options.startAt + indices.length - 1;
  const color = rgb(0.25, 0.25, 0.25);

  pages.forEach((page, i) => {
    const index = indices.indexOf(i);
    if (index === -1) return;
    const n = options.startAt + index;
    const text =
      (options.prefix || "") +
      (options.format === "page-of-total" ? `${n} of ${lastNumber}` : `${n}`);
    const box = page.getCropBox();
    const rotation = ((page.getRotation().angle % 360) + 360) % 360;
    const width = rotation % 180 ? box.height : box.width;
    const height = rotation % 180 ? box.width : box.height;
    const textWidth = font.widthOfTextAtSize(text, options.fontSize);

    if (
      textWidth > width - margin * 2 ||
      height < margin * 2 + options.fontSize
    )
      throw new Error(
        `Page ${i + 1} is too small for this number. Reduce the margin, font size or prefix.`,
      );
    const displayX = options.position.endsWith("center")
      ? (width - textWidth) / 2
      : options.position.endsWith("right")
        ? width - margin - textWidth
        : margin;
    const displayY = options.position.startsWith("top")
      ? height - margin - options.fontSize
      : Math.max(4, margin - options.fontSize * 0.3);

    const [x, y] = screenPoint(
      box,
      rotation,
      displayX / width,
      1 - displayY / height,
    );
    page.drawText(text, {
      x,
      y,
      size: options.fontSize,
      font,
      color,
      rotate: degrees(rotation),
    });
  });

  return doc.save();
}
