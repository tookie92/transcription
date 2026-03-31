"use client";

import React, { useCallback, useRef, useState, memo } from "react";
import type { ClusterLabelData, StickyNoteData, Position } from "@/types/figjam";

interface ClusterLabelProps {
  cluster: ClusterLabelData;
  memberStickies: StickyNoteData[];
  isDragging: boolean;
  isLocked?: boolean;
  onDragStart: () => void;
  onDrag: (dx: number, dy: number) => void;
  onDragEnd: (finalX: number, finalY: number) => void;
  onLabelChange?: (newLabel: string) => void;
  onSelect?: (id: string, multi: boolean) => void;
}

const DEFAULT_BORDER_COLOR = "#B8B4FF";
const DEFAULT_BG_COLOR = "rgba(184, 180, 255, 0.05)";
const HOVER_BORDER_COLOR = "#9C7BFF";
const HOVER_BG_COLOR = "rgba(156, 123, 255, 0.07)";
const LABEL_COLOR_NORMAL = "#8B7FCC";
const LABEL_COLOR_DRAGGING = "#7C4DFF";

export const ClusterLabel = memo(function ClusterLabelComponent({
  cluster,
  memberStickies,
  isDragging,
  isLocked = false,
  onDragStart,
  onDrag,
  onDragEnd,
  onLabelChange,
  onSelect,
}: ClusterLabelProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const isDraggingActive = isDragging;
  const canInteract = !isLocked && !isEditing;

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!canInteract) return;
      if (e.button !== 0) return;
      
      e.stopPropagation();
      e.preventDefault();
      
      const target = e.target as HTMLElement;
      if (target.closest('input')) return;

      if (onSelect) {
        onSelect(cluster.id, e.shiftKey || e.ctrlKey || e.metaKey);
      }

      onDragStart();

      const startX = e.clientX;
      const startY = e.clientY;
      const startClusterX = cluster.position.x;
      const startClusterY = cluster.position.y;

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        
        const zoom = 1;
        const deltaX = dx / zoom;
        const deltaY = dy / zoom;
        
        onDrag(deltaX, deltaY);
      };

      const handlePointerUp = (upEvent: PointerEvent) => {
        const finalX = cluster.position.x + (upEvent.clientX - startX);
        const finalY = cluster.position.y + (upEvent.clientY - startY);
        
        onDragEnd(finalX, finalY);

        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    },
    [canInteract, cluster.id, cluster.position.x, cluster.position.y, onDragStart, onDrag, onDragEnd, onSelect]
  );

  const handleDoubleClick = useCallback(() => {
    if (!canInteract) return;
    setIsEditing(true);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  }, [canInteract]);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === "Escape") {
      setIsEditing(false);
    }
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onLabelChange?.(e.target.value);
  }, [onLabelChange]);

  const borderColor = isDraggingActive || isHovered ? HOVER_BORDER_COLOR : DEFAULT_BORDER_COLOR;
  const bgColor = isDraggingActive || isHovered ? HOVER_BG_COLOR : DEFAULT_BG_COLOR;
  const labelColor = isDraggingActive ? LABEL_COLOR_DRAGGING : LABEL_COLOR_NORMAL;

  return (
    <div
      className="absolute select-none"
      style={{
        left: cluster.position.x,
        top: cluster.position.y,
        width: cluster.width,
        height: cluster.height,
        zIndex: cluster.zIndex - 1,
        cursor: isLocked 
          ? "default" 
          : isDraggingActive 
            ? "grabbing" 
            : "grab",
      }}
      onPointerDown={handlePointerDown}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Zone rectangulaire avec bordure pointillée */}
      <div
        className="absolute inset-0 rounded-xl transition-all duration-150"
        style={{
          border: `2px dashed ${borderColor}`,
          backgroundColor: bgColor,
          borderRadius: "12px",
        }}
      />

      {/* Label au-dessus, hors du cadre */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: -28,
          left: 0,
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 600,
          fontSize: 13,
          color: isEditing ? "transparent" : labelColor,
          letterSpacing: "0.3px",
          whiteSpace: "nowrap",
        }}
      >
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={cluster.text}
            onChange={handleInputChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            onPointerDown={(e) => e.stopPropagation()}
            className="outline-none bg-transparent border-none px-0 py-0 m-0 w-auto"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 600,
              fontSize: 13,
              color: labelColor,
              letterSpacing: "0.3px",
              caretColor: labelColor,
            }}
            onFocus={(e) => e.target.select()}
          />
        ) : (
          cluster.text || "New Cluster"
        )}
      </div>

      {/* Indicateur du nombre de stickies membres */}
      {memberStickies.length > 0 && (
        <div
          className="absolute pointer-events-none"
          style={{
            top: -28,
            right: 0,
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 11,
            color: labelColor,
            opacity: 0.7,
          }}
        >
          {memberStickies.length} stickies
        </div>
      )}
    </div>
  );
});
