"use client";

import React from "react";
import type { ToolType, StickyColor } from "@/types/figjam";
import { StickyColorPicker } from "./StickyColorPicker";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MousePointer2, Hand, ArrowLeft, Sparkles, MessageSquare, Presentation, DownloadCloud } from "lucide-react";

interface FigJamToolbarProps {
  activeTool: ToolType;
  zoom: number;
  selectedCount: number;
  onToolChange: (tool: ToolType) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  showStickyPicker?: boolean;
  onToggleStickyPicker?: () => void;
  onAddSticky: (color?: StickyColor) => void;
  onBack?: () => void;
  ungroupedCount?: number;
  onToggleAIGroupingPanel?: () => void;
  isCommentToolActive?: boolean;
  onToggleCommentTool?: () => void;
  bubbleCount?: number;
  isPresentationModeActive?: boolean;
  onTogglePresentationMode?: () => void;
  canvasRef?: React.RefObject<HTMLElement | null>;
  projectName?: string;
  newInsightsCount?: number;
  onImportInsights?: () => void;
}

export function FigJamToolbar({
  activeTool,
  zoom,
  selectedCount,
  onToolChange,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  showStickyPicker,
  onToggleStickyPicker,
  onAddSticky,
  onBack,
  ungroupedCount = 0,
  onToggleAIGroupingPanel,
  isCommentToolActive = false,
  onToggleCommentTool,
  bubbleCount = 0,
  isPresentationModeActive = false,
  onTogglePresentationMode,
  canvasRef,
  projectName,
  newInsightsCount = 0,
  onImportInsights,
}: FigJamToolbarProps) {

  return (
    <TooltipProvider delayDuration={300}>
      <>
        {/* ── Back Button (Top Left) ── */}
        {onBack && (
          <div className="absolute left-5 top-20 z-30">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 rounded-xl shadow-lg bg-card hover:bg-accent border border-border"
                  onClick={onBack}
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-card border-border shadow-lg">
                Back
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* ── Canvas Tools (Bottom Center) ── */}
        <div className="absolute left-1/2 bottom-6 -translate-x-1/2 z-30">
          <div className="flex items-center gap-1 bg-card/95 backdrop-blur-sm rounded-2xl shadow-xl border border-border px-2 py-1.5">
            
            {/* Select Tool */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`w-10 h-10 rounded-xl ${activeTool === "select" ? "bg-primary/20 text-primary ring-2 ring-primary/30" : ""}`}
                  onClick={() => onToolChange("select")}
                >
                  <MousePointer2 className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-card border-border shadow-lg">Select (V)</TooltipContent>
            </Tooltip>

            {/* Hand Tool */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`w-10 h-10 rounded-xl ${activeTool === "hand" ? "bg-primary/20 text-primary ring-2 ring-primary/30" : ""}`}
                  onClick={() => onToolChange("hand")}
                >
                  <Hand className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-card border-border shadow-lg">Hand (H)</TooltipContent>
            </Tooltip>

            <div className="w-px h-6 bg-border mx-1" />

            {/* Sticky Note */}
            <Tooltip>
              <TooltipTrigger asChild>
                <StickyColorPicker 
                  onSelectColor={onAddSticky} 
                  isActive={activeTool === "sticky"}
                  isOpen={showStickyPicker}
                  onOpenChange={onToggleStickyPicker}
                />
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-card border-border shadow-lg">Sticky Note (S)</TooltipContent>
            </Tooltip>

            <div className="w-px h-6 bg-border mx-1" />

            {/* AI Grouping Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`w-10 h-10 rounded-xl ${ungroupedCount > 0 ? "text-violet-600 hover:text-violet-700 hover:bg-violet-50" : ""}`}
                  onClick={onToggleAIGroupingPanel}
                >
                  <div className="relative">
                    <Sparkles className="w-5 h-5" />
                    {ungroupedCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-violet-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                        {ungroupedCount > 9 ? "9+" : ungroupedCount}
                      </span>
                    )}
                  </div>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-card border-border shadow-lg">
                {ungroupedCount > 0 ? `AI Grouping (${ungroupedCount} ungrouped)` : "AI Grouping"}
              </TooltipContent>
            </Tooltip>

            {/* Comment Tool */}
            <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`w-10 h-10 rounded-xl ${isCommentToolActive ? "bg-primary/20 text-primary ring-2 ring-primary/30" : ""}`}
                    onClick={onToggleCommentTool}
                  >
                    <div className="relative">
                      <MessageSquare className="w-5 h-5" />
                      {bubbleCount > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[14px] h-3.5 bg-blue-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                          {bubbleCount > 99 ? "99+" : bubbleCount}
                        </span>
                      )}
                    </div>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-card border-border shadow-lg">
                  {bubbleCount > 0 ? `${bubbleCount} discussion${bubbleCount > 1 ? "s" : ""}` : "Discuter (M)"}
                </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* ── Selection indicator (bottom left) ── */}
        {selectedCount > 0 && (
          <div className="absolute left-5 bottom-6 z-30 flex items-center gap-2 bg-primary text-primary-foreground rounded-xl shadow-lg px-3 py-1.5">
            <span className="text-sm font-medium">{selectedCount} selected</span>
          </div>
        )}

        {/* ── Side Actions (top left) ── */}
        <div className="absolute left-5 top-20 z-30 flex flex-col gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isPresentationModeActive ? "default" : "ghost"}
                size="sm"
                className={`gap-2 rounded-xl shadow-lg ${
                  isPresentationModeActive ? "bg-primary" : "bg-card hover:bg-accent border border-border"
                }`}
                onClick={onTogglePresentationMode}
              >
                <Presentation className="w-4 h-4" />
                <span className="text-sm font-medium">Present</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-card border-border shadow-lg">
              Start Presentation Mode
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                disabled={newInsightsCount === 0 || !onImportInsights}
                className={`gap-2 rounded-xl shadow-lg bg-card hover:bg-accent border border-border ${
                  newInsightsCount > 0 ? "text-primary" : "text-muted-foreground"
                }`}
                onClick={onImportInsights}
              >
                <DownloadCloud className="w-4 h-4" />
                <span className="text-sm font-medium">Importer</span>
                {newInsightsCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-primary text-primary-foreground text-xs font-bold rounded-full min-w-[18px] text-center">
                    {newInsightsCount}
                  </span>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-card border-border shadow-lg">
              {newInsightsCount > 0 ? `Importer ${newInsightsCount} insight${newInsightsCount > 1 ? "s" : ""}` : "Aucun insight à importer"}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* ── Zoom controls (bottom right) ── */}
        <div className="absolute right-5 bottom-6 z-30 flex items-center gap-1">
          <div className="flex items-center gap-1 bg-card/95 backdrop-blur-sm rounded-xl shadow-lg border border-border px-1.5 py-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="w-7 h-7 rounded-lg" onClick={onZoomOut}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Zoom out</TooltipContent>
          </Tooltip>
          
          <Button variant="ghost" className="px-2 text-xs font-medium rounded py-1 min-w-[48px] text-center" onClick={onZoomReset}>
            {Math.round(zoom * 100)}%
          </Button>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="w-7 h-7 rounded-lg" onClick={onZoomIn}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Zoom in</TooltipContent>
          </Tooltip>
          </div>
        </div>
      </>
    </TooltipProvider>
  );
}
