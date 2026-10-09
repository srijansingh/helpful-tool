export function downscale(source: HTMLCanvasElement, maxWidth: number): HTMLCanvasElement {
  const scale = Math.min(1, maxWidth / source.width);
  const out = document.createElement("canvas");
  out.width = Math.max(1, Math.round(source.width * scale));
  out.height = Math.max(1, Math.round(source.height * scale));
  out.getContext("2d")!.drawImage(source, 0, 0, out.width, out.height);
  return out;
}
