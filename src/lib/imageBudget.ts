export const MAX_IMAGE_PIXELS = 32_000_000;
export function checkImageDimensions(width: number, height: number) {
  if (
    !width ||
    !height ||
    !Number.isFinite(width * height) ||
    width * height > MAX_IMAGE_PIXELS ||
    Math.max(width, height) > 16000
  )
    throw new Error(
      "This image is too large to edit safely. Use a photo up to 32 megapixels and 16,000 pixels per edge.",
    );
}
export function headerImageDimensions(
  bytes: Uint8Array,
): [number, number] | null {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length >= 24 && bytes[0] === 0x89 && bytes[1] === 0x50)
    return [v.getUint32(16), v.getUint32(20)];
  if (bytes.length >= 10 && bytes[0] === 0x47)
    return [v.getUint16(6, true), v.getUint16(8, true)];
  if (bytes.length >= 26 && bytes[0] === 0x42)
    return [Math.abs(v.getInt32(18, true)), Math.abs(v.getInt32(22, true))];
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    let i = 2;
    while (i + 8 < bytes.length) {
      if (bytes[i++] !== 0xff) break;
      const marker = bytes[i++];
      if (marker === 0xd9 || marker === 0xda) break;
      if (
        marker === 0xd8 ||
        marker === 0x01 ||
        (marker >= 0xd0 && marker <= 0xd7)
      )
        continue;
      const length = v.getUint16(i);
      if (length < 2 || i + length > bytes.length) break;
      if (
        [
          0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd,
          0xce, 0xcf,
        ].includes(marker)
      )
        return [v.getUint16(i + 5), v.getUint16(i + 3)];
      i += length;
    }
  }
  return null;
}
export async function prepareImage(file: File) {
  if (file.size > 25 * 1024 * 1024)
    throw new Error(
      "Choose an image smaller than 25 MB for on-device editing.",
    );
  const dimensions = headerImageDimensions(
    new Uint8Array(await file.slice(0, 65536).arrayBuffer()),
  );
  if (dimensions) checkImageDimensions(...dimensions);
  let bitmap: ImageBitmap | undefined;
  try {
    bitmap = await createImageBitmap(file);
    checkImageDimensions(bitmap.width, bitmap.height);
  } catch (e) {
    if (e instanceof Error && /too large/.test(e.message)) throw e;
    throw new Error(
      `${file.name}: this image is damaged or cannot be opened by your browser. Choose a JPG, PNG or supported WebP image.`,
    );
  } finally {
    bitmap?.close();
  }
  return file;
}
