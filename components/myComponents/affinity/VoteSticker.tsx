"use client";

import { cn } from "@/lib/utils";

export function VoteSticker({
  color,
  label,
  rotate = -8,
  className,
  size = "sm",
  filled = true,
}: {
  color: string;
  label?: string;
  rotate?: number;
  className?: string;
  size?: "sm" | "md";
  filled?: boolean;
}) {
  return (
    <span
      title={label}
      aria-hidden={!label}
      className={cn(
        "inline-block shrink-0 rounded-full border border-foreground/35",
        size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4",
        className
      )}
      style={{
        backgroundColor: filled ? color : "transparent",
        transform: `rotate(${rotate}deg)`,
      }}
    />
  );
}
