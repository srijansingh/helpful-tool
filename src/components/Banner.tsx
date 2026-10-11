import type { ReactNode } from "react";
export type BannerVariant = "neutral" | "info" | "warning" | "success";
interface BannerProps {
  variant?: BannerVariant;
  children: ReactNode;
}
export function Banner({ variant = "neutral", children }: BannerProps) {
  return (
    <div className="banner" data-variant={variant} role="status">
      {children}
    </div>
  );
}
