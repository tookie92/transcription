"use client";

interface ZoomControlsProps {
  zoomIn: () => void;
  zoomOut: () => void;
  resetTransform: () => void;
  centerView: () => void;
  scale: number;
}

export function ZoomControls({
  zoomIn,
  zoomOut,
  resetTransform,
  centerView,
  scale,
}: ZoomControlsProps) {
  return (
    <div className="absolute bottom-4 right-4 bg-card border border-border rounded-xl shadow-2xl p-3 flex gap-2 z-40 animate-fade-in">
      <button
        onClick={zoomIn}
        className="w-9 h-9 rounded-full bg-background/80 hover:bg-primary/20 transition flex items-center justify-center text-primary font-bold shadow-md border border-border"
        title="Zoom avant (+)"
      >
        <span className="sr-only">Zoom avant</span>
        <svg
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path d="M12 5v14m7-7H5" />
        </svg>
      </button>
      <button
        onClick={zoomOut}
        className="w-9 h-9 rounded-full bg-background/80 hover:bg-primary/20 transition flex items-center justify-center text-primary font-bold shadow-md border border-border"
        title="Zoom arrière (-)"
      >
        <span className="sr-only">Zoom arrière</span>
        <svg
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path d="M5 12h14" />
        </svg>
      </button>
      <button
        onClick={resetTransform}
        className="w-9 h-9 rounded-full bg-background/80 hover:bg-primary/20 transition flex items-center justify-center text-primary font-bold shadow-md border border-border"
        title="Réinitialiser (0)"
      >
        <span className="sr-only">Réinitialiser</span>
        <svg
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path d="M4 4v5h.582M20 20v-5h-.581M5 19A9 9 0 1 1 19 5" />
        </svg>
      </button>
      <button
        onClick={centerView}
        className="w-9 h-9 rounded-full bg-background/80 hover:bg-primary/20 transition flex items-center justify-center text-primary font-bold shadow-md border border-border"
        title="Centrer (C)"
      >
        <span className="sr-only">Centrer</span>
        <svg
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v2m0 16v2m10-10h-2M4 12H2" />
        </svg>
      </button>
      <span className="ml-3 px-3 py-1 rounded-full bg-background/80 text-primary font-semibold text-xs shadow border border-border animate-zoom-indicator">
        {Math.round(scale * 100)}%
      </span>
    </div>
  );
}
