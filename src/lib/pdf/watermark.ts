import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";

export interface WatermarkOptions {
  text: string;
  opacity: number; // 0-1
  fontSize: number;
  rotation: number; // degrees, counter-clockwise
}

// Stamps the same text watermark across every page — centered, rotated,
// and semi-transparent so it doesn't obscure the underlying content.
export async function applyWatermark(bytes: ArrayBuffer, options: WatermarkOptions): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes);
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const color = rgb(0.5, 0.5, 0.5);

  // drawText rotates around its (x, y) draw origin (the text's unrotated
  // baseline-left corner), not its visual center — so to keep rotated
  // text actually centered on the page, the origin has to be placed
  // where the *rotated* center-offset lands you back on the page center,
  // not just where the unrotated text would be centered.
  const angle = (options.rotation * Math.PI) / 180;
  for (const page of doc.getPages()) {
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(options.text, options.fontSize);
    const localCenterX = textWidth / 2;
    const localCenterY = options.fontSize * 0.35;
    const rotatedCenterX = localCenterX * Math.cos(angle) - localCenterY * Math.sin(angle);
    const rotatedCenterY = localCenterX * Math.sin(angle) + localCenterY * Math.cos(angle);

    page.drawText(options.text, {
      x: width / 2 - rotatedCenterX,
      y: height / 2 - rotatedCenterY,
      size: options.fontSize,
      font,
      color,
      opacity: options.opacity,
      rotate: degrees(options.rotation),
    });
  }

  return doc.save();
}
