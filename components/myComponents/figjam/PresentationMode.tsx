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
  Eye,
  LayoutGrid,
  Focus
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { Position } from "@/types/figjam";

interface StickyData {
  id: string;
  position: { x: number; y: number };
}

interface LabelData {
  id: string;
  position: { x: number; y: number };
}

interface PresentationModeProps {
  isActive: boolean;
  onClose: () => void;
  groups: Array<{
    id: string;
    title: string;
    position: { x: number; y: number };
  }>;
  stickies?: StickyData[];
  labels?: LabelData[];
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

  if (!isActive) return null;

  return (
    <>
      {/* Presentation mode indicator - top bar */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-white dark:bg-card rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.06)] border border-[#e8e8e8] dark:border-border px-4 py-2.5 flex items-center gap-3"
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#1d1d1b] dark:bg-primary flex items-center justify-center">
            <LayoutGrid className="w-3.5 h-3.5 text-white dark:text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold text-[#1d1d1b] dark:text-foreground">Mode Présentation</span>
        </div>

        <div className="w-px h-6 bg-[#e8e8e8] dark:bg-border" />

        <button
          onClick={onClose}
          className="p-1.5 hover:bg-[#f5f5f5] dark:hover:bg-accent rounded-lg transition-colors"
          title="Quitter (Esc)"
        >
          <X className="w-4 h-4 text-[#999] dark:text-muted-foreground" />
        </button>

        <div className="w-px h-6 bg-[#e8e8e8] dark:bg-border" />

        <button
          onClick={handlePrev}
          disabled={currentStep === 0}
          className="p-1.5 hover:bg-[#f5f5f5] dark:hover:bg-accent rounded-lg transition-colors disabled:opacity-40"
        >
          <ChevronLeft className="w-4 h-4 text-[#666] dark:text-muted-foreground" />
        </button>

        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="p-2 bg-[#1d1d1b] dark:bg-primary text-white dark:text-primary-foreground rounded-xl hover:bg-[#333] dark:hover:bg-primary/90 transition-colors shadow-sm"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>

        <button
          onClick={handleNext}
          disabled={currentStep === steps.length - 1}
          className="p-1.5 hover:bg-[#f5f5f5] dark:hover:bg-accent rounded-lg transition-colors disabled:opacity-40"
        >
          <ChevronRight className="w-4 h-4 text-[#666] dark:text-muted-foreground" />
        </button>

        <div className="w-px h-6 bg-[#e8e8e8] dark:bg-border" />

        <div className="flex items-center gap-2 min-w-[100px]">
          <Progress value={progress} className="h-1.5 flex-1 [&>div]:bg-[#1d1d1b] dark:[&>div]:bg-primary" />
          <span className="text-[11px] text-[#999] dark:text-muted-foreground font-mono tabular-nums">
            {currentStep + 1}/{steps.length}
          </span>
        </div>

        <div className="w-px h-6 bg-[#e8e8e8] dark:bg-border" />

        <div className="text-sm font-medium text-[#1d1d1b] dark:text-foreground max-w-[140px] truncate">
          {currentItem?.title}
        </div>

        <div className="w-px h-6 bg-[#e8e8e8] dark:bg-border" />

        <button
          onClick={zoomToOverview}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#666] dark:text-muted-foreground hover:text-[#1d1d1b] dark:hover:text-foreground hover:bg-[#f5f5f5] dark:hover:bg-accent rounded-lg transition-colors"
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
        className="fixed left-4 bottom-6 z-[100] bg-white dark:bg-card rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.1),0_1px_4px_rgba(0,0,0,0.06)] border border-[#e8e8e8] dark:border-border p-3 w-[240px]"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#666] dark:text-muted-foreground" />
            <span className="text-sm font-semibold text-[#1d1d1b] dark:text-foreground">Clusters</span>
          </div>
          <span className="text-[10px] text-[#999] dark:text-muted-foreground bg-[#f5f5f5] dark:bg-muted px-2 py-0.5 rounded-full">
            {groups.length} cluster{groups.length > 1 ? "s" : ""}
          </span>
        </div>
        
        <div className="space-y-1 max-h-[200px] overflow-y-auto pr-1">
          {groups.map((group, index) => {
            const isCurrent = currentItem?.id === group.id;
            const isPast = index < currentStep;
            
            return (
              <button
                key={group.id}
                onClick={() => handleStepClick(index + 1)}
                className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl transition-all text-left ${
                  isCurrent 
                    ? "bg-[#1d1d1b] dark:bg-primary text-white dark:text-primary-foreground shadow-sm" 
                    : isPast 
                    ? "hover:bg-[#f5f5f5] dark:hover:bg-accent text-[#666] dark:text-muted-foreground" 
                    : "opacity-60 hover:opacity-80 text-[#999] dark:text-muted-foreground"
                }`}
              >
                <div 
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                    isCurrent 
                      ? "bg-white/20 text-white" 
                      : isPast 
                      ? "bg-[#eee] dark:bg-muted text-[#666] dark:text-muted-foreground" 
                      : "bg-[#f5f5f5] dark:bg-muted text-[#999] dark:text-muted-foreground/60"
                  }`}
                >
                  {index + 1}
                </div>
                <span className={`text-xs truncate flex-1 ${
                  isCurrent ? "font-semibold" : "font-medium"
                }`}>
                  {group.title}
                </span>
                {isCurrent && (
                  <Focus className="w-3.5 h-3.5 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Focused cluster indicator */}
      <AnimatePresence>
        {currentItem?.type === "cluster" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[90] bg-white dark:bg-card/95 backdrop-blur-sm rounded-xl px-5 py-2.5 shadow-[0_4px_20px_rgba(0,0,0,0.1)] border border-[#e8e8e8] dark:border-border"
          >
            <div className="flex items-center gap-3">
              <Eye className="w-4 h-4 text-[#666] dark:text-muted-foreground" />
              <span className="text-sm font-semibold text-[#1d1d1b] dark:text-foreground">Focus: {currentItem.title}</span>
              <button
                onClick={zoomToOverview}
                className="ml-2 text-xs font-medium text-[#666] dark:text-muted-foreground hover:text-[#1d1d1b] dark:hover:text-foreground underline-offset-2 hover:underline transition-colors"
              >
                Voir tout
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cluster progress indicator */}
      <AnimatePresence>
        {currentItem?.type === "cluster" && groups.find(g => g.id === currentItem?.id) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed top-20 right-4 z-[90] bg-[#1d1d1b] dark:bg-primary/10 border border-[#1d1d1b] dark:border-primary/20 rounded-lg px-3 py-1.5 flex items-center gap-2"
          >
            <div className="w-2 h-2 rounded-full bg-[#1d1d1b] dark:bg-primary animate-pulse" />
            <span className="text-[11px] font-semibold text-white dark:text-primary">
              Cluster {groups.findIndex(g => g.id === currentItem?.id) + 1}/{groups.length}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
