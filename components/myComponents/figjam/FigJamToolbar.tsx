"use client";

import React from "react";
import type { ToolType, StickyColor } from "@/types/figjam";
import { VotingSettings } from "./VotingSettings";
import { StickyColorPicker } from "./StickyColorPicker";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { BarChart3, Plus, Minus, MousePointer2, Hand, Tag, ArrowLeft, Sparkles, MessageSquare, Presentation, Filter } from "lucide-react";

interface VotingConfig {
  dotsPerUser: number;
  durationMinutes: number | null;
}

interface SectionVoteResult {
  sectionId: string;
  title: string;
  voteCount: number;
  colors: string[];
}

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
  onGroupSelected?: () => void;
  onBack?: () => void;
  votingConfig?: VotingConfig;
  onVotingConfigChange?: (config: VotingConfig) => void;
  isVotingActive?: boolean;
  votingPhase?: "setup" | "voting" | "revealed" | "completed";
  isCreator?: boolean;
  remainingTime?: number | null;
  voteResults?: SectionVoteResult[];
  onStartVoting?: (dotsPerUser: number, durationMinutes: number | null) => void;
  onStopAndReveal?: () => void;
  onStartNewVote?: () => void;
  isManualVotingMode?: boolean;
  onToggleManualVotingMode?: () => void;
  ungroupedCount?: number;
  onToggleAIGroupingPanel?: () => void;
  isCommentToolActive?: boolean;
  onToggleCommentTool?: () => void;
  bubbleCount?: number;
  isPresentationModeActive?: boolean;
  onTogglePresentationMode?: () => void;
  isFiltersActive?: boolean;
  onToggleFilters?: () => void;
  filterCount?: number;
}

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
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
  votingConfig,
  onVotingConfigChange,
  isVotingActive,
  votingPhase,
  isCreator,
  remainingTime,
  voteResults,
  onStartVoting,
  onStopAndReveal,
  onStartNewVote,
  isManualVotingMode,
  onToggleManualVotingMode,
  ungroupedCount = 0,
  onToggleAIGroupingPanel,
  isCommentToolActive = false,
  onToggleCommentTool,
  bubbleCount = 0,
  isPresentationModeActive = false,
  onTogglePresentationMode,
  isFiltersActive = false,
  onToggleFilters,
  filterCount = 0,
}: FigJamToolbarProps) {

  const sortedResults = [...(voteResults || [])].sort((a, b) => b.voteCount - a.voteCount);

  return (
    <TooltipProvider delayDuration={300}>
      <>
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

            {/* Cluster Label Tool */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`w-10 h-10 rounded-xl ${activeTool === "label" ? "bg-primary/20 text-primary ring-2 ring-primary/30" : ""}`}
                  onClick={() => onToolChange("label")}
                >
                  <Tag className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-card border-border shadow-lg">Cluster Label (C)</TooltipContent>
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

        {/* ── Mode & Voting Panel (Top Right) ── */}
        {/* <div className="absolute right-4 top-20 z-30 space-y-2"> */}

          {/* Voting Session Button */}
          {/* <Popover>
            <PopoverTrigger asChild>
              <Button
                className={`w-full justify-start gap-2 px-4 py-2.5 rounded-xl shadow-lg ${
                  isVotingActive
                    ? "bg-green-600 hover:bg-green-700 text-black"
                    : "bg-card hover:bg-accent border border-border"
                }`}
              >
                {isVotingActive && votingPhase === "voting" ? (
                  <>
                    <div className="w-2 h-2 rounded-full text-black bg-white animate-pulse" />
                    <span>Voting</span>
                    {remainingTime !== null && remainingTime !== undefined && remainingTime > 0 && (
                      <span className="font-mono text-sm font-bold ml-auto">{formatTime(remainingTime)}</span>
                    )}
                  </>
                ) : isVotingActive && votingPhase === "revealed" ? (
                  <>
                    <BarChart3 className="w-4 h-4 " />
                    <span>Results</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 text-black" />
                    <span className="text-black">Start Vote</span>
                  </>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-3" align="end" side="bottom">
              <div className="space-y-3">
                {isVotingActive && (
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                    votingPhase === "voting" 
                      ? "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300" 
                      : "bg-violet-50 dark:bg-violet-950 text-violet-700 dark:text-violet-300"
                  }`}>
                    {votingPhase === "voting" ? (
                      <>
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span>Voting in progress</span>
                      </>
                    ) : (
                      <>
                        <BarChart3 className="w-4 h-4" />
                        <span>Votes revealed</span>
                      </>
                    )}
                  </div>
                )}

                <VotingSettings
                  config={votingConfig || { dotsPerUser: 5, durationMinutes: null }}
                  onConfigChange={onVotingConfigChange || (() => {})}
                  isVotingActive={isVotingActive}
                  votingPhase={votingPhase}
                  isCreator={isCreator}
                  remainingTime={remainingTime}
                  onStartVoting={onStartVoting}
                  onStopAndReveal={onStopAndReveal}
                  onStartNewVote={onStartNewVote}
                />

                {voteResults && voteResults.length > 0 && votingPhase === "revealed" && (
                  <div className="border-t pt-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Results</p>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {sortedResults.map((result, index) => (
                        <div key={result.sectionId} className="flex items-center gap-2 p-2 rounded-lg bg-muted">
                          <span className={`text-xs font-bold w-5 ${index === 0 ? "text-yellow-500" : "text-muted-foreground"}`}>
                            #{index + 1}
                          </span>
                          <div className="flex gap-0.5 flex-1 min-w-0">
                            {result.colors.slice(0, 4).map((color, i) => (
                              <div key={i} className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                            ))}
                            {result.colors.length > 4 && (
                              <span className="text-xs text-muted-foreground">+{result.colors.length - 4}</span>
                            )}
                          </div>
                          <span className="text-sm font-medium shrink-0">{result.voteCount}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover> */}
        {/* </div> */}

        {/* ── Selection indicator (bottom left) ── */}
        {selectedCount > 0 && (
          <div className="absolute left-5 bottom-6 z-30 flex items-center gap-2 bg-primary text-primary-foreground rounded-xl shadow-lg px-3 py-1.5">
            <span className="text-sm font-medium">{selectedCount} selected</span>
          </div>
        )}

        {/* ── Presentation Mode Button (top left) ── */}
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
                variant={isFiltersActive ? "default" : "ghost"}
                size="sm"
                className={`gap-2 rounded-xl shadow-lg ${
                  isFiltersActive ? "bg-primary" : "bg-card hover:bg-accent border border-border"
                }`}
                onClick={onToggleFilters}
              >
                <Filter className="w-4 h-4" />
                <span className="text-sm font-medium">Filters</span>
                {filterCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-primary-foreground text-primary text-xs font-bold rounded-full min-w-[18px] text-center">
                    {filterCount}
                  </span>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-card border-border shadow-lg">
              {filterCount > 0 ? `${filterCount} filters active` : "Open Filters"}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* ── Zoom controls (bottom right) ── */}
        <div className="absolute right-5 bottom-6 z-30 flex items-center gap-1 bg-card/95 backdrop-blur-sm rounded-xl shadow-lg border border-border px-1.5 py-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="w-7 h-7 rounded-lg" onClick={onZoomOut}>
                <Minus className="w-4 h-4" />
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
                <Plus className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Zoom in</TooltipContent>
          </Tooltip>
        </div>
      </>
    </TooltipProvider>
  );
}
