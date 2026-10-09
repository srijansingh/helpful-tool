export function PageWindow({
  count,
  offset,
  onOffset,
}: {
  count: number;
  offset: number;
  onOffset: (n: number) => void;
}) {
  if (count <= 36) return null;
  return (
    <div
      className="flex items-center justify-between gap-2 my-3"
      aria-label="Page thumbnail navigation"
    >
      <button
        className="btn-secondary"
        disabled={offset === 0}
        onClick={() => onOffset(Math.max(0, offset - 36))}
      >
        Previous pages
      </button>
      <label className="text-sm">
        Show from page{" "}
        <input
          className="field w-20"
          aria-label="First thumbnail page"
          type="number"
          min="1"
          max={count}
          value={offset + 1}
          onChange={(e) =>
            onOffset(
              Math.max(0, Math.min(count - 1, Number(e.target.value) - 1)),
            )
          }
        />
        <span className="text-muted"> of {count}</span>
      </label>
      <button
        className="btn-secondary"
        disabled={offset + 36 >= count}
        onClick={() => onOffset(offset + 36)}
      >
        Next pages
      </button>
    </div>
  );
}
