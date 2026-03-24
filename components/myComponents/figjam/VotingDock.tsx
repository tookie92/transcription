"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw } from "lucide-react";

interface VotingDockProps {
  isActive: boolean;
  dotsPerUser: number;
  usedDots: number;
  userColor: string;
  onDropDot: (sectionId: string) => void;
  onRemoveDot: (sectionId: string) => void;
  onReset: () => void;
}

export function VotingDock({ 
  isActive, 
  dotsPerUser, 
  usedDots, 
  userColor, 
  onDropDot,
  onRemoveDot,
  onReset 
}: VotingDockProps) {
  const remaining = dotsPerUser - usedDots;
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const dockRef = useRef<HTMLDivElement>(null);

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

      // Check if dropped on a section
      const target = document.elementFromPoint(upEvent.clientX, upEvent.clientY);
      if (target) {
        const section = target.closest("[data-section-id]");
        if (section) {
          const sectionId = section.getAttribute("data-section-id");
          if (sectionId) {
            onDropDot(sectionId);
          }
        }
      }
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }, [remaining, onDropDot]);

  return (
    <>
      {/* Dragging dot follows cursor */}
      <AnimatePresence>
        {draggingIndex !== null && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="fixed w-10 h-10 rounded-full border-2 border-white shadow-2xl pointer-events-none z-[100]"
            style={{
              left: dragPos.x - 20,
              top: dragPos.y - 20,
              backgroundColor: userColor,
            }}
          />
        )}
      </AnimatePresence>

      {/* Dock */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            ref={dockRef}
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 px-6 py-4">
              <div className="flex items-center gap-6">
                {/* Available dots */}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                    Drag to vote
                  </span>
                  <div className="flex gap-2">
                    {Array.from({ length: remaining }).map((_, i) => (
                      <motion.div
                        key={i}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: i * 0.02 }}
                        className="w-8 h-8 rounded-full border-2 border-white shadow-md cursor-grab active:cursor-grabbing"
                        style={{ backgroundColor: userColor }}
                        onPointerDown={(e) => handleDragStart(e, i)}
                      />
                    ))}
                  </div>
                </div>

                {/* Used dots */}
                {usedDots > 0 && (
                  <div className="flex items-center gap-2 border-l border-gray-200 pl-6">
                    <span className="text-xs text-gray-400">Used</span>
                    <div className="flex gap-1">
                      {Array.from({ length: usedDots }).map((_, i) => (
                        <div
                          key={i}
                          className="w-6 h-6 rounded-full border-2 border-white shadow-sm opacity-50"
                          style={{ backgroundColor: userColor }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Reset */}
                {usedDots > 0 && (
                  <button
                    onClick={onReset}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-gray-200"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
