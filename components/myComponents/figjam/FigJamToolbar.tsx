"use client";

import React, { useState, useEffect, useRef } from "react";
import type { ToolType } from "@/types/figjam";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MousePointer2, Hand, ArrowLeft, Sparkles, MessageSquare, Presentation, DownloadCloud, Vote, Layers, Trophy, RotateCcw, Plus, Settings, User, Eye, Crown, Medal } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface VotingConfig {
  dotsPerUser: number;
  durationMinutes: number | null;
  prompt: string;
}

interface FigJamToolbarProps {
  activeTool: ToolType;
  zoom: number;
  selectedCount: number;
  onToolChange: (tool: ToolType) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
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
  isVotingActive?: boolean;
  onCloseSidebar?: () => void;
  voting?: {
    session: { isActive: boolean; votingPhase: string; createdBy: string } | null;
    isVoting: boolean;
    isRevealed: boolean;
    myVotesCount: number;
    maxDotsPerUser: number;
    userColor: string;
    remainingTime: number | null;
    startVoting: (config: { dotsPerUser: number; durationMinutes: number | null; prompt: string }) => Promise<void>;
    stopVoting: () => Promise<void>;
    completeVoting: () => Promise<void>;
    startNewRound: () => Promise<void>;
  };
  voteResults?: Array<{
    clusterId: string;
    title: string;
    voteCount: number;
    color?: string;
  }>;
  totalVotes?: number;
  onCreateCluster?: (title: string) => void;
  onOpenPersona?: () => void;
  hasPersonas?: boolean;
  votingConfigTrigger?: number;
}

const PRESET_CONFIGS = [
  { name: "Quick", dots: 3, duration: null },
  { name: "Standard", dots: 5, duration: null },
  { name: "Timed", dots: 5, duration: 5 },
];

