import { prepareImage } from "./imageBudget";
export interface ImageOptions {
  rotation: number;
  width: number;
  crop: number;
  quality: number;
  format: string;
}
export async function editImage(
  file: File,
  options: ImageOptions,
  preview = false,
): Promise<Blob> {
  await prepareImage(file);
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  try {
    const inset = Math.min(0.4, Math.max(0, options.crop / 100));
    const sw = bitmap.width * (1 - 2 * inset),
      sh = bitmap.height * (1 - 2 * inset);
    const rotated = options.rotation % 180 !== 0;
    const ratio = Math.min(
      1,
      options.width / (rotated ? sh : sw),
      preview ? 1200 / Math.max(sw, sh) : 1,
    );
    canvas.width = Math.max(1, Math.round((rotated ? sh : sw) * ratio));
    canvas.height = Math.max(1, Math.round((rotated ? sw : sh) * ratio));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Image editing is unavailable in this browser.");
    if (options.format === "image/jpeg") {
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((options.rotation * Math.PI) / 180);
    ctx.drawImage(
      bitmap,
      bitmap.width * inset,
      bitmap.height * inset,
      sw,
      sh,
      (-sw * ratio) / 2,
      (-sh * ratio) / 2,
      sw * ratio,
      sh * ratio,
    );
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) =>
          b
            ? resolve(b)
            : reject(new Error("This format is unsupported in your browser.")),
        options.format,
        options.quality,
      ),
    );
    if (blob.type !== options.format)
      throw new Error(
        "Your browser cannot export this format. Choose PNG or JPEG.",
      );
    return blob;
  } finally {
    bitmap.close();
    canvas.width = canvas.height = 0;
  }
}
