import {
  FileStack,
  Scissors,
  LayoutGrid,
  ImageIcon,
  Images,
  ScanLine,
  Droplets,
  Hash,
  PenLine,
  Minimize2,
  ScanText,
  ShieldCheck,
  BookOpen,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface ToolDef {
  to: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  description: string;
}

export const TOOLS: ToolDef[] = [
  {
    to: "/booklet",
    label: "Print a booklet",
    shortLabel: "Booklet",
    icon: BookOpen,
    description: "Arrange pages on A4 or Letter sheets for folding.",
  },
  {
    to: "/redact",
    label: "Redact to photo PDF",
    shortLabel: "Redact",
    icon: ShieldCheck,
    description:
      "Remove marked pixels and rebuild without original text or attachments.",
  },
  {
    to: "/security",
    label: "Protect & optimize PDF",
    shortLabel: "Protect",
    icon: ShieldCheck,
    description:
      "Password protection, known-password unlock and structural optimization.",
  },
  {
    to: "/ocr",
    label: "Read text from scans",
    shortLabel: "OCR",
    icon: ScanText,
    description: "Local English/Hindi OCR and searchable PDF export.",
  },
  {
    to: "/image",
    label: "Edit image",
    shortLabel: "Image",
    icon: ImageIcon,
    description: "Crop, rotate, resize, compress and convert photos.",
  },
  {
    to: "/compress",
    label: "Reduce scan PDF size",
    shortLabel: "Compress",
    icon: Minimize2,
    description: "Make photo PDFs smaller for upload limits.",
  },
  {
    to: "/edit",
    label: "Edit, sign & fill",
    shortLabel: "Edit",
    icon: PenLine,
    description: "Read, annotate, add visual signatures and fill PDF forms.",
  },
  {
    to: "/scan",
    label: "Scan Document",
    shortLabel: "Scan",
    icon: ScanLine,
    description: "Camera or upload, crop, filter, export to PDF.",
  },
  {
    to: "/merge",
    label: "Merge PDFs",
    shortLabel: "Merge",
    icon: FileStack,
    description: "Combine two or more PDFs into one file.",
  },
  {
    to: "/split",
    label: "Split PDF",
    shortLabel: "Split",
    icon: Scissors,
    description: "Pull out pages, or split every page apart.",
  },
  {
    to: "/organize",
    label: "Organize PDF",
    shortLabel: "Organize",
    icon: LayoutGrid,
    description: "Reorder, delete, and rotate pages.",
  },
  {
    to: "/images-to-pdf",
    label: "Images → PDF",
    shortLabel: "To PDF",
    icon: ImageIcon,
    description: "Combine JPG, PNG, and more into a PDF.",
  },
  {
    to: "/pdf-to-images",
    label: "PDF → Images",
    shortLabel: "To Image",
    icon: Images,
    description: "Export every page as a JPG or PNG.",
  },
  {
    to: "/watermark",
    label: "Watermark PDF",
    shortLabel: "Watermark",
    icon: Droplets,
    description: "Stamp text across every page.",
  },
  {
    to: "/page-numbers",
    label: "Page Numbers",
    shortLabel: "Numbers",
    icon: Hash,
    description: "Number every page, your way.",
  },
];

// The bottom tab bar (mobile) can't fit all of TOOLS — capped at a native
// app's usual 5 tabs, with the rest reachable via the command palette
// ("More" opens the same Cmd/Ctrl+K search everyone else uses).
export const PRIMARY_MOBILE_TOOLS = TOOLS.slice(0, 4);

export const TOOL_GROUPS = [
  {
    name: "Create & convert",
    paths: [
      "/scan",
      "/merge",
      "/images-to-pdf",
      "/pdf-to-images",
      "/image",
      "/ocr",
    ],
  },
  {
    name: "Organize",
    paths: ["/split", "/organize", "/page-numbers", "/booklet"],
  },
  { name: "Edit & sign", paths: ["/edit", "/watermark"] },
  { name: "Reduce & secure", paths: ["/compress", "/security", "/redact"] },
];
const aliases: Record<string, string> = {
  "/merge": "combine join PDFs documents pages",
  "/split": "extract separate select pages",
  "/organize": "reorder move delete remove rotate crop duplicate pages",
  "/images-to-pdf": "photo picture photos pictures jpg png convert PDF",
  "/pdf-to-images":
    "export extract photo picture photos pictures jpg png convert PDF pages",
  "/edit": "fill form forms annotate annotation signature signing draw text",
  "/watermark": "stamp logo confidential draft",
  "/page-numbers": "number numbering pagination page pages",
  "/compress": "smaller size upload limit reduce compression",
  "/security": "password encryption encrypt decrypt unlock optimize",
  "/ocr": "recognize recognition searchable text Hindi English scan scans",
  "/booklet": "print printing fold sheets paper binding",
  "/image": "photo picture photos pictures crop rotate resize webp jpg png",
  "/scan": "camera photo document documents scanning",
  "/redact": "black out hide sensitive erase remove permanently",
};
export function matchesTool(
  tool: Pick<ToolDef, "to" | "label" | "description">,
  query: string,
): boolean {
  const haystack =
    `${tool.label} ${tool.description} ${aliases[tool.to] ?? ""}`.toLowerCase();
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .every((word) => haystack.includes(word));
}
