import { useEffect, useRef, useState } from "react";
import { FileText } from "lucide-react";
import { renderPageThumbnail } from "../lib/pdf/pageThumbnails";
export function PageThumbnail({
  file,
  index,
  src,
  rotation = 0,
  crop = 0,
}: {
  file?: File;
  index: number;
  src?: string;
  rotation?: number;
  crop?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [url, setUrl] = useState(src || "");
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setUrl(src || "");
    setFailed(false);
    if (!file || src) return;
    const controller = new AbortController();
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      void renderPageThumbnail(file, index, controller.signal)
        .then((u) => {
          if (!controller.signal.aborted) setUrl(u);
        })
        .catch(() => {
          if (!controller.signal.aborted) setFailed(true);
        });
    };
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          observer.disconnect();
          start();
        }
      },
      { rootMargin: "100px" },
    );
    if (ref.current) observer.observe(ref.current);
    return () => {
      observer.disconnect();
      controller.abort();
    };
  }, [file, index, src]);
  return (
    <div
      ref={ref}
      className="aspect-[3/4] w-full overflow-hidden bg-surface flex items-center justify-center"
    >
      {url ? (
        <img
          src={url}
          alt={`Page ${index + 1}`}
          draggable={false}
          className="h-full w-full object-contain"
          style={{
            transform: `rotate(${rotation}deg) scale(${1 / (1 - Math.min(0.4, crop / 100) * 2)})`,
          }}
        />
      ) : failed ? (
        <span className="text-xs text-muted p-2">Preview unavailable</span>
      ) : (
        <FileText
          className="text-muted h-8 w-8"
          aria-label={`Page ${index + 1} preview loading`}
        />
      )}
    </div>
  );
}
