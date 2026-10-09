import { PDFDocument, rgb, degrees } from "pdf-lib";
import { selectedPages } from "./pageRanges.ts";
import { screenPoint } from "./edit.ts";
import { textFont } from "./font.ts";
export interface WatermarkOptions {
  text: string;
  opacity: number;
  fontSize: number;
  rotation: number;
  position?:
    "center" | "top-left" | "top-right" | "bottom-left" | "bottom-right";
  color?: string;
  ranges?: string;
  repeat?: boolean;
  logo?: string;
}
export async function applyWatermark(
  bytes: ArrayBuffer,
  options: WatermarkOptions,
) {
  const doc = await PDFDocument.load(bytes);
  const font = await textFont(doc, options.text);
  const c = (options.color || "#808080")
    .match(/\w\w/g)!
    .map((v) => parseInt(v, 16) / 255);
  const color = rgb(c[0], c[1], c[2]);
  const pages = options.ranges?.trim()
    ? selectedPages(options.ranges, doc.getPageCount())
    : doc.getPageIndices();
  const logo = options.logo ? await doc.embedPng(options.logo) : null;
  for (const i of pages) {
    const page = doc.getPage(i);
    const box = page.getCropBox();
    const pageRotation = ((page.getRotation().angle % 360) + 360) % 360;
    const width = pageRotation % 180 ? box.height : box.width;
    const height = pageRotation % 180 ? box.width : box.height;
    const textWidth = logo
      ? Math.min(120, width / 3)
      : font.widthOfTextAtSize(options.text, options.fontSize);
    const textHeight = logo
      ? (textWidth * logo.height) / logo.width
      : options.fontSize;
    if (textWidth > width || textHeight > height)
      throw new Error(
        `The watermark is too large for page ${i + 1}. Reduce the text size or use a smaller logo.`,
      );
    const angle = (options.rotation * Math.PI) / 180;
    const pos = options.position || "center";
    const cx = pos.endsWith("left")
      ? 24 + textWidth / 2
      : pos.endsWith("right")
        ? width - 24 - textWidth / 2
        : width / 2;
    const cy = pos.startsWith("top")
      ? height - 24 - textHeight / 2
      : pos.startsWith("bottom")
        ? 24 + textHeight / 2
        : height / 2;
    const centers = options.repeat
      ? Array.from({ length: 9 }, (_, n) => [
          (((n % 3) + 0.5) * width) / 3,
          ((Math.floor(n / 3) + 0.5) * height) / 3,
        ])
      : [[cx, cy]];
    for (const [mx, my] of centers) {
      const displayX =
        mx -
        ((textWidth / 2) * Math.cos(angle) -
          textHeight * 0.35 * Math.sin(angle));
      const displayY =
        my -
        ((textWidth / 2) * Math.sin(angle) +
          textHeight * 0.35 * Math.cos(angle));
      const [x, y] = screenPoint(
        box,
        pageRotation,
        displayX / width,
        1 - displayY / height,
      );
      if (logo)
        page.drawImage(logo, {
          x,
          y,
          width: textWidth,
          height: textHeight,
          opacity: options.opacity,
          rotate: degrees(options.rotation + pageRotation),
        });
      else
        page.drawText(options.text, {
          x,
          y,
          font,
          size: options.fontSize,
          color,
          opacity: options.opacity,
          rotate: degrees(options.rotation + pageRotation),
        });
    }
  }
  return doc.save();
}
