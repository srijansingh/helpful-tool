import { PDFDocument, type PDFImage } from "pdf-lib";

// Caps the PDF page size (in points) so one huge photo doesn't produce an
// absurdly large page; images are scaled down to fit, never upscaled.
const MAX_PAGE_PT = 1600;

async function toPngBytes(file: File): Promise<Uint8Array> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0);
  const blob: Blob = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b!), "image/png")
  );
  return new Uint8Array(await blob.arrayBuffer());
}

async function embedImage(doc: PDFDocument, file: File): Promise<PDFImage> {
  // JPEG/PNG embed natively (and stay compact); anything else (webp, gif,
  // bmp, ...) is normalized to PNG via canvas first.
  if (file.type === "image/jpeg") {
    return doc.embedJpg(new Uint8Array(await file.arrayBuffer()));
  }
  if (file.type === "image/png") {
    return doc.embedPng(new Uint8Array(await file.arrayBuffer()));
  }
  return doc.embedPng(await toPngBytes(file));
}

// Builds one PDF with one page per image, in the given order.
export async function imagesToPdf(files: File[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (const file of files) {
    const img = await embedImage(doc, file);
    const scale = Math.min(1, MAX_PAGE_PT / Math.max(img.width, img.height));
    const w = img.width * scale;
    const h = img.height * scale;
    const page = doc.addPage([w, h]);
    page.drawImage(img, { x: 0, y: 0, width: w, height: h });
  }
  return doc.save();
}
