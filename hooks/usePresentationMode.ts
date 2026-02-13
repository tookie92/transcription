"use client";

import { useState, useCallback, useEffect } from "react";
import { AffinityGroup as AffinityGroupType } from "@/types";
import { toast } from "sonner";

interface PresentationState {
  isActive: boolean;
  currentGroupIndex: number;
  isOverview: boolean;
}

export function usePresentationMode(groups: AffinityGroupType[]) {
  const [presentationState, setPresentationState] = useState<PresentationState>({
    isActive: false,
    currentGroupIndex: 0,
    isOverview: true,
  });

  const currentGroup =
    presentationState.isActive && !presentationState.isOverview
      ? groups[presentationState.currentGroupIndex]
      : null;

  const nextGroup = useCallback(() => {
    if (groups.length === 0) return;
    setPresentationState((prev) => ({
      ...prev,
      currentGroupIndex: (prev.currentGroupIndex + 1) % groups.length,
      isOverview: false,
    }));
  }, [groups.length]);

  const prevGroup = useCallback(() => {
    if (groups.length === 0) return;
    setPresentationState((prev) => ({
      ...prev,
      currentGroupIndex:
        (prev.currentGroupIndex - 1 + groups.length) % groups.length,
      isOverview: false,
    }));
  }, [groups.length]);

  const toggleOverview = useCallback(() => {
    setPresentationState((prev) => ({
      ...prev,
      isOverview: !prev.isOverview,
    }));
  }, []);

  const enterPresentationMode = useCallback(() => {
    setPresentationState({
      isActive: true,
      currentGroupIndex: 0,
      isOverview: true,
    });
    toast.success(
      "Mode présentation activé - Utilisez les flèches pour naviguer"
    );
  }, []);

  const exitPresentationMode = useCallback(() => {
    setPresentationState({
      isActive: false,
      currentGroupIndex: 0,
      isOverview: true,
    });
    toast.info("Mode présentation désactivé");
  }, []);

  // Keyboard shortcuts for presentation mode
  useEffect(() => {
    if (!presentationState.isActive) return;

    const handlePresentationKeys = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        exitPresentationMode();
        return;
      }

      if (!presentationState.isActive) return;

      switch (e.key) {
        case "ArrowRight":
        case " ":
          e.preventDefault();
          nextGroup();
          break;
        case "ArrowLeft":
          e.preventDefault();
          prevGroup();
          break;
        case "o":
        case "O":
          e.preventDefault();
          toggleOverview();
          break;
        case "ArrowDown":
          e.preventDefault();
          setPresentationState((prev) => ({ ...prev, isOverview: true }));
          break;
        case "ArrowUp":
          e.preventDefault();
          setPresentationState((prev) => ({ ...prev, isOverview: false }));
          break;
      }
    };

    document.addEventListener("keydown", handlePresentationKeys);
    return () =>
      document.removeEventListener("keydown", handlePresentationKeys);
  }, [
    presentationState.isActive,
    nextGroup,
    prevGroup,
    toggleOverview,
    exitPresentationMode,
  ]);

  return {
    presentationState,
    currentGroup,
    nextGroup,
    prevGroup,
    toggleOverview,
    enterPresentationMode,
    exitPresentationMode,
  };
}
