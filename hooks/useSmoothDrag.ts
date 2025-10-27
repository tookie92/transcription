"use client";

import { useState, useCallback, useRef } from 'react';
import { gsap } from 'gsap';

interface UseSmoothDragProps {
  onDragMove: (position: { x: number; y: number }) => void;
  onDragEnd: (position: { x: number; y: number }) => void;
}

export function useSmoothDrag({ onDragMove, onDragEnd }: UseSmoothDragProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; elementX: number; elementY: number } | null>(null);
  const animationRef = useRef<gsap.core.Tween | null>(null);

  const handleDragStart = useCallback((e: React.MouseEvent, currentPosition: { x: number; y: number }) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      elementX: currentPosition.x,
      elementY: currentPosition.y
    };

    // Changement immédiat du curseur
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
  }, []);

  const handleDragMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !dragStartRef.current) return;

    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;

    const newPosition = {
      x: dragStartRef.current.elementX + deltaX,
      y: dragStartRef.current.elementY + deltaY
    };

    // Mise à jour en temps réel sans animation pour un suivi parfait
    onDragMove(newPosition);
  }, [isDragging, onDragMove]);

  const handleDragEnd = useCallback(() => {
    if (!isDragging || !dragStartRef.current) return;

    setIsDragging(false);
    
    // Restaurer le curseur
    document.body.style.cursor = '';
    document.body.style.userSelect = '';

    // Appeler le callback final
    const currentElement = document.elementFromPoint(dragStartRef.current.x, dragStartRef.current.y);
    if (currentElement) {
      const rect = currentElement.getBoundingClientRect();
      onDragEnd({
        x: rect.left,
        y: rect.top
      });
    }

    dragStartRef.current = null;
  }, [isDragging, onDragEnd]);

  // Écouteurs globaux
  const setupListeners = useCallback(() => {
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
  }, [handleDragMove, handleDragEnd]);

  const cleanupListeners = useCallback(() => {
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
  }, [handleDragMove, handleDragEnd]);

  return {
    isDragging,
    handleDragStart,
    setupListeners,
    cleanupListeners
  };
}