export function FigJamToolbar({
  activeTool,
  zoom,
  selectedCount,
  onToolChange,
  onZoomIn,
  onZoomOut,
  onZoomReset,
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
  isVotingActive = false,
  onCloseSidebar,
  voting,
  voteResults,
  totalVotes = 0,
  onCreateCluster,
  onOpenPersona,
  hasPersonas = false,
  votingConfigTrigger = 0,
}: FigJamToolbarProps) {
  const [showVotingConfig, setShowVotingConfig] = useState(false);
  const [showClusterDialog, setShowClusterDialog] = useState(false);
  const [clusterTitle, setClusterTitle] = useState("");
  const [dotsPerUser, setDotsPerUser] = useState(5);
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null);
  const [prompt, setPrompt] = useState("Vote for priorities");

  const { userId } = useAuth();
  const isVotingCreator = voting?.session?.createdBy === userId;

  // Open modal when trigger changes (from keyboard shortcut)
  useEffect(() => {
    if (votingConfigTrigger > 0) {
      setShowVotingConfig(true);
    }
  }, [votingConfigTrigger]);

  const handleClusterTool = () => {
    // Toggle between cluster tool and select
    if (activeTool === "cluster") {
      onToolChange("select");
    } else {
      onToolChange("cluster");
    }
  };

  const handleCreateCluster = (title: string) => {
    onCreateCluster?.(title);
    setClusterTitle("");
    setShowClusterDialog(false);
    onToolChange("select");
  };

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
          <div className="flex items-center gap-3 bg-card/95 backdrop-blur-sm rounded-2xl shadow-xl border border-border px-3 py-2">

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

            {/* Create Cluster - Tool */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "w-10 h-10 rounded-xl",
                    activeTool === "cluster" && "bg-primary/20 text-primary ring-2 ring-primary/30"
                  )}
                  onClick={handleClusterTool}
                >
                  <Layers className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-card border-border shadow-lg">
                {activeTool === "cluster" ? "Click canvas to create" : "New Cluster (C)"}
              </TooltipContent>
            </Tooltip>

            {/* Voting - FigJam style */}
            {voting && (
              <>
                <div className="w-px h-6 bg-border mx-1" />
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "w-10 h-10 rounded-xl relative transition-all",
                        voting.isVoting && "bg-primary text-primary-foreground hover:bg-primary/90",
                        voting.isRevealed && "bg-primary text-primary-foreground hover:bg-primary/90",
                        !voting.isVoting && !voting.isRevealed && "text-muted-foreground hover:text-foreground hover:bg-accent"
                      )}
                    >
                      <Vote className="w-5 h-5" />
                      {(voting.isVoting || voting.isRevealed) && voteResults && voteResults.length > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-background text-primary text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm border border-border">
                          {totalVotes}
                        </span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent side="top" align="center" className="w-80 p-0 overflow-hidden bg-card border-border shadow-lg">
                    {voting.isRevealed && voteResults && voteResults.length > 0 ? (
                      <VoteResultsContent
                        results={voteResults}
                        totalVotes={totalVotes}
                        onNewRound={() => voting.startNewRound()}
                        onNewRoundWithConfig={() => {
                          // Pre-fill with previous session settings
                          if (voting.session) {
                            setDotsPerUser(voting.maxDotsPerUser);
                            setDurationMinutes(null); // Default no timer for new round
                            setPrompt("Vote for priorities");
                          }
                          setShowVotingConfig(true);
                        }}
                        onClose={() => voting.stopVoting()}
                      />
                    ) : voting.isVoting ? (
                      <div className="p-4 space-y-3">
                        <div className="flex items-center gap-2 text-primary">
                          <Vote className="w-5 h-5 animate-pulse" />
                          <span className="font-medium">Voting in progress</span>
                        </div>
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-2xl">{voting.userColor && <span style={{ color: voting.userColor }}>●</span>}</span>
                          <span className="text-sm text-muted-foreground">
                            {voting.myVotesCount}/{voting.maxDotsPerUser} votes used
                          </span>
                        </div>
                        <p className="text-xs text-center text-muted-foreground">
                          Click on clusters to vote
                        </p>
                      </div>
                    ) : (
                      <div className="p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <Vote className="w-5 h-5 text-primary" />
                          <span className="font-medium text-card-foreground">Dot Voting</span>
                        </div>
                        <Button
                          onClick={() => setShowVotingConfig(true)}
                          className="w-full gap-2"
                        >
                          <Vote className="w-4 h-4" />
                          Start Voting
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </>
            )}

            <div className="w-px h-6 bg-border mx-1" />

            {/* AI Grouping Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`w-10 h-10 rounded-xl ${ungroupedCount > 0 ? "text-primary hover:text-primary/80 hover:bg-primary/10" : ""}`}
                  onClick={onToggleAIGroupingPanel}
                >
                  <div className="relative">
                    <Sparkles className="w-5 h-5" />
                    {ungroupedCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
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
                  {bubbleCount > 0 ? `${bubbleCount} discussion${bubbleCount > 1 ? "s" : ""}` : "Discuss (M)"}
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
                <span className="text-sm font-medium">Import</span>
                {newInsightsCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-primary text-primary-foreground text-xs font-bold rounded-full min-w-[18px] text-center">
                    {newInsightsCount}
                  </span>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-card border-border shadow-lg">
              {newInsightsCount > 0 ? `Import ${newInsightsCount} insight${newInsightsCount > 1 ? "s" : ""}` : "No insights to import"}
            </TooltipContent>
          </Tooltip>

          {/* ── Voting Progress Panel ── */}
          {(voting?.isVoting || (!voting?.isVoting && voting?.session && (voting.isRevealed || (voteResults && voteResults.length > 0)))) && (
            <div className="bg-primary/10 border border-primary/20 rounded-xl shadow-lg px-4 py-2 flex items-center gap-3">
              {/* During voting */}
              {voting?.isVoting && (
                <>
                  <Vote className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-primary">Vote!</span>
                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: voting.maxDotsPerUser }).map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          "w-4 h-4 rounded-full border-2 transition-all",
                          i < voting.myVotesCount
                            ? "border-transparent"
                            : "border-primary/30 bg-transparent"
                        )}
                        style={{
                          backgroundColor: i < voting.myVotesCount ? voting.userColor : "transparent",
                        }}
                      />
                    ))}
                  </div>
                  {voting.remainingTime !== null && voting.remainingTime > 0 && (
                    <div className="flex items-center gap-1 text-primary font-mono text-sm">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      <span>{Math.floor(voting.remainingTime / 60000)}:{Math.round((voting.remainingTime % 60000) / 1000).toString().padStart(2, '0')}</span>
                    </div>
                  )}
                </>
              )}
              
              {/* After voting - Show Results / Generate Persona */}
              {!voting?.isVoting && voting?.session && (
                <>
                  <Trophy className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-medium text-amber-700">Results ready</span>
                </>
              )}

              {/* Settings - visible ONLY to creator during voting */}
              {isVotingCreator && voting?.isVoting && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowVotingConfig(true)}
                  className="ml-1 text-muted-foreground hover:text-foreground"
                  title="Settings"
                >
                  <Settings className="w-4 h-4" />
                </Button>
              )}

              {/* End button - only for creator */}
              {isVotingCreator && voting?.isVoting && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => voting.stopVoting()}
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  End
                </Button>
              )}

              {/* Leave button - for non-creators */}
              {!isVotingCreator && voting?.isVoting && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => voting.stopVoting()}
                  className="text-orange-600 border-orange-300 hover:bg-orange-50"
                >
                  Leave
                </Button>
              )}

              {/* Generate/View Persona - visible when voting is finished and there are results */}
              {!voting?.isVoting && voteResults && voteResults.length > 0 && (
                <Button
                  size="sm"
                  onClick={() => {
                    if (onOpenPersona) {
                      onOpenPersona();
                    } else {
                      toast.info("Open Persona panel from toolbar to generate");
                    }
                  }}
                  className="bg-[#4CA771] hover:bg-[#3F9A68] text-white"
                >
                  {hasPersonas ? (
                    <>
                      <Eye className="w-4 h-4 mr-1" />
                      View Persona
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-1" />
                      Generate Persona
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
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

        {/* ── Voting Config Dialog ── */}
        <Dialog open={showVotingConfig} onOpenChange={setShowVotingConfig}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Vote className="w-5 h-5 text-amber-500" />
                Start Dot Voting
              </DialogTitle>
              <DialogDescription>
                Configure your voting session. Click on clusters to vote.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Presets */}
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Quick Presets
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {PRESET_CONFIGS.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => {
                        setDotsPerUser(preset.dots);
                        setDurationMinutes(preset.duration);
                      }}
                      className={cn(
                        "flex flex-col items-center p-3 rounded-xl border text-center transition-all",
                        dotsPerUser === preset.dots && durationMinutes === preset.duration
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border hover:border-primary/50 hover:bg-muted/50"
                      )}
                    >
                      <span className="font-medium text-sm">{preset.name}</span>
                      <span className="text-xs text-muted-foreground">{preset.dots} votes</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dots per user */}
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Votes per Person: {dotsPerUser}
                </Label>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={dotsPerUser}
                  onChange={(e) => setDotsPerUser(parseInt(e.target.value))}
                  className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer accent-primary"
                />
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Time Limit
                </Label>
                <Select
                  value={durationMinutes?.toString() ?? "none"}
                  onValueChange={(v) => setDurationMinutes(v === "none" ? null : parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No time limit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No time limit</SelectItem>
                    <SelectItem value="1">1 minute</SelectItem>
                    <SelectItem value="3">3 minutes</SelectItem>
                    <SelectItem value="5">5 minutes</SelectItem>
                    <SelectItem value="10">10 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Prompt */}
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Prompt
                </Label>
                <Input
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Vote for your priorities"
                  className="rounded-xl"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              {voting?.isVoting && (
                <Button
                  variant="destructive"
                  onClick={() => {
                    voting?.stopVoting();
                    setShowVotingConfig(false);
                  }}
                >
                  Stop Voting
                </Button>
              )}
              <Button variant="outline" onClick={() => setShowVotingConfig(false)}>
                {voting?.isVoting ? "Close" : "Cancel"}
              </Button>
              {!voting?.isVoting && (
                <Button
                  onClick={async () => {
                    onCloseSidebar?.();
                    await voting?.startVoting({ dotsPerUser, durationMinutes, prompt });
                    setShowVotingConfig(false);
                  }}
                  className="gap-2"
                >
                  <Vote className="w-4 h-4" />
                  Start Voting
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Create Cluster Dialog ── */}
        <Dialog open={showClusterDialog} onOpenChange={setShowClusterDialog}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-primary" />
                New Cluster
              </DialogTitle>
              <DialogDescription>
                Create a new cluster to organize insights.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="cluster-title">Cluster Title</Label>
                <Input
                  id="cluster-title"
                  value={clusterTitle}
                  onChange={(e) => setClusterTitle(e.target.value)}
                  placeholder="Enter cluster title..."
                  className="rounded-xl"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && clusterTitle.trim()) {
                      onCreateCluster?.(clusterTitle.trim());
                      setClusterTitle("");
                      setShowClusterDialog(false);
                    }
                  }}
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setShowClusterDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (clusterTitle.trim()) {
                    onCreateCluster?.(clusterTitle.trim());
                    setClusterTitle("");
                    setShowClusterDialog(false);
                  }
                }}
                disabled={!clusterTitle.trim()}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    </TooltipProvider>
  );
}

