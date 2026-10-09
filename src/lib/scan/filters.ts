export type FilterType = "original" | "grayscale" | "bw" | "enhance";

export const FILTERS: { id: FilterType; label: string }[] = [
  { id: "original", label: "Original" },
  { id: "enhance", label: "Enhance" },
  { id: "grayscale", label: "Grayscale" },
  { id: "bw", label: "B&W" },
];

// Always reads from `source` and writes to a new canvas — never mutates
// the input. Filters are meant to be swapped freely in the editor, so
// each one must be derived fresh from the original flattened scan, not
// stacked on top of whatever filter was applied last.
export function applyFilter(source: HTMLCanvasElement, filter: FilterType): HTMLCanvasElement {
  const { width, height } = source;
  const out = document.createElement("canvas");
  out.width = width;
  out.height = height;
  const outCtx = out.getContext("2d")!;
  outCtx.drawImage(source, 0, 0);

  if (filter === "original") return out;

  const imageData = outCtx.getImageData(0, 0, width, height);
  const data = imageData.data;

  if (filter === "grayscale") {
    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      data[i] = data[i + 1] = data[i + 2] = gray;
    }
  } else if (filter === "bw") {
    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      const v = gray > 150 ? 255 : 0;
      data[i] = data[i + 1] = data[i + 2] = v;
    }
  } else if (filter === "enhance") {
    const contrast = 1.3;
    const brightness = 12;
    for (let i = 0; i < data.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        const v = (data[i + c] - 128) * contrast + 128 + brightness;
        data[i + c] = v < 0 ? 0 : v > 255 ? 255 : v;
      }
    }
  }

  outCtx.putImageData(imageData, 0, 0);
  return out;
}
