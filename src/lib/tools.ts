import { FileStack, Scissors, ImageIcon, Images, ScanLine } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface ToolDef {
  to: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
}

export const TOOLS: ToolDef[] = [
  { to: "/scan", label: "Scan Document", shortLabel: "Scan", icon: ScanLine },
  { to: "/merge", label: "Merge PDFs", shortLabel: "Merge", icon: FileStack },
  { to: "/split", label: "Split PDF", shortLabel: "Split", icon: Scissors },
  { to: "/images-to-pdf", label: "Images → PDF", shortLabel: "To PDF", icon: ImageIcon },
  { to: "/pdf-to-images", label: "PDF → Images", shortLabel: "To Image", icon: Images },
];
