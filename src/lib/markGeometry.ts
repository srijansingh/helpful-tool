import type { Mark } from "./pdf/edit.ts";
export function moveMark(mark: Mark, dx: number, dy: number): Mark {
  const x = Math.max(0, Math.min(1 - mark.w, mark.x + dx));
  const y = Math.max(0, Math.min(1 - mark.h, mark.y + dy));
  return {
    ...mark,
    x,
    y,
    points: mark.points?.map(([px, py]) => [px + x - mark.x, py + y - mark.y]),
  };
}
export function resizeMark(mark: Mark, factor: number): Mark {
  const w = Math.min(1 - mark.x, mark.w * factor),
    h = Math.min(1 - mark.y, mark.h * factor);
  return {
    ...mark,
    w,
    h,
    size: Math.max(6, Math.min(120, mark.size * factor)),
    points: mark.points?.map(([x, y]) => [
      mark.x + (x - mark.x) * (mark.w ? w / mark.w : 1),
      mark.y + (y - mark.y) * (mark.h ? h / mark.h : 1),
    ]),
  };
}
