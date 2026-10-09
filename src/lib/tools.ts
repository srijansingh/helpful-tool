import { FileStack, Scissors, LayoutGrid, ImageIcon, Images, ScanLine, Droplets, Hash } from "lucide-react";
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
