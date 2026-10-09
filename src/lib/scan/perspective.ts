export interface Point {
  x: number;
  y: number;
}

// Order: top-left, top-right, bottom-right, bottom-left.
export type Quad = [Point, Point, Point, Point];

// Heckbert's square-to-quad projective mapping: given the unit square's
// four corners mapped onto an arbitrary quadrilateral, returns a function
// from normalized (u,v) in [0,1]x[0,1] to the corresponding point inside
// that quad. Verified numerically against known corner/midpoint cases
// before being wired into any UI — see the plan notes for the test cases.
function squareToQuad(quad: Quad) {
  const [p0, p1, p2, p3] = quad;
  const dx1 = p1.x - p2.x, dx2 = p3.x - p2.x, dx3 = p0.x - p1.x + p2.x - p3.x;
  const dy1 = p1.y - p2.y, dy2 = p3.y - p2.y, dy3 = p0.y - p1.y + p2.y - p3.y;

  let a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number;

  if (Math.abs(dx3) < 1e-9 && Math.abs(dy3) < 1e-9) {
    // Parallelogram — purely affine, no perspective term needed.
    a = p1.x - p0.x; b = p2.x - p1.x; c = p0.x;
    d = p1.y - p0.y; e = p2.y - p1.y; f = p0.y;
    g = 0; h = 0;
  } else {
    const denom = dx1 * dy2 - dx2 * dy1;
    g = (dx3 * dy2 - dx2 * dy3) / denom;
    h = (dx1 * dy3 - dx3 * dy1) / denom;
    a = p1.x - p0.x + g * p1.x;
    b = p3.x - p0.x + h * p3.x;
    c = p0.x;
    d = p1.y - p0.y + g * p1.y;
    e = p3.y - p0.y + h * p3.y;
    f = p0.y;
  }

  return (u: number, v: number): Point => {
    const w = g * u + h * v + 1;
    return { x: (a * u + b * v + c) / w, y: (d * u + e * v + f) / w };
  };
}

function dist(p: Point, q: Point): number {
  return Math.hypot(p.x - q.x, p.y - q.y);
}

// Picks an output size from the quad's own edge lengths — the longer of
// the two opposite edges on each axis, capped so a huge camera photo
// doesn't produce a huge output canvas.
const MAX_OUTPUT_DIMENSION = 2200;

export function outputSizeForQuad(quad: Quad): { width: number; height: number } {
  const [p0, p1, p2, p3] = quad;
  const width = Math.max(dist(p0, p1), dist(p3, p2));
  const height = Math.max(dist(p0, p3), dist(p1, p2));
  const scale = Math.min(1, MAX_OUTPUT_DIMENSION / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function bilinearSample(data: Uint8ClampedArray, srcW: number, srcH: number, x: number, y: number): [number, number, number, number] {
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const x1 = Math.min(x0 + 1, srcW - 1), y1 = Math.min(y0 + 1, srcH - 1);
  const cx = x0 < 0 ? 0 : x0 >= srcW ? srcW - 1 : x0;
  const cy = y0 < 0 ? 0 : y0 >= srcH ? srcH - 1 : y0;
  const fx = x - x0, fy = y - y0;

  const i00 = (cy * srcW + cx) * 4;
  const i10 = (cy * srcW + x1) * 4;
  const i01 = (y1 * srcW + cx) * 4;
  const i11 = (y1 * srcW + x1) * 4;

  const out: [number, number, number, number] = [0, 0, 0, 0];
  for (let c = 0; c < 4; c++) {
    const top = data[i00 + c] * (1 - fx) + data[i10 + c] * fx;
    const bottom = data[i01 + c] * (1 - fx) + data[i11 + c] * fx;
    out[c] = top * (1 - fy) + bottom * fy;
  }
  return out;
}

// Flattens the quad region of `source` into a new axis-aligned canvas,
// correcting the perspective distortion from the camera angle.
export function warpPerspective(source: HTMLCanvasElement | HTMLImageElement, quad: Quad): HTMLCanvasElement {
  const srcW = "naturalWidth" in source ? source.naturalWidth : source.width;
  const srcH = "naturalHeight" in source ? source.naturalHeight : source.height;

  const srcCanvas = document.createElement("canvas");
  srcCanvas.width = srcW;
  srcCanvas.height = srcH;
  const srcCtx = srcCanvas.getContext("2d")!;
  srcCtx.drawImage(source, 0, 0, srcW, srcH);
  const srcData = srcCtx.getImageData(0, 0, srcW, srcH).data;

  const { width: outW, height: outH } = outputSizeForQuad(quad);
  const mapToSource = squareToQuad(quad);

  const outCanvas = document.createElement("canvas");
  outCanvas.width = outW;
  outCanvas.height = outH;
  const outCtx = outCanvas.getContext("2d")!;
  const outImageData = outCtx.createImageData(outW, outH);
  const outData = outImageData.data;

  for (let oy = 0; oy < outH; oy++) {
    const v = oy / (outH - 1 || 1);
    for (let ox = 0; ox < outW; ox++) {
      const u = ox / (outW - 1 || 1);
      const { x: sx, y: sy } = mapToSource(u, v);
      const outIdx = (oy * outW + ox) * 4;
      if (sx < 0 || sx > srcW - 1 || sy < 0 || sy > srcH - 1) {
        outData[outIdx + 3] = 0; // outside the source image — transparent
        continue;
      }
      const [r, g, b, a] = bilinearSample(srcData, srcW, srcH, sx, sy);
      outData[outIdx] = r;
      outData[outIdx + 1] = g;
      outData[outIdx + 2] = b;
      outData[outIdx + 3] = a;
    }
  }

  outCtx.putImageData(outImageData, 0, 0);
  return outCanvas;
}
