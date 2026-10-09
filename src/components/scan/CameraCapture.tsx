import { useDocumentStore } from "../../store/useDocumentStore";
import { validateFiles } from "../../lib/importFiles";
import { useEffect, useRef, useState } from "react";
import { Camera, Upload, X } from "lucide-react";

interface CameraCaptureProps {
  // A single photo (camera shot, or one uploaded file) goes through the
  // crop + filter editor.
  onCapture: (dataUrl: string) => void;
  // Multiple uploaded photos skip the per-image editor entirely and land
  // straight in the page filmstrip, ready to reorder and export — cropping
  // five photos one at a time isn't what someone picking a batch wants.
  onCaptureMultiple: (dataUrls: string[]) => void;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function CameraCapture({
  onCapture,
  onCaptureMultiple,
}: CameraCaptureProps) {
  const [mode, setMode] = useState<"choose" | "camera">("choose");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // Camera permission is only requested once the user actively chooses
  // "Use Camera" — never on mount, so opening this page doesn't throw up a
  // permission prompt for someone who just wants to upload a photo.
  useEffect(() => {
    if (mode !== "camera") return;
    let cancelled = false;

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera not available in this browser.");
      return;
    }

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => setReady(true);
        }
      })
      .catch(() => {
        if (!cancelled)
          setCameraError(
            "Couldn't access the camera — check permissions, or upload a photo instead.",
          );
      });

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [mode]);

  const capture = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    onCapture(canvas.toDataURL("image/jpeg", 0.92));
  };

  const closeCamera = () => {
    setReady(false);
    setCameraError(null);
    setMode("choose");
  };

  const handleFiles = async (files: FileList) => {
    const list = await validateFiles(Array.from(files), "image/*");
    if (list.length === 0) return;
    const dataUrls = await Promise.all(list.map(readAsDataUrl));
    if (dataUrls.length === 1) onCapture(dataUrls[0]);
    else onCaptureMultiple(dataUrls);
  };

  const current = useDocumentStore((s) => s.current);
  if (mode === "choose") {
    return (
      <div>
        {current?.type.startsWith("image/") && (
          <button
            className="btn-secondary mb-3 w-full"
            onClick={async () => {
              try {
                const valid = await validateFiles([current], "image/*");
                onCapture(await readAsDataUrl(valid[0]));
              } catch (e) {
                setCameraError((e as Error).message);
              }
            }}
          >
            Scan current photo: {current.name}
          </button>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setMode("camera")}
            className="group flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-4 text-left transition-colors hover:border-accent/60 active:scale-[0.99]"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <Camera className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block font-display text-sm font-bold text-fg">
                Use Camera
              </span>
              <span className="block text-xs text-muted">
                Scan a page right now
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="group flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-4 text-left transition-colors hover:border-accent/60 active:scale-[0.99]"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <Upload className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block font-display text-sm font-bold text-fg">
                Upload Photos
              </span>
              <span className="block text-xs text-muted">
                One or several at once
              </span>
            </span>
          </button>
        </div>
        {cameraError && (
          <p className="text-bad mt-3" role="alert">
            {cameraError}
          </p>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e) => {
            if (e.target.files)
              void handleFiles(e.target.files).catch((e) =>
                setCameraError((e as Error).message),
              );
            e.target.value = "";
          }}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-black">
        {!cameraError && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover"
          />
        )}
        {cameraError && (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-6 text-center">
            <Camera className="h-8 w-8 text-muted" aria-hidden="true" />
            <p className="text-sm text-muted">{cameraError}</p>
          </div>
        )}
        <button
          type="button"
          onClick={closeCamera}
          aria-label="Close camera"
          className="absolute right-2 top-2 rounded-full bg-black/50 p-1.5 text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={capture}
          disabled={!ready}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 font-display text-base font-bold text-white transition-transform active:scale-[0.99] disabled:opacity-40"
        >
          <Camera className="h-5 w-5" aria-hidden="true" />
          Capture
        </button>
        <button
          type="button"
          onClick={closeCamera}
          className="rounded-xl border border-border bg-surface-2 px-5 py-3 font-display text-base font-bold text-fg"
        >
          Upload Instead
        </button>
      </div>
    </div>
  );
}
