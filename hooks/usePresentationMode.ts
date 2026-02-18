"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { AffinityGroup as AffinityGroupType } from "@/types";
import { toast } from "sonner";

interface PresentationState {
  isActive: boolean;
  currentGroupIndex: number;
  isOverview: boolean;
}

interface GroupPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function usePresentationMode(groups: AffinityGroupType[]) {
  const [presentationState, setPresentationState] = useState<PresentationState>({
    isActive: false,
    currentGroupIndex: 0,
    isOverview: true,
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const fullscreenElementRef = useRef<HTMLElement | null>(null);

  const currentGroup =
    presentationState.isActive && !presentationState.isOverview
      ? groups[presentationState.currentGroupIndex]
      : null;

  const currentGroupPosition = presentationState.isActive && !presentationState.isOverview && groups[presentationState.currentGroupIndex]
    ? {
        x: groups[presentationState.currentGroupIndex].position.x,
        y: groups[presentationState.currentGroupIndex].position.y,
        width: 350,
        height: 250,
      }
    : null;

  const enterFullscreen = useCallback(async () => {
    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch (err) {
      console.error("Failed to enter fullscreen:", err);
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error("Failed to exit fullscreen:", err);
    }
  }, []);

  const handleFullscreenChange = useCallback(() => {
    setIsFullscreen(!!document.fullscreenElement);
  }, []);

  useEffect(() => {
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [handleFullscreenChange]);

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

  const enterPresentationMode = useCallback(async () => {
    setPresentationState({
      isActive: true,
      currentGroupIndex: 0,
      isOverview: true,
    });
    toast.success(
      "Mode présentation activé - Utilisez les flèches pour naviguer"
    );
    await enterFullscreen();
  }, [enterFullscreen]);

  const exitPresentationMode = useCallback(async () => {
    setPresentationState({
      isActive: false,
      currentGroupIndex: 0,
      isOverview: true,
    });
    toast.info("Mode présentation désactivé");
    if (isFullscreen) {
      await exitFullscreen();
    }
  }, [exitFullscreen, isFullscreen]);

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
    currentGroupPosition,
    nextGroup,
    prevGroup,
    toggleOverview,
    enterPresentationMode,
    exitPresentationMode,
    isFullscreen,
  };
}
