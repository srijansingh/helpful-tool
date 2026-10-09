import { PDFDocument, degrees } from "pdf-lib";

export interface OrganizeSource {
  bytes: ArrayBuffer;
  pageCount: number;
  // Each source page's own /Rotate angle, read once at load time — a
  // user-applied rotation is added on top of this, never replaces it.
  rotations: number[];
}

export async function loadOrganizeSource(file: File): Promise<OrganizeSource> {
  const bytes = await file.arrayBuffer();
  const doc = await PDFDocument.load(bytes);
  const rotations = doc.getPages().map((p) => p.getRotation().angle);
  return { bytes, pageCount: doc.getPageCount(), rotations };
}

export interface OrganizePageState {
  id: string;
  index: number; // position in the original source document
  crop?: number;
  paper?: "a4" | "letter";
  rotation: number; // user-added rotation: 0 | 90 | 180 | 270
}

// Rebuilds a PDF from the current page order/selection/rotation — pages
// the user deleted are simply absent from `pages`, and the array order is
// the output order.
export async function buildOrganizedPdf(
  bytes: ArrayBuffer,
  rotations: number[],
  pages: OrganizePageState[],
): Promise<Uint8Array> {
  if (!pages.length)
    throw new Error("Keep at least one page before exporting.");
  const src = await PDFDocument.load(bytes);
  const out = await PDFDocument.create();
  const copied = await out.copyPages(
    src,
    pages.map((p) => p.index),
  );
  copied.forEach((page, i) => {
    const total = (rotations[pages[i].index] + pages[i].rotation) % 360;
    page.setRotation(degrees(total));
    if (pages[i].crop) {
      const b = page.getCropBox();
      const inset = Math.min(0.4, Math.max(0, pages[i].crop! / 100));
      page.setCropBox(
        b.x + b.width * inset,
        b.y + b.height * inset,
        b.width * (1 - 2 * inset),
        b.height * (1 - 2 * inset),
      );
    }
    out.addPage(page);
  });
  return out.save();
}
