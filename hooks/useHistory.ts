// hooks/useHistory.ts - VERSION ULTRA-SIMPLE
"use client";

import { useState, useCallback } from "react";
import { AffinityGroup, Insight } from "@/types";

export function useHistory() {
  const [history, setHistory] = useState<{
    groups: AffinityGroup[];
    insights: Insight[];
    description: string;
  }[]>([]);
  
  const [currentIndex, setCurrentIndex] = useState(-1);

  const pushState = useCallback((
    groups: AffinityGroup[], 
    insights: Insight[], 
    action: string, 
    description: string 
  ) => {
    console.log("💾 Saving state for undo:", description);
    
    setHistory(prev => {
      const newHistory = prev.slice(0, currentIndex + 1);
      const newState = {
        groups: JSON.parse(JSON.stringify(groups)),
        insights: JSON.parse(JSON.stringify(insights)), 
        description
      };
      
      const updatedHistory = [...newHistory, newState];
      
      // Limiter à 20 étapes max
      if (updatedHistory.length > 20) {
        updatedHistory.shift();
      }
      
      setCurrentIndex(updatedHistory.length - 1);
      return updatedHistory;
    });
  }, [currentIndex]);

  const undo = useCallback(() => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      return history[newIndex];
    }
    return null;
  }, [currentIndex, history]);

  const redo = useCallback(() => {
    if (currentIndex < history.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      return history[newIndex];
    }
    return null;
  }, [currentIndex, history]);

  return {
    pushState,
    undo,
    redo,
    canUndo: currentIndex > 0,
    canRedo: currentIndex < history.length - 1,
  };
}