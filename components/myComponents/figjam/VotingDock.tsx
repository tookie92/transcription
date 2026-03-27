"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, GripVertical } from "lucide-react";

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
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed w-12 h-12 rounded-full border-4 border-white shadow-2xl pointer-events-none z-[200]"
            style={{
              left: dragPos.x - 24,
              top: dragPos.y - 24,
              backgroundColor: userColor,
            }}
          />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 100, opacity: 0 }}
        className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-200/50 p-4"
      >
        <div className="text-xs text-gray-500 font-medium mb-3 flex items-center gap-2">
          <GripVertical className="w-4 h-4" />
          Drag dot onto a sticky to vote
        </div>
        
        <div className="flex flex-wrap gap-2 mb-3">
          {Array.from({ length: Math.max(0, remaining) }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ delay: i * 0.05, type: "spring", stiffness: 300, damping: 20 }}
              className="w-10 h-10 rounded-full border-2 border-white shadow-lg cursor-grab active:cursor-grabbing hover:scale-110 hover:rotate-12 transition-all"
              style={{ backgroundColor: userColor }}
              onPointerDown={(e) => handleDragStart(e, i)}
            />
          ))}
        </div>

        {usedDots > 0 && (
          <div className="flex items-center justify-between border-t border-gray-100 pt-3">
            <span className="text-xs text-gray-400 font-medium">
              {usedDots}/{dotsPerUser} votes
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
