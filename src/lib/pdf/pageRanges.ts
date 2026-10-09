// The inverse of parsePageRanges: collapses a sorted list of 0-indexed
// page numbers back into a compact 1-indexed range string ("1-3,5,7-9"),
// used so clicking page thumbnails can drive the same text field typing
// a range does, and vice versa.
export function stringifyPageRanges(indices: number[]): string {
  if (indices.length === 0) return "";
  const sorted = [...new Set(indices)].sort((a, b) => a - b);
  const parts: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (let i = 1; i <= sorted.length; i++) {
    const current = sorted[i];
    if (current === prev + 1) {
      prev = current;
      continue;
    }
    parts.push(start === prev ? `${start + 1}` : `${start + 1}-${prev + 1}`);
    start = current;
    prev = current;
  }
  return parts.join(",");
}

// Parses a page-range string like "1-3,5,7-9" into a sorted, deduplicated
// list of 0-indexed page numbers, clamped to [1, pageCount].
export function parsePageRanges(input: string, pageCount: number): number[] {
  const indices = new Set<number>();
  const parts = input.split(",").map((p) => p.trim()).filter(Boolean);
  for (const part of parts) {
    const m = part.match(/^(\d+)(?:-(\d+))?$/);
    if (!m) continue;
    let start = parseInt(m[1], 10);
    let end = m[2] ? parseInt(m[2], 10) : start;
    if (start > end) [start, end] = [end, start];
    start = Math.max(1, start);
    end = Math.min(pageCount, end);
    for (let p = start; p <= end; p++) {
      if (p >= 1 && p <= pageCount) indices.add(p - 1);
    }
  }
  return [...indices].sort((a, b) => a - b);
}
