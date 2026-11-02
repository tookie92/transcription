"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { CastFiche } from "@/components/myComponents/CastFiche";
import { cn } from "@/lib/utils";

export interface CastPeekPersona {
  _id: string;
  name: string;
  occupation: string;
  quote: string;
  goals: string[];
  frustrations: string[];
  profileImage?: string | null;
  basedOn?: {
    groups: number;
    insights: number;
    groupTitles: string[];
    packetIds?: string[];
  };
}

/** Screen-space rect of the WallCast (or spawn) to park the peek beside. */
export interface CastPeekAnchor {
  left: number;
  top: number;
  width: number;
  height: number;
}

const PEEK_WIDTH = 360;
const GAP = 12;
const DOCK_CLEARANCE = 88;
const EDGE = 12;

function placeBeside(
  anchor: CastPeekAnchor,
  peekHeight: number
): { left: number; top: number } {
  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const maxBottom = vh - DOCK_CLEARANCE;

  let left = anchor.left + anchor.width + GAP;
  if (left + PEEK_WIDTH > vw - EDGE) {
    left = anchor.left - PEEK_WIDTH - GAP;
  }
  left = Math.max(EDGE, Math.min(left, vw - PEEK_WIDTH - EDGE));

  let top = anchor.top;
  if (top + peekHeight > maxBottom) {
    top = maxBottom - peekHeight;
  }
  top = Math.max(EDGE, top);

  return { left, top };
}

export function CastPeek({
  persona,
  onClose,
  onDelete,
  placement = "wall",
  trayOpen = false,
  anchor = null,
}: {
  persona: CastPeekPersona;
  onClose: () => void;
  onDelete?: () => void;
  placement?: "wall" | "page";
  /** Shift peek toward canvas when the tray sidebar is open (legacy bottom mode). */
  trayOpen?: boolean;
  /** Prefer parking beside this screen rect (WallCast). */
  anchor?: CastPeekAnchor | null;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ left: number; top: number } | null>(
    null
  );

  useLayoutEffect(() => {
    if (!anchor || placement !== "wall") {
      setCoords(null);
      return;
    }
    const height = panelRef.current?.offsetHeight ?? 320;
    setCoords(placeBeside(anchor, height));
  }, [anchor, placement, persona._id]);

  // Dismiss on pointer outside the peek (and outside wall casts — handled by toggle).
  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (panelRef.current?.contains(target)) return;
      const el = target instanceof Element ? target : null;
      if (el?.closest?.("[data-wall-cast]")) return;
      onClose();
    };
    // Defer so the opening click does not immediately dismiss.
    const timer = window.setTimeout(() => {
      window.addEventListener("pointerdown", handlePointerDown, true);
    }, 0);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [onClose, persona._id]);

  const anchored = placement === "wall" && anchor && coords;

  return (
    <div
      ref={panelRef}
      className={cn(
        "z-[60] border border-border bg-card shadow-lg",
        anchored
          ? "fixed w-[min(22.5rem,calc(100%-1.5rem))]"
          : placement === "page"
            ? "fixed bottom-6 left-1/2 w-[min(28rem,calc(100%-2rem))] -translate-x-1/2"
            : "fixed bottom-6 w-[min(28rem,calc(100%-2rem))]"
      )}
      style={
        anchored
          ? { left: coords.left, top: coords.top }
          : placement === "wall" && !anchor
            ? {
                left: trayOpen ? "calc(50% + 9rem)" : "50%",
                transform: "translateX(-50%)",
                bottom: DOCK_CLEARANCE,
              }
            : undefined
      }
      role="dialog"
      aria-label="Cast fiche"
      data-cast-peek
    >
      <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Cast
        </p>
        <div className="flex items-center gap-1">
          {onDelete ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-destructive"
              onClick={onDelete}
            >
              Delete
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 font-mono text-[10px] uppercase tracking-widest"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>
      <div className="max-h-[min(50vh,24rem)] overflow-y-auto px-5 py-5">
        <CastFiche persona={persona} />
      </div>
    </div>
  );
}
