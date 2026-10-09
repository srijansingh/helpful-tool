import { useState } from "react";
import { Dropzone } from "../components/Dropzone";
import { FileList } from "../components/FileList";
import { StatusMessage, type Status } from "../components/StatusMessage";
import { RecentActivity } from "../components/RecentActivity";
import { ToolContent } from "../components/ToolContent";
import { AdSlot } from "../components/AdSlot";
import { useSeo } from "../hooks/useSeo";
import { useRecentActivity } from "../hooks/useRecentActivity";
import { imagesToPdf } from "../lib/pdf/imagesToPdf";
import { downloadBytes } from "../lib/download";

export default function ImagesToPdfPage() {
  useSeo(
    "Convert Images to PDF Online Free — JPG, PNG to PDF | PDF Toolkit",
    "Combine JPG, PNG, WebP and other images into a single PDF, right in your browser. No upload, no login."
  );

  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const { entries, logActivity } = useRecentActivity();

  const addFiles = (newFiles: File[]) => setFiles((prev) => [...prev, ...newFiles]);

  const handleConvert = async () => {
    if (files.length === 0) {
      setStatus({ kind: "error", message: "Add at least one image." });
      return;
    }
    setStatus({ kind: "working", message: "Converting…" });
    try {
      const bytes = await imagesToPdf(files);
      downloadBytes(bytes, "images.pdf", "application/pdf");
      setStatus({ kind: "done", message: "Done — images.pdf downloaded." });
      logActivity({ tool: "images-to-pdf", label: `Converted ${files.length} images to PDF` });
    } catch (e) {
      setStatus({ kind: "error", message: `Couldn't convert: ${(e as Error).message}` });
    }
  };

  return (
    <section>
      <h1 className="font-display text-2xl font-bold sm:text-3xl">Images to PDF</h1>
      <p className="mt-1 text-muted">
        Pick one or more images (JPG, PNG, WebP…), reorder them, then combine into one PDF.
      </p>

      <div className="mt-6">
        <Dropzone
          accept="image/*"
          multiple
          label="Drop images here or click to browse"
          hint="One page per image, in the order you add them"
          onFiles={addFiles}
        />
      </div>

      <div className="mt-5">
        <FileList files={files} onReorder={setFiles} />
      </div>

      <button
        type="button"
        onClick={handleConvert}
        className="mt-5 w-full rounded-xl bg-accent px-5 py-3 font-display text-base font-bold text-bg transition-transform active:scale-[0.99] sm:w-auto"
      >
        Convert &amp; Download
      </button>

      <StatusMessage status={status} />

      <RecentActivity entries={entries.filter((e) => e.tool === "images-to-pdf")} />

      <AdSlot label="Ad space — in-content" />

      <ToolContent
        intro="Most free image-to-PDF tools work by uploading your photos to a server, processing them there, and sending the result back. This tool converts your images entirely inside your browser using pdf-lib, an open-source library; your files never leave your computer."
        faqs={[
          { q: "Which image formats are supported?", a: "Any format your browser can display — JPG and PNG are kept at their original quality; other formats (WebP, GIF, BMP) are converted losslessly before being placed on the page." },
          { q: "Can I reorder images before converting?", a: "Yes — use the up/down arrows next to each image to set the page order in the final PDF." },
          { q: "Is my file actually uploaded anywhere?", a: "No. Every operation on this page runs in your browser's own JavaScript engine. There's no server call, no account, and nothing is stored once you close the tab." },
          { q: "Will large photos make a huge PDF?", a: "Each image is scaled to fit a reasonable page size, so you won't end up with an absurdly large page — though very high-resolution originals can still produce a sizeable file." },
        ]}
      />
    </section>
  );
}
