"use client";

import { Grid3X3, Maximize2 } from "lucide-react";

interface ZoomControlsProps {
  zoomIn: () => void;
  zoomOut: () => void;
  resetTransform: () => void;
  centerView: () => void;
  scale: number;
  showGrid?: boolean;
  onToggleGrid?: () => void;
}

export function ZoomControls({
  zoomIn,
  zoomOut,
  resetTransform,
  centerView,
  scale,
  showGrid = false,
  onToggleGrid,
}: ZoomControlsProps) {
  return (
    <div className="fixed bottom-4 right-4 bg-card border border-border rounded-xl shadow-2xl p-3 flex gap-2 z-40 animate-fade-in mt-[160px]">
      <button
        onClick={zoomIn}
        className="w-9 h-9 rounded-lg bg-background/80 hover:bg-primary/20 transition flex items-center justify-center text-primary shadow-md border border-border"
        title="Zoom in (Ctrl++)"
      >
        <span className="sr-only">Zoom in</span>
        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M12 5v14m7-7H5" />
        </svg>
      </button>

      <button
        onClick={zoomOut}
        className="w-9 h-9 rounded-lg bg-background/80 hover:bg-primary/20 transition flex items-center justify-center text-primary shadow-md border border-border"
        title="Zoom out (Ctrl+-)"
      >
        <span className="sr-only">Zoom out</span>
        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M5 12h14" />
        </svg>
      </button>

      <button
        onClick={resetTransform}
        className="w-9 h-9 rounded-lg bg-background/80 hover:bg-primary/20 transition flex items-center justify-center text-primary shadow-md border border-border"
        title="Reset zoom (Ctrl+0)"
      >
        <span className="sr-only">Reset</span>
        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M4 4v5h.582M20 20v-5h-.581M5 19A9 9 0 1 1 19 5" />
        </svg>
      </button>

      <button
        onClick={centerView}
        className="w-9 h-9 rounded-lg bg-background/80 hover:bg-primary/20 transition flex items-center justify-center text-primary shadow-md border border-border"
        title="Center view (Ctrl+1)"
      >
        <span className="sr-only">Center</span>
        <Maximize2 className="w-4 h-4" />
      </button>

      {onToggleGrid && (
        <button
          onClick={onToggleGrid}
          className={`w-9 h-9 rounded-lg transition flex items-center justify-center shadow-md border ${
            showGrid
              ? "bg-primary/20 text-primary border-primary"
              : "bg-background/80 text-muted-foreground border-border hover:bg-primary/10"
          }`}
          title="Toggle grid"
        >
          <span className="sr-only">Toggle grid</span>
          <Grid3X3 className="w-4 h-4" />
        </button>
      )}

      <span className="ml-2 px-3 py-1 rounded-lg bg-background/80 text-primary font-semibold text-xs shadow border border-border">
        {Math.round(scale * 100)}%
      </span>
    </div>
  );
}
