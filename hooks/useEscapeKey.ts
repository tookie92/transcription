"use client";

import { useEffect, useCallback } from "react";

interface UseEscapeKeyOptions {
  onEscape: () => void;
  enabled?: boolean;
}

/**
 * Hook to handle Escape key press for closing panels/modals
 * Call this in any component that should close on Escape
 */
export function useEscapeKey({ onEscape, enabled = true }: UseEscapeKeyOptions) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape" && enabled) {
      // Don't trigger if user is typing in an input
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === "INPUT" || 
                       target.tagName === "TEXTAREA" || 
                       target.isContentEditable;
      
      if (!isTyping) {
        onEscape();
      }
    }
  }, [onEscape, enabled]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Global escape key handler registry
 * Use this to register multiple handlers for escape key
 */
type EscapeHandler = () => void;

const globalHandlers: Set<EscapeHandler> = new Set();

export function registerEscapeHandler(handler: EscapeHandler): () => void {
  globalHandlers.add(handler);
  return () => globalHandlers.delete(handler);
}

export function useGlobalEscapeKey(enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Don't trigger if user is typing in an input
        const target = e.target as HTMLElement;
        const isTyping = target.tagName === "INPUT" || 
                         target.tagName === "TEXTAREA" || 
                         target.isContentEditable;
        
        if (!isTyping) {
          // Call all registered handlers
          globalHandlers.forEach(handler => handler());
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled]);
}