// ─── Vote Results Content (for Popover) ────────────────────────────────────────

interface VoteResultsContentProps {
  results: Array<{
    clusterId: string;
    title: string;
    voteCount: number;
    color?: string;
  }>;
  totalVotes: number;
  onNewRound: () => void;
  onNewRoundWithConfig: () => void;
  onClose: () => void;
}

function VoteResultsContent({ results, totalVotes, onNewRound, onNewRoundWithConfig, onClose }: VoteResultsContentProps) {
  return (
    <div className="bg-card text-card-foreground">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Vote Results</span>
          <span className="text-xs text-muted-foreground">({totalVotes} votes)</span>
        </div>
      </div>

      {/* Full Ranking List */}
      <div className="px-4 py-3 max-h-64 overflow-y-auto space-y-1.5">
        {results.map((result, index) => (
          <div
            key={result.clusterId}
            className={cn(
              "flex items-center gap-3 py-2.5 px-3 rounded-lg transition-colors",
              index === 0 ? "bg-primary/10 border border-primary/20" : "bg-accent/50 hover:bg-accent"
            )}
          >
            {/* Rank Icon */}
            <div className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0",
              index === 0 && "bg-primary text-primary-foreground",
              index === 1 && "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300",
              index === 2 && "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
              index > 2 && "bg-muted text-muted-foreground"
            )}>
              {index === 0 && <Crown className="w-3.5 h-3.5" />}
              {index === 1 && <Medal className="w-3.5 h-3.5" />}
              {index === 2 && <Medal className="w-3.5 h-3.5" />}
              {index > 2 && <span className="text-xs font-bold">{index + 1}</span>}
            </div>

            {/* Color indicator */}
            <div 
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: result.color || "var(--primary)" }}
            />

            {/* Title */}
            <span className={cn(
              "flex-1 truncate text-sm",
              index === 0 ? "font-semibold text-foreground" : "text-muted-foreground"
            )}>
              {result.title}
            </span>

            {/* Vote count */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className={cn(
                "text-sm font-bold",
                index === 0 ? "text-primary" : "text-muted-foreground"
              )}>
                {result.voteCount}
              </span>
              <span className="text-xs text-muted-foreground">votes</span>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border">
        <Button
          size="sm"
          variant="ghost"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground text-xs"
        >
          Close
        </Button>
        <Button
          size="sm"
          onClick={onNewRoundWithConfig}
          className="gap-1.5 text-xs"
        >
          <RotateCcw className="w-3 h-3" />
          New Round
        </Button>
      </div>
    </div>
  );
}
