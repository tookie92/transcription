"use client";

import { useState, useRef, useCallback } from 'react';

interface UseCanvasNavigationProps {
  initialScale?: number;
  initialPosition?: { x: number; y: number };
}

export function useCanvasNavigation({
  initialScale = 1,
  initialPosition = { x: 0, y: 0 }
}: UseCanvasNavigationProps = {}) {
  const [scale, setScale] = useState(initialScale);
  const [position, setPosition] = useState(initialPosition);
  const [isPanning, setIsPanning] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Zoom
  const zoom = useCallback((delta: number, center?: { x: number; y: number }) => {
    setScale(current => {
      const newScale = Math.max(0.1, Math.min(3, current + delta));
      
      if (center && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const mouseX = center.x - rect.left;
        const mouseY = center.y - rect.top;
        
        // Zoom vers la souris
        setPosition(pos => ({
          x: mouseX - (mouseX - pos.x) * (newScale / current),
          y: mouseY - (mouseY - pos.y) * (newScale / current)
        }));
      }
      
      return newScale;
    });
  }, []);

  // Pan
  const startPan = useCallback(() => setIsPanning(true), []);
  const stopPan = useCallback(() => setIsPanning(false), []);
  
  const pan = useCallback((deltaX: number, deltaY: number) => {
    if (!isPanning) return;
    
    setPosition(pos => ({
      x: pos.x + deltaX / scale,
      y: pos.y + deltaY / scale
    }));
  }, [isPanning, scale]);

  // Reset
  const reset = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const resetTransform = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const centerView = useCallback(() => {
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      setPosition({ x: rect.width / 2, y: rect.height / 2 });
    }
  }, []);

  // Zoom in/out helpers
  const zoomIn = useCallback(() => {
    setScale(prev => Math.min(prev * 1.2, 3));
  }, []);

  const zoomOut = useCallback(() => {
    setScale(prev => Math.max(prev / 1.2, 0.3));
  }, []);

  // Wheel zoom
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.001;
    zoom(delta, { x: e.clientX, y: e.clientY });
  }, [zoom]);

  // Keyboard pan (Espace + drag)
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.code === 'Space' && !isPanning) {
      startPan();
      if (canvasRef.current) {
        canvasRef.current.style.cursor = 'grab';
      }
    }
  }, [isPanning, startPan]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.code === 'Space') {
      stopPan();
      if (canvasRef.current) {
        canvasRef.current.style.cursor = 'default';
      }
    }
  }, [stopPan]);

  return {
    scale,
    position,
    isPanning,
    setScale,
    setPosition,
    setIsPanning,
    canvasRef,
    zoom,
    zoomIn,
    zoomOut,
    startPan,
    stopPan,
    pan,
    reset,
    resetTransform,
    centerView,
    handleWheel,
    handleKeyDown,
    handleKeyUp
  };
}