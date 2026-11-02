"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Position } from "@/types/figjam";
import { Button } from "@/components/ui/button";

interface PresentationModeProps {
  isActive: boolean;
  onClose: () => void;
  groups: Array<{
    id: string;
    title: string;
    position: { x: number; y: number };
  }>;
  zoom: number;
  pan: { x: number; y: number };
  onZoomChange?: (zoom: number) => void;
  onPanChange?: (pan: Position) => void;
}

export function PresentationMode({
  isActive,
  onClose,
  groups,
  onZoomChange,
  onPanChange,
}: PresentationModeProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const groupsRef = useRef(groups);
  groupsRef.current = groups;
  const onZoomChangeRef = useRef(onZoomChange);
  onZoomChangeRef.current = onZoomChange;
  const onPanChangeRef = useRef(onPanChange);
  onPanChangeRef.current = onPanChange;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const framePacket = useCallback((index: number) => {
    const cluster = groupsRef.current[index];
    if (!cluster) {
      onZoomChangeRef.current?.(1);
      onPanChangeRef.current?.({ x: 0, y: 0 });
      return;
    }
    const targetZoom = 1.2;
    const newPanX = window.innerWidth / 2 - cluster.position.x * targetZoom;
    const newPanY = window.innerHeight / 2 - cluster.position.y * targetZoom;
    onZoomChangeRef.current?.(targetZoom);
    onPanChangeRef.current?.({ x: newPanX, y: newPanY });
  }, []);

  const goTo = useCallback(
    (index: number) => {
      const count = groupsRef.current.length;
      if (count === 0) return;
      const next = Math.max(0, Math.min(count - 1, index));
      setCurrentStep(next);
      framePacket(next);
    },
    [framePacket]
  );

  useEffect(() => {
    if (!isActive) {
      setCurrentStep(0);
      return;
    }
    setCurrentStep(0);
    framePacket(0);
  }, [isActive, framePacket]);

  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        event.stopPropagation();
        goTo(currentStep - 1);
      } else if (event.key === "ArrowRight" || event.key === "ArrowDown" || event.key === " ") {
        event.preventDefault();
        event.stopPropagation();
        goTo(currentStep + 1);
      } else if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [currentStep, goTo, isActive]);

  if (!isActive) return null;

  const current = groups[currentStep];
  const title = current?.title?.trim() || (groups.length === 0 ? "No packets" : "Packet");

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[100] flex justify-center">
      <div className="pointer-events-auto flex items-center gap-2 border border-border bg-card px-2 py-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 font-mono text-[11px] uppercase tracking-widest"
          disabled={currentStep === 0 || groups.length === 0}
          onClick={() => goTo(currentStep - 1)}
        >
          Prev
        </Button>
        <div className="min-w-0 max-w-[220px] px-2">
          <p className="truncate text-sm text-foreground">{title}</p>
        </div>
        <span className="shrink-0 font-mono text-[11px] tabular-nums tracking-widest text-muted-foreground">
          {groups.length === 0 ? "0 / 0" : `${currentStep + 1} / ${groups.length}`}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 font-mono text-[11px] uppercase tracking-widest"
          disabled={currentStep >= groups.length - 1 || groups.length === 0}
          onClick={() => goTo(currentStep + 1)}
        >
          Next
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 font-mono text-[11px] uppercase tracking-widest"
          onClick={onClose}
        >
          Leave
        </Button>
      </div>
    </div>
  );
}
