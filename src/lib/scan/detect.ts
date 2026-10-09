import type { Quad } from "./perspective";
// Conservative light-paper detection. Refuse low contrast or ambiguous frames.
export function detectPaper(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): Quad | null {
  const light = (i: number) =>
    (data[i * 4] + data[i * 4 + 1] + data[i * 4 + 2]) / 3;
  const border: number[] = [];
  for (let x = 0; x < width; x += 3) {
    border.push(light(x), light((height - 1) * width + x));
  }
  for (let y = 0; y < height; y += 3)
    border.push(light(y * width), light(y * width + width - 1));
  border.sort((a, b) => a - b);
  const bg = border[Math.floor(border.length / 2)];
  if (bg > 225) return null;
  const threshold = Math.min(245, bg + 25);
  const seen = new Uint8Array(width * height);
  let best: number[] = [];
  for (let start = 0; start < seen.length; start++) {
    if (seen[start] || light(start) < threshold) continue;
    const queue = [start];
    seen[start] = 1;
    for (let j = 0; j < queue.length; j++) {
      const i = queue[j],
        x = i % width,
        y = Math.floor(i / width);
      for (const n of [
        x ? i - 1 : -1,
        x < width - 1 ? i + 1 : -1,
        y ? i - width : -1,
        y < height - 1 ? i + width : -1,
      ])
        if (n >= 0 && !seen[n] && light(n) >= threshold) {
          seen[n] = 1;
          queue.push(n);
        }
    }
    if (queue.length > best.length) best = queue;
  }
  if (
    best.length < width * height * 0.15 ||
    best.length > width * height * 0.95
  )
    return null;
  let tl = Infinity,
    tr = -Infinity,
    br = -Infinity,
    bl = Infinity;
  const quad: Quad = [
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
  ];
  for (const i of best) {
    const x = i % width,
      y = Math.floor(i / width);
    if (x + y < tl) {
      tl = x + y;
      quad[0] = { x, y };
    }
    if (x - y > tr) {
      tr = x - y;
      quad[1] = { x, y };
    }
    if (x + y > br) {
      br = x + y;
      quad[2] = { x, y };
    }
    if (x - y < bl) {
      bl = x - y;
      quad[3] = { x, y };
    }
  }
  return validQuad(quad, width, height) ? quad : null;
}
export function validQuad(q: Quad, width: number, height: number) {
  if (
    q.some(
      (p) =>
        !Number.isFinite(p.x) ||
        !Number.isFinite(p.y) ||
        p.x < 0 ||
        p.y < 0 ||
        p.x > width ||
        p.y > height,
    )
  )
    return false;
  const cross = q.map((a, i) => {
    const b = q[(i + 1) % 4],
      c = q[(i + 2) % 4];
    return (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
  });
  return (
    cross.every((v) => v > 0) &&
    Math.abs(
      q.reduce((sum, a, i) => {
        const b = q[(i + 1) % 4];
        return sum + a.x * b.y - a.y * b.x;
      }, 0),
    ) /
      2 >
      width * height * 0.01
  );
}
export function detectImagePaper(image: HTMLImageElement): Quad | null {
  const c = document.createElement("canvas");
  const s = Math.min(
    1,
    360 / Math.max(image.naturalWidth, image.naturalHeight),
  );
  c.width = Math.round(image.naturalWidth * s);
  c.height = Math.round(image.naturalHeight * s);
  const ctx = c.getContext("2d")!;
  ctx.drawImage(image, 0, 0, c.width, c.height);
  const q = detectPaper(
    ctx.getImageData(0, 0, c.width, c.height).data,
    c.width,
    c.height,
  );
  return q?.map((p) => ({ x: p.x / s, y: p.y / s })) as Quad | null;
}
