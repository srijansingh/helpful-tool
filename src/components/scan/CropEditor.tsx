import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { Point, Quad } from "../../lib/scan/perspective";

interface CropEditorProps {
  imageSrc: string;
  onConfirm: (quad: Quad, naturalWidth: number, naturalHeight: number) => void;
}

const HANDLE_LABELS = ["Top-left", "Top-right", "Bottom-right", "Bottom-left"];

function defaultQuad(width: number, height: number): Quad {
  const mx = width * 0.08;
  const my = height * 0.08;
  return [
    { x: mx, y: my },
    { x: width - mx, y: my },
    { x: width - mx, y: height - my },
    { x: mx, y: height - my },
  ];
}

export function CropEditor({ imageSrc, onConfirm }: CropEditorProps) {
  // wrapperRef is mounted unconditionally from the first render, so its
  // width can be measured before the image has even loaded. imageBoxRef
  // only exists once the real crop UI is showing, which is fine since
  // pointer dragging can only happen once that's visible anyway. (An
  // earlier version measured a ref that only rendered once the
  // measurement already existed — a deadlock that never resolved.)
  const wrapperRef = useRef<HTMLDivElement>(null);
  const imageBoxRef = useRef<HTMLDivElement>(null);
  const [natural, setNatural] = useState<{ width: number; height: number } | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [quad, setQuad] = useState<Quad | null>(null);
  const dragIndexRef = useRef<number | null>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setNatural({ width: img.naturalWidth, height: img.naturalHeight });
      setQuad(defaultQuad(img.naturalWidth, img.naturalHeight));
    };
    img.src = imageSrc;
  }, [imageSrc]);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const update = () => setContainerWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const scaleToFit = natural && containerWidth ? Math.min(1, containerWidth / natural.width) : 0;
  const displaySize = natural && scaleToFit ? { width: natural.width * scaleToFit, height: natural.height * scaleToFit } : null;

  const toScreen = (p: Point) => ({ x: p.x * scaleToFit, y: p.y * scaleToFit });

  const handlePointerDown = (i: number) => (e: ReactPointerEvent) => {
    e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);
    dragIndexRef.current = i;
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const i = dragIndexRef.current;
    if (i === null || !imageBoxRef.current || !displaySize) return;
    const rect = imageBoxRef.current.getBoundingClientRect();
    const x = Math.min(Math.max(0, e.clientX - rect.left), displaySize.width) / scaleToFit;
    const y = Math.min(Math.max(0, e.clientY - rect.top), displaySize.height) / scaleToFit;
    setQuad((prev) => {
      if (!prev) return prev;
      const next = [...prev] as Quad;
      next[i] = { x, y };
      return next;
    });
  };

  const handlePointerUp = () => {
    dragIndexRef.current = null;
  };

  return (
    <div ref={wrapperRef}>
      {!quad || !displaySize ? (
        <div className="flex aspect-[3/4] w-full items-center justify-center rounded-xl bg-surface-2">
          <span className="h-10 w-10 animate-pulse rounded-full bg-border" />
        </div>
      ) : (
        <>
          <div
            ref={imageBoxRef}
            className="relative mx-auto touch-none select-none overflow-hidden rounded-xl bg-black"
            style={{ width: "100%", maxWidth: displaySize.width, aspectRatio: `${natural!.width} / ${natural!.height}` }}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            <img src={imageSrc} alt="" className="pointer-events-none absolute inset-0 h-full w-full" draggable={false} />

            <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${displaySize.width} ${displaySize.height}`}>
              <polygon
                points={quad.map((p) => { const s = toScreen(p); return `${s.x},${s.y}`; }).join(" ")}
                className="fill-accent/20 stroke-accent"
                strokeWidth={2}
              />
            </svg>

            {quad.map((p, i) => {
              const s = toScreen(p);
              return (
                <div
                  key={i}
                  role="slider"
                  aria-label={`${HANDLE_LABELS[i]} corner`}
                  tabIndex={0}
                  onPointerDown={handlePointerDown(i)}
                  className="absolute h-7 w-7 -translate-x-1/2 -translate-y-1/2 touch-none rounded-full border-2 border-accent bg-bg shadow-md"
                  style={{ left: s.x, top: s.y }}
                />
              );
            })}
          </div>

          <p className="mt-3 text-center text-xs text-muted">Drag the corners to match the edges of your document.</p>

          <button
            type="button"
            onClick={() => onConfirm(quad, natural!.width, natural!.height)}
            className="mt-4 w-full rounded-xl bg-accent px-5 py-3 font-display text-base font-bold text-bg transition-transform active:scale-[0.99]"
          >
            Confirm Crop
          </button>
        </>
      )}
    </div>
  );
}
