// components/CanvasArea.tsx - SOLUTION SANS CONTEXT MENU
"use client";

import { useRef } from "react";

interface CanvasAreaProps {
  children: React.ReactNode;
  position: { x: number; y: number };
  scale: number;
  isPanning: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
  onClick: (e: React.MouseEvent) => void;
  onDoubleClick: (e: React.MouseEvent) => void;
  onGroupCreate: (position: { x: number; y: number }) => void;
}

export function CanvasArea({
  children,
  position,
  scale,
  isPanning,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onClick,
  onDoubleClick,
  onGroupCreate,
}: CanvasAreaProps) {
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Créer un groupe au position du clic droit
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left - position.x) / scale;
      const y = (e.clientY - rect.top - position.y) / scale;
      onGroupCreate({ x, y });
    }
  };

  return (
    <div
      ref={canvasRef}
      className="absolute inset-0"
      style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={handleContextMenu}
    >
      {children}
    </div>
  );
}