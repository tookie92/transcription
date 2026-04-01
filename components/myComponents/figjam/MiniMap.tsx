"use client";

import React, { memo, useMemo } from "react";
import { cn } from "@/lib/utils";
import type { ClusterLabelData } from "@/types/figjam";

interface MiniMapProps {
  clusters: ClusterLabelData[];
  viewportPosition: { x: number; y: number };
  scale: number;
  viewportSize: { width: number; height: number };
  onNavigate: (x: number, y: number) => void;
  className?: string;
}

const MINIMAP_WIDTH = 140;
const MINIMAP_HEIGHT = 100;
const MINIMAP_PADDING = 40;

export const MiniMap = memo(function MiniMap({
  clusters,
  viewportPosition,
  scale,
  viewportSize,
  onNavigate,
  className,
}: MiniMapProps) {
  const bounds = useMemo(() => {
    if (clusters.length === 0) {
      return { minX: -200, minY: -200, maxX: 800, maxY: 600 };
    }

    const minX = Math.min(...clusters.map((c) => c.position.x)) - MINIMAP_PADDING;
    const minY = Math.min(...clusters.map((c) => c.position.y)) - MINIMAP_PADDING;
    const maxX = Math.max(...clusters.map((c) => c.position.x + (c.width ?? 400))) + MINIMAP_PADDING;
    const maxY = Math.max(...clusters.map((c) => c.position.y + (c.height ?? 200))) + MINIMAP_PADDING;

    return { minX, minY, maxX, maxY };
  }, [clusters]);

  const minimapScale = useMemo(() => {
    const contentWidth = bounds.maxX - bounds.minX;
    const contentHeight = bounds.maxY - bounds.minY;

    const scaleX = MINIMAP_WIDTH / contentWidth;
    const scaleY = MINIMAP_HEIGHT / contentHeight;

    return Math.min(scaleX, scaleY, 0.15);
  }, [bounds]);

  const toMinimap = (x: number, y: number) => ({
    x: (x - bounds.minX) * minimapScale,
    y: (y - bounds.minY) * minimapScale,
  });

  const viewportRect = useMemo(() => {
    const worldX = (-viewportPosition.x) / scale;
    const worldY = (-viewportPosition.y) / scale;
    const worldWidth = viewportSize.width / scale;
    const worldHeight = viewportSize.height / scale;

    const { x, y } = toMinimap(worldX, worldY);

    return {
      x,
      y,
      width: worldWidth * minimapScale,
      height: worldHeight * minimapScale,
    };
  }, [viewportPosition, scale, viewportSize, minimapScale, bounds]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const worldX = clickX / minimapScale + bounds.minX;
    const worldY = clickY / minimapScale + bounds.minY;

    onNavigate(worldX, worldY);
  };

  return (
    <div
      className={cn(
        "absolute right-4 top-20",
        "bg-card rounded-xl",
        "shadow-lg border border-border",
        "p-2",
        "z-30",
        className
      )}
      onClick={handleClick}
    >
      <div className="text-[9px] text-muted-foreground font-semibold tracking-wide mb-1.5 uppercase">
        Minimap
      </div>

      <div
        className="relative rounded-lg overflow-hidden"
        style={{
          width: MINIMAP_WIDTH,
          height: MINIMAP_HEIGHT,
          backgroundColor: "hsl(var(--muted))",
        }}
      >
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: "radial-gradient(circle, hsl(var(--border)) 0.5px, transparent 0.5px)",
            backgroundSize: "10px 10px",
          }}
        />

        {clusters.map((cluster) => {
          const { x, y } = toMinimap(cluster.position.x, cluster.position.y);
          const width = Math.max(12, (cluster.width ?? 400) * minimapScale);
          const height = Math.max(8, (cluster.height ?? 200) * minimapScale);
          return (
            <div
              key={cluster.id}
              className="absolute rounded-sm"
              style={{
                left: x,
                top: y,
                width,
                height,
                backgroundColor: "#B8B4FF",
                opacity: 0.7,
              }}
            />
          );
        })}

        <div
          className="absolute border-2 border-primary rounded pointer-events-none"
          style={{
            left: Math.max(0, viewportRect.x),
            top: Math.max(0, viewportRect.y),
            width: Math.min(viewportRect.width, MINIMAP_WIDTH - Math.max(0, viewportRect.x)),
            height: Math.min(viewportRect.height, MINIMAP_HEIGHT - Math.max(0, viewportRect.y)),
            opacity: 0.6,
          }}
        />
      </div>
    </div>
  );
});
