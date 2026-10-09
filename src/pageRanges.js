// Parses a page-range string like "1-3,5,7-9" into a sorted, deduplicated
// list of 0-indexed page numbers, clamped to [1, pageCount].
export function parsePageRanges(input, pageCount) {
  const indices = new Set();
  const parts = input.split(",").map((p) => p.trim()).filter(Boolean);
  for (const part of parts) {
    const m = part.match(/^(\d+)(?:-(\d+))?$/);
    if (!m) continue;
    let start = parseInt(m[1], 10);
    let end = m[2] ? parseInt(m[2], 10) : start;
    if (start > end) [start, end] = [end, start];
    for (let p = start; p <= end; p++) {
      if (p >= 1 && p <= pageCount) indices.add(p - 1);
    }
  }
  return [...indices].sort((a, b) => a - b);
}
