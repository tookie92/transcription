"use client";

import type { CSSProperties, MouseEventHandler, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { slipKindFromColor, slipStamp, slipStampClass, type SlipKind } from "@/lib/slip";

interface SlipFaceProps {
  kind: SlipKind;
  selected?: boolean;
  dragging?: boolean;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  onContextMenu?: MouseEventHandler<HTMLDivElement>;
}

export function SlipFace({
  kind,
  selected = false,
  dragging = false,
  className,
  style,
  children,
  onContextMenu,
}: SlipFaceProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-card text-foreground border border-border",
        selected && "ring-1 ring-foreground",
        dragging && "shadow-md",
        className
      )}
      style={style}
      data-kind={kind}
      onContextMenu={onContextMenu}
    >
      {children}
    </div>
  );
}

export function SlipStamp({
  kind,
  className,
}: {
  kind: SlipKind;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "font-mono text-[10px] tracking-widest uppercase",
        slipStampClass(kind),
        className
      )}
    >
      {slipStamp(kind)}
    </span>
  );
}

export function slipKindOf(color?: string, source?: string | null): SlipKind {
  return slipKindFromColor(color, source);
}
