import { useScanStore } from "../../store/useScanStore";
import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { Point, Quad } from "../../lib/scan/perspective";

interface CropEditorProps {
  imageSrc: string;
  onConfirm: (quad: Quad, naturalWidth: number, naturalHeight: number) => void;
}

import { detectImagePaper, validQuad } from "../../lib/scan/detect";
const HANDLE_LABELS = ["Top-left", "Top-right", "Bottom-right", "Bottom-left"];

function defaultQuad(width: number, height: number): Quad {
  const mx = 0;
  const my = 0;
  return [
    { x: mx, y: my },
    { x: width - 1 - mx, y: my },
    { x: width - 1 - mx, y: height - 1 - my },
    { x: mx, y: height - 1 - my },
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
  const [natural, setNatural] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [quad, setQuad] = useState<Quad | null>(null);
  const [notice, setNotice] = useState("");
  const imageRef = useRef<HTMLImageElement | null>(null);
  const dragIndexRef = useRef<number | null>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setNatural({ width: img.naturalWidth, height: img.naturalHeight });
      imageRef.current = img;
      const detected = detectImagePaper(img);
      const draft = useScanStore.getState().cropDraft;
      setQuad(
        draft?.image === imageSrc
          ? draft.quad
          : detected || defaultQuad(img.naturalWidth, img.naturalHeight),
      );
      setNotice(
        detected
          ? "Edges suggested. Check all four corners before confirming."
          : "Edges could not be detected reliably. Adjust the corners manually.",
      );
    };
    img.onerror = () =>
      setNotice("This image could not be opened. Choose another photo.");
    img.src = imageSrc;
    return () => {
      img.onload = null;
    };
  }, [imageSrc]);

  useEffect(() => {
    if (quad) useScanStore.getState().setCropDraft({ image: imageSrc, quad });
  }, [quad, imageSrc]);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const update = () => setContainerWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const scaleToFit =
    natural && containerWidth ? Math.min(1, containerWidth / natural.width) : 0;
  const displaySize =
    natural && scaleToFit
      ? {
          width: natural.width * scaleToFit,
          height: natural.height * scaleToFit,
        }
      : null;

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
    const x =
      Math.min(Math.max(0, e.clientX - rect.left), displaySize.width) /
      scaleToFit;
    const y =
      Math.min(Math.max(0, e.clientY - rect.top), displaySize.height) /
      scaleToFit;
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
            style={{
              width: "100%",
              maxWidth: displaySize.width,
              aspectRatio: `${natural!.width} / ${natural!.height}`,
            }}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            <img
              src={imageSrc}
              alt=""
              className="pointer-events-none absolute inset-0 h-full w-full"
              draggable={false}
            />

            <svg
              className="pointer-events-none absolute inset-0 h-full w-full"
              viewBox={`0 0 ${displaySize.width} ${displaySize.height}`}
            >
              <polygon
                points={quad
                  .map((p) => {
                    const s = toScreen(p);
                    return `${s.x},${s.y}`;
                  })
                  .join(" ")}
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
                  aria-valuetext={`${Math.round(p.x)}, ${Math.round(p.y)}`}
                  onKeyDown={(e) => {
                    const delta = e.shiftKey ? 20 : 5;
                    const dx =
                      e.key === "ArrowLeft"
                        ? -delta
                        : e.key === "ArrowRight"
                          ? delta
                          : 0;
                    const dy =
                      e.key === "ArrowUp"
                        ? -delta
                        : e.key === "ArrowDown"
                          ? delta
                          : 0;
                    if (dx || dy) {
                      e.preventDefault();
                      setQuad(
                        (q) =>
                          q?.map((a, j) =>
                            i === j
                              ? {
                                  x: Math.max(
                                    0,
                                    Math.min(natural!.width - 1, a.x + dx),
                                  ),
                                  y: Math.max(
                                    0,
                                    Math.min(natural!.height - 1, a.y + dy),
                                  ),
                                }
                              : a,
                          ) as Quad,
                      );
                    }
                  }}
                  className="absolute h-11 w-11 -translate-x-1/2 -translate-y-1/2 touch-none rounded-full border-2 border-accent bg-bg shadow-md"
                  style={{ left: s.x, top: s.y }}
                />
              );
            })}
          </div>

          <p role="status" className="mt-3 text-sm">
            {notice}
          </p>
          <div className="editor-options">
            <button
              className="btn-secondary"
              onClick={() => {
                const q =
                  imageRef.current && detectImagePaper(imageRef.current);
                if (q) {
                  setQuad(q);
                  setNotice(
                    "Suggested corners updated. Check before confirming.",
                  );
                } else setNotice("No reliable edge found. Use manual corners.");
              }}
            >
              Detect edges
            </button>
            <button
              className="btn-secondary"
              onClick={() =>
                setQuad(defaultQuad(natural!.width, natural!.height))
              }
            >
              Use full photo
            </button>
          </div>
          <p className="mt-3 text-center text-xs text-muted">
            Drag the corners to match the edges of your document.
          </p>

          <button
            type="button"
            onClick={() => {
              if (!validQuad(quad, natural!.width, natural!.height)) {
                setNotice(
                  "Keep the corners in order and enclose a visible area. Avoid crossing edges.",
                );
                return;
              }
              onConfirm(quad, natural!.width, natural!.height);
            }}
            className="mt-4 w-full rounded-xl bg-accent px-5 py-3 font-display text-base font-bold text-white transition-transform active:scale-[0.99]"
          >
            Confirm Crop
          </button>
        </>
      )}
    </div>
  );
}
