"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw } from "lucide-react";

interface VotingDockProps {
  isActive: boolean;
  dotsPerUser: number;
  usedDots: number;
  userColor: string;
  disabledSections?: Record<string, boolean>;
  onDropDot: (sectionId: string) => void;
  onRemoveDot: (sectionId: string) => void;
  onReset: () => void;
}

export function VotingDock({ 
  isActive, 
  dotsPerUser, 
  usedDots, 
  userColor, 
  disabledSections = {},
  onDropDot,
  onRemoveDot,
  onReset 
}: VotingDockProps) {
  const remaining = dotsPerUser - usedDots;
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });

  const handleDragStart = useCallback((e: React.PointerEvent, index: number) => {
    if (remaining <= 0) return;
    e.preventDefault();
    e.stopPropagation();
    setDraggingIndex(index);
    setDragPos({ x: e.clientX, y: e.clientY });

    const onMove = (mv: PointerEvent) => {
      setDragPos({ x: mv.clientX, y: mv.clientY });
    };

    const onUp = (upEvent: PointerEvent) => {
      setDraggingIndex(null);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);

      const target = document.elementFromPoint(upEvent.clientX, upEvent.clientY);
      if (target) {
        const section = target.closest("[data-section-id]");
        if (section) {
          const sectionId = section.getAttribute("data-section-id");
          if (sectionId && !disabledSections[sectionId]) {
            onDropDot(sectionId);
          }
        }
      }
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }, [remaining, disabledSections, onDropDot]);

  if (!isActive) return null;

  return (
    <>
      <AnimatePresence>
        {draggingIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed h-5 w-5 border border-foreground/25 pointer-events-none z-[200]"
            style={{
              left: dragPos.x - 10,
              top: dragPos.y - 10,
              backgroundColor: userColor,
              transform: "rotate(-8deg)",
            }}
          />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ x: 12, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 12, opacity: 0 }}
        className="border border-border bg-card p-3"
      >
        <div className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground mb-3">
          Stickers
        </div>
        
        <div className="flex flex-wrap gap-2 mb-3">
          {Array.from({ length: Math.max(0, remaining) }).map((_, i) => (
            <div
              key={i}
              className="h-8 w-8 border border-foreground/20 cursor-grab active:cursor-grabbing active:scale-[0.97]"
              style={{
                backgroundColor: userColor,
                transform: `rotate(${i % 2 === 0 ? -8 : 6}deg)`,
              }}
              onPointerDown={(e) => handleDragStart(e, i)}
            />
          ))}
        </div>

        {usedDots > 0 && (
          <div className="flex items-center justify-between border-t border-border pt-3">
            <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
              ×{usedDots}/{dotsPerUser}
            </span>
            <button
              onClick={onReset}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          </div>
        )}
      </motion.div>
    </>
  );
}
