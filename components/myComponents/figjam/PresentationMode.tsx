"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Play, 
  Pause, 
  ChevronLeft,
  ChevronRight,
  X,
  Layers,
  MousePointer2,
  Eye,
  LayoutGrid,
  Focus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { Position } from "@/types/figjam";

interface PresentationModeProps {
  isActive: boolean;
  onClose: () => void;
  groups: Array<{
    id: string;
    title: string;
    position: { x: number; y: number };
  }>;
  stickies?: any[];
  labels?: any[];
  zoom: number;
  pan: { x: number; y: number };
  onZoomChange?: (zoom: number) => void;
  onPanChange?: (pan: Position) => void;
}

export function PresentationMode({
  isActive,
  onClose,
  groups,
  zoom,
  pan,
  onZoomChange,
  onPanChange,
}: PresentationModeProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [focusedClusterId, setFocusedClusterId] = useState<string | null>(null);

  const steps = useMemo(() => {
    const items: Array<{ type: "overview" | "cluster"; id: string; title: string }> = [];
    
    items.push({ type: "overview", id: "overview", title: "Vue d'ensemble" });
    
    groups.forEach((group) => {
      items.push({ type: "cluster", id: group.id, title: group.title });
    });
    
    return items;
  }, [groups]);

  const currentItem = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  const handlePrev = useCallback(() => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
    setIsPlaying(false);
  }, []);

  const handleNext = useCallback(() => {
    setCurrentStep((prev) => Math.min(steps.length - 1, prev + 1));
    setIsPlaying(false);
  }, [steps.length]);

  const zoomToCluster = useCallback((clusterId: string) => {
    const cluster = groups.find(g => g.id === clusterId);
    if (!cluster) return;

    const targetZoom = 1.2;
    const viewportCenterX = window.innerWidth / 2;
    const viewportCenterY = window.innerHeight / 2;
    
    const newPanX = viewportCenterX - (cluster.position.x * targetZoom);
    const newPanY = viewportCenterY - (cluster.position.y * targetZoom);
    
    onZoomChange?.(targetZoom);
    onPanChange?.({ x: newPanX, y: newPanY });
    setFocusedClusterId(clusterId);
  }, [groups, onZoomChange, onPanChange]);

  const zoomToOverview = useCallback(() => {
    onZoomChange?.(1);
    onPanChange?.({ x: 0, y: 0 });
    setFocusedClusterId(null);
  }, [onZoomChange, onPanChange]);

  const handleStepClick = useCallback((index: number) => {
    setCurrentStep(index);
    setIsPlaying(false);
    
    const step = steps[index];
    if (step?.type === "cluster") {
      zoomToCluster(step.id);
    } else {
      zoomToOverview();
    }
  }, [steps, zoomToCluster, zoomToOverview]);

  useEffect(() => {
    if (!isActive) return;

    if (currentItem?.type === "cluster" && currentItem.id) {
      zoomToCluster(currentItem.id);
    } else if (currentItem?.type === "overview") {
      zoomToOverview();
    }
  }, [isActive, currentStep, currentItem?.type, currentItem?.id]);

  useEffect(() => {
    if (!isPlaying) return;
    
    const timer = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= steps.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 5000);
    
    return () => clearInterval(timer);
  }, [isPlaying, steps.length]);

  useEffect(() => {
    if (!isActive) {
      setCurrentStep(0);
      setIsPlaying(false);
      zoomToOverview();
    }
  }, [isActive]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isActive) return;
      
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        handlePrev();
      } else if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "Escape") {
        onClose();
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isActive, handlePrev, handleNext, onClose]);

  const isClusterFocused = useCallback((clusterId: string) => {
    if (currentItem?.type === "overview") return true;
    return currentItem?.id === clusterId;
  }, [currentItem]);

  if (!isActive) return null;

  return (
    <>
      {/* Presentation mode indicator - top bar */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-card/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-border px-4 py-2 flex items-center gap-4"
      >
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <LayoutGrid className="w-4 h-4 text-primary" />
          <span className="font-medium">Mode Présentation</span>
        </div>

        <div className="w-px h-6 bg-border" />

        <button
          onClick={onClose}
          className="p-1.5 hover:bg-accent rounded-lg transition-colors"
          title="Quitter (Esc)"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        <div className="w-px h-6 bg-border" />

        <button
          onClick={handlePrev}
          disabled={currentStep === 0}
          className="p-1.5 hover:bg-accent rounded-lg transition-colors disabled:opacity-40"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="p-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </button>

        <button
          onClick={handleNext}
          disabled={currentStep === steps.length - 1}
          className="p-1.5 hover:bg-accent rounded-lg transition-colors disabled:opacity-40"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-border" />

        <div className="flex items-center gap-2 min-w-[80px]">
          <Progress value={progress} className="h-1 flex-1" />
          <span className="text-[11px] text-muted-foreground font-mono">
            {currentStep + 1}/{steps.length}
          </span>
        </div>

        <div className="w-px h-6 bg-border" />

        <div className="text-sm font-medium max-w-[120px] truncate">
          {currentItem?.title}
        </div>

        <div className="w-px h-6 bg-border" />

        <button
          onClick={zoomToOverview}
          className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
          title="Vue d'ensemble"
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span>Overview</span>
        </button>
      </motion.div>

      {/* Cluster navigation panel - bottom left */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="fixed left-4 bottom-6 z-[100] bg-card/95 backdrop-blur-sm rounded-xl shadow-lg border border-border p-3 w-[220px]"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Clusters</span>
          </div>
          <span className="text-[10px] text-muted-foreground">
            {groups.length} cluster{groups.length > 1 ? "s" : ""}
          </span>
        </div>
        
        <div className="space-y-1 max-h-[180px] overflow-y-auto pr-1">
          {groups.map((group, index) => {
            const isCurrent = currentItem?.id === group.id;
            const isPast = index < currentStep;
            
            return (
              <button
                key={group.id}
                onClick={() => handleStepClick(index + 1)}
                className={`w-full flex items-center gap-2 p-2 rounded-lg transition-all text-left ${
                  isCurrent 
                    ? "bg-primary/15 border border-primary/30" 
                    : isPast 
                    ? "hover:bg-accent" 
                    : "opacity-60 hover:opacity-80"
                }`}
              >
                <div 
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                    isCurrent 
                      ? "bg-primary text-primary-foreground" 
                      : isPast 
                      ? "bg-muted text-muted-foreground" 
                      : "bg-muted text-muted-foreground/60"
                  }`}
                >
                  {index + 1}
                </div>
                <span className={`text-xs truncate flex-1 ${
                  isCurrent ? "font-medium" : ""
                }`}>
                  {group.title}
                </span>
                {isCurrent && (
                  <Focus className="w-3 h-3 text-primary shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Navigation dots - bottom center, below toolbar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 bg-card/90 backdrop-blur-sm rounded-full px-4 py-2 shadow-md border border-border"
      >
        <span className="text-[10px] text-muted-foreground mr-1">Passer à:</span>
        {steps.map((step, index) => (
          <button
            key={step.id}
            onClick={() => handleStepClick(index)}
            className={`h-2 rounded-full transition-all ${
              index === currentStep
                ? "bg-primary w-5"
                : index < currentStep
                ? "bg-primary/50 hover:bg-primary/70 w-2"
                : "bg-muted-foreground/30 hover:bg-muted-foreground/50 w-2"
            }`}
            title={step.title}
          />
        ))}
      </motion.div>

      {/* Free navigation hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="fixed right-4 bottom-6 z-[100] flex items-center gap-3 text-[10px] text-muted-foreground bg-card/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-border"
      >
        <div className="flex items-center gap-1.5">
          <MousePointer2 className="w-3 h-3" />
          <span>Pan & Zoom libres</span>
        </div>
        <div className="w-px h-3 bg-border" />
        <span><kbd className="px-1 py-0.5 bg-muted rounded text-[9px]">←</kbd><kbd className="px-1 py-0.5 bg-muted rounded text-[9px] ml-0.5">→</kbd> naviguer</span>
      </motion.div>

      {/* Focused cluster indicator - floating badge when zoomed */}
      <AnimatePresence>
        {currentItem?.type === "cluster" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[90] bg-card/90 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg border border-border"
          >
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Focus: {currentItem.title}</span>
              <button
                onClick={zoomToOverview}
                className="ml-2 text-xs text-muted-foreground hover:text-foreground underline"
              >
                Voir tout
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Subtle focus ring around current cluster area */}
      <AnimatePresence>
        {currentItem?.type === "cluster" && groups.find(g => g.id === currentItem?.id) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed top-20 right-6 z-[90] bg-primary/10 border border-primary/20 rounded-lg px-3 py-2 flex items-center gap-2"
          >
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-medium text-primary">
              Cluster {groups.findIndex(g => g.id === currentItem?.id) + 1}/{groups.length}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
