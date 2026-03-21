"use client";

import React, { useState, useCallback, useEffect } from "react";
import { AffinityGroup as AffinityGroupType } from "@/types";
import { 
  ChevronLeft, 
  ChevronRight, 
  Maximize, 
  Minimize,
  LayoutGrid,
  Play,
  Pause
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PresentationModeProps {
  clusters: AffinityGroupType[];
  onExit: () => void;
}

export function PresentationMode({ clusters, onExit }: PresentationModeProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showOverview, setShowOverview] = useState(false);
  const [slideInterval, setSlideInterval] = useState<NodeJS.Timeout | null>(null);

  const currentCluster = clusters[currentIndex];
  const totalSlides = clusters.length;

  const goToSlide = useCallback((index: number) => {
    if (index < 0) index = totalSlides - 1;
    if (index >= totalSlides) index = 0;
    setCurrentIndex(index);
  }, [totalSlides]);

  const nextSlide = useCallback(() => {
    goToSlide(currentIndex + 1);
  }, [currentIndex, goToSlide]);

  const prevSlide = useCallback(() => {
    goToSlide(currentIndex - 1);
  }, [currentIndex, goToSlide]);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      if (slideInterval) {
        clearInterval(slideInterval);
        setSlideInterval(null);
      }
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      const interval = setInterval(() => {
        nextSlide();
      }, 3000);
      setSlideInterval(interval);
    }
  }, [isPlaying, slideInterval, nextSlide]);

  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    switch (e.key) {
      case "ArrowRight":
      case " ":
        e.preventDefault();
        nextSlide();
        break;
      case "ArrowLeft":
        e.preventDefault();
        prevSlide();
        break;
      case "Escape":
        e.preventDefault();
        onExit();
        break;
      case "f":
        e.preventDefault();
        toggleFullscreen();
        break;
      case "o":
        e.preventDefault();
        setShowOverview((prev) => !prev);
        break;
      case "p":
        e.preventDefault();
        togglePlay();
        break;
    }
  }, [nextSlide, prevSlide, onExit, toggleFullscreen, togglePlay]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (slideInterval) clearInterval(slideInterval);
    };
  }, [handleKeyDown, slideInterval]);

  useEffect(() => {
    return () => {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }
    };
  }, []);

  if (totalSlides === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">No Clusters to Present</h2>
          <p className="text-muted-foreground mb-4">
            Create some clusters first to start presenting.
          </p>
          <Button onClick={onExit}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background">
      {/* Overview Mode */}
      {showOverview && (
        <div className="absolute inset-0 z-40 bg-background/95 p-8 overflow-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Overview - All Clusters</h2>
            <Button variant="outline" onClick={() => setShowOverview(false)}>
              Exit Overview
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clusters.map((cluster, index) => (
              <button
                key={cluster.id}
                onClick={() => {
                  setCurrentIndex(index);
                  setShowOverview(false);
                }}
                className="p-4 rounded-lg border text-left hover:border-primary transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: cluster.color }}
                  />
                  <span className="font-semibold">{cluster.title}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {cluster.insightIds.length} insights
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Slide */}
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={togglePlay}>
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <span className="text-sm text-muted-foreground">
              Slide {currentIndex + 1} of {totalSlides}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowOverview(true)}>
              <LayoutGrid className="w-4 h-4 mr-2" />
              Overview
            </Button>
            <Button variant="ghost" size="sm" onClick={toggleFullscreen}>
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={onExit}>
              Exit
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-4xl w-full">
            {currentCluster && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Cluster Header */}
                <div className="flex items-center gap-4 mb-6">
                  <div
                    className="w-6 h-6 rounded-full"
                    style={{ backgroundColor: currentCluster.color }}
                  />
                  <h1 className="text-4xl font-bold">{currentCluster.title}</h1>
                </div>

                {/* Progress indicator */}
                <div className="flex gap-2 mb-8">
                  {clusters.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentIndex(index)}
                      className={cn(
                        "w-2 h-2 rounded-full transition-all",
                        index === currentIndex
                          ? "bg-primary w-6"
                          : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                      )}
                    />
                  ))}
                </div>

                {/* Placeholder for insights */}
                <div className="bg-muted/50 rounded-xl p-8 min-h-64">
                  <p className="text-muted-foreground text-center">
                    {currentCluster.insightIds.length} insights in this cluster
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between px-6 py-4 border-t">
          <Button variant="outline" onClick={prevSlide}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>
          <div className="text-sm text-muted-foreground">
            Press <kbd className="px-2 py-1 bg-muted rounded">←</kbd>{" "}
            <kbd className="px-2 py-1 bg-muted rounded">→</kbd> to navigate
          </div>
          <Button variant="outline" onClick={nextSlide}>
            Next
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
