import { PDFDocument, type PDFImage } from "pdf-lib";
export interface ImagePdfOptions {
  paper?: "original" | "a4" | "letter";
  orientation?: "portrait" | "landscape";
  margin?: number;
  fit?: "contain" | "cover";
  quality?: number;
}
export async function imageBytes(
  file: File,
  quality = 1,
): Promise<{ bytes: Uint8Array; jpeg: boolean }> {
  if (
    quality === 1 &&
    (file.type === "image/jpeg" || file.type === "image/png")
  )
    return {
      bytes: new Uint8Array(await file.arrayBuffer()),
      jpeg: file.type === "image/jpeg",
    };
  const bitmap = await createImageBitmap(file);
  const c = document.createElement("canvas");
  const s = Math.min(1, 2600 / Math.max(bitmap.width, bitmap.height));
  c.width = Math.round(bitmap.width * s);
  c.height = Math.round(bitmap.height * s);
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(bitmap, 0, 0, c.width, c.height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) =>
    c.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Image encoding failed"))),
      quality < 1 ? "image/jpeg" : "image/png",
      quality,
    ),
  );
  c.width = c.height = 0;
  return { bytes: new Uint8Array(await blob.arrayBuffer()), jpeg: quality < 1 };
}
export async function imagesToPdf(
  files: File[],
  {
    paper = "original",
    orientation = "portrait",
    margin = 0,
    fit = "contain",
    quality = 1,
  }: ImagePdfOptions = {},
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (const file of files) {
    const data = await imageBytes(file, quality);
    const img: PDFImage = data.jpeg
      ? await doc.embedJpg(data.bytes)
      : await doc.embedPng(data.bytes);
    const s = Math.min(1, 1600 / Math.max(img.width, img.height));
    let w = paper === "a4" ? 595.28 : paper === "letter" ? 612 : img.width * s;
    let h = paper === "a4" ? 841.89 : paper === "letter" ? 792 : img.height * s;
    if (paper !== "original" && orientation === "landscape") [w, h] = [h, w];
    const m = Math.min(Math.max(0, margin), Math.min(w, h) / 4);
    const page = doc.addPage([w, h]);
    const scale = (fit === "contain" ? Math.min : Math.max)(
      (w - 2 * m) / img.width,
      (h - 2 * m) / img.height,
    );
    page.drawImage(img, {
      x: (w - img.width * scale) / 2,
      y: (h - img.height * scale) / 2,
      width: img.width * scale,
      height: img.height * scale,
    });
  }
  return doc.save();
}
