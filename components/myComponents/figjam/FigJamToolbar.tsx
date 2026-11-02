"use client";

import React, { useState, useEffect } from "react";
import type { ToolType } from "@/types/figjam";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Hand, Lasso, Square, Undo2, Redo2, Search, StickyNote, Briefcase } from "lucide-react";
import { useAuth, useUser } from "@clerk/nextjs";
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
import { cn } from "@/lib/utils";
import { VoteSticker } from "@/components/myComponents/affinity/VoteSticker";
import { toast } from "sonner";
import { openSkriptaSignal } from "@/lib/openSignal";

function RoundFace({
  name,
  avatar,
  title,
}: {
  name: string;
  avatar?: string;
  title: string;
}) {
  const initial = (name.trim().charAt(0) || "?").toUpperCase();
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="relative inline-flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden border border-border bg-muted text-[9px] font-mono"
          title={title}
        >
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="" className="h-full w-full object-cover" />
          ) : (
            initial
          )}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top">{title}</TooltipContent>
    </Tooltip>
  );
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
  onOpenFind?: () => void;
  onOpenCast?: () => void;
  onOpenIssue?: () => void;
  castCount?: number;
  canvasRef?: React.RefObject<HTMLElement | null>;
  projectName?: string;
  newInsightsCount?: number;
  onImportInsights?: () => void;
  isVotingActive?: boolean;
  onCloseSidebar?: () => void;
  /** Teammates on the wall (for Round roster). Current user resolved in toolbar. */
  presenceUsers?: Array<{
    userId: string;
    name: string;
    avatar?: string;
  }>;
  voting?: {
    session: { isActive: boolean; votingPhase: string; createdBy: string } | null;
    isVoting: boolean;
    isSessionVoting?: boolean;
    isSittingOut?: boolean;
    isSpent?: boolean;
    isRevealed: boolean;
    myVotesCount: number;
    maxDotsPerUser: number;
    userColor: string;
    remainingTime: number | null;
    roundStats?: {
      placing: number;
      spent: number;
      stickersPlaced: number;
      voterCount: number;
      placingUserIds?: string[];
      spentUserIds?: string[];
    };
    startVoting: (config: { dotsPerUser: number; durationMinutes: number | null; prompt: string }) => Promise<void>;
    stopVoting: () => Promise<void>;
    flipVoting?: () => Promise<void>;
    leaveVoting: () => void;
    joinVoting?: () => void;
    completeVoting: () => Promise<void>;
    startNewRound: () => Promise<void>;
  };
  voteResults?: Array<{
    clusterId: string;
    title: string;
    voteCount: number;
    colors?: string[];
  }>;
  totalVotes?: number;
  onCreateCluster?: (title: string) => void;
  votingConfigTrigger?: number;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

export function FigJamToolbar({
  activeTool,
  zoom,
  selectedCount,
  onToolChange,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onBack: _onBack,
  ungroupedCount = 0,
  onToggleAIGroupingPanel,
  isCommentToolActive = false,
  onToggleCommentTool,
  bubbleCount = 0,
  isPresentationModeActive = false,
  onTogglePresentationMode,
  onOpenFind,
  onOpenCast,
  onOpenIssue,
  castCount = 0,
  canvasRef: _canvasRef,
  projectName: _projectName,
  newInsightsCount: _newInsightsCount = 0,
  onImportInsights: _onImportInsights,
  isVotingActive: _isVotingActive = false,
  onCloseSidebar,
  presenceUsers = [],
  voting,
  voteResults,
  totalVotes = 0,
  onCreateCluster,
  votingConfigTrigger = 0,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
}: FigJamToolbarProps) {
  const [showVotingConfig, setShowVotingConfig] = useState(false);
  const [showClusterDialog, setShowClusterDialog] = useState(false);
  const [clusterTitle, setClusterTitle] = useState("");
  const [dotsPerUser, setDotsPerUser] = useState(5);
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null);
  const [prompt, setPrompt] = useState("What matters most?");

  const { userId } = useAuth();
  const { user } = useUser();
  const isVotingCreator = voting?.session?.createdBy === userId;
  const left =
    voting != null
      ? Math.max(0, voting.maxDotsPerUser - voting.myVotesCount)
      : 0;
  const isSpent =
    voting?.isSpent ??
    (Boolean(voting?.isVoting) &&
      voting != null &&
      voting.maxDotsPerUser > 0 &&
      voting.myVotesCount >= voting.maxDotsPerUser);
  const roundStats = voting?.roundStats;
  const allSpent =
    Boolean(roundStats) &&
    (roundStats?.placing ?? 0) === 0 &&
    (roundStats?.spent ?? 0) > 0;
  const flipReady = isVotingCreator && (isSpent || allSpent);
  const flipRound = () => {
    void (voting?.flipVoting ?? voting?.stopVoting)?.().then(() => {
      toast.message("Flipped — stickers on the wall");
      window.setTimeout(() => openSkriptaSignal("flip"), 1200);
    });
  };

  const resolveFace = (id: string) => {
    if (id === userId) {
      return {
        name: user?.fullName || user?.firstName || "You",
        avatar: user?.imageUrl,
      };
    }
    const found = presenceUsers.find((p) => p.userId === id);
    return {
      name: found?.name || "Teammate",
      avatar: found?.avatar,
    };
  };

  const flipByName = (() => {
    const creatorId = voting?.session?.createdBy;
    if (!creatorId) return null;
    return resolveFace(creatorId).name;
  })();

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

  return (
    <TooltipProvider delayDuration={300}>
      <>
        {/* ── Table tools ── */}
        {!isPresentationModeActive && (
        <div className="absolute left-1/2 bottom-6 -translate-x-1/2 z-30">
          <div className="flex items-center gap-1 border border-border bg-card px-1 py-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-9 w-9 transition-transform duration-150 ease-out active:scale-[0.97]",
                    activeTool === "hand" ? "bg-accent text-foreground" : "text-muted-foreground"
                  )}
                  onClick={() => onToolChange("hand")}
                >
                  <Hand className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Pan (H)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-9 w-9 transition-transform duration-150 ease-out active:scale-[0.97]",
                    activeTool === "select" ? "bg-accent text-foreground" : "text-muted-foreground"
                  )}
                  onClick={() => onToolChange("select")}
                >
                  <Lasso className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Lasso (L)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-9 w-9 transition-transform duration-150 ease-out active:scale-[0.97]",
                    activeTool === "cluster" ? "bg-accent text-foreground" : "text-muted-foreground"
                  )}
                  onClick={handleClusterTool}
                >
                  <Square className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                {activeTool === "cluster" ? "Click the table to drop a packet" : "Packet (C)"}
              </TooltipContent>
            </Tooltip>

            <div className="w-px h-5 bg-border mx-1" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={!canUndo}
                  className="h-9 w-9 text-muted-foreground transition-transform duration-150 ease-out active:scale-[0.97] disabled:opacity-40"
                  onClick={onUndo}
                >
                  <Undo2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Undo (Ctrl+Z)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={!canRedo}
                  className="h-9 w-9 text-muted-foreground transition-transform duration-150 ease-out active:scale-[0.97] disabled:opacity-40"
                  onClick={onRedo}
                >
                  <Redo2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Redo (Shift+Z)</TooltipContent>
            </Tooltip>

            <div className="w-px h-5 bg-border mx-1" />

            {!isPresentationModeActive && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-muted-foreground transition-transform duration-150 ease-out active:scale-[0.97]"
                    onClick={() => onOpenFind?.()}
                  >
                    <Search className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Find</TooltipContent>
              </Tooltip>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "relative h-9 w-9 transition-transform duration-150 ease-out active:scale-[0.97]",
                    isCommentToolActive
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground"
                  )}
                  onClick={() => onToggleCommentTool?.()}
                >
                  <StickyNote className="w-4 h-4" />
                  {bubbleCount > 0 ? (
                    <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center border border-border bg-card px-0.5 font-mono text-[9px] tabular-nums leading-none text-foreground">
                      {bubbleCount > 9 ? "9+" : bubbleCount}
                    </span>
                  ) : null}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                {isCommentToolActive
                  ? "Click the wall or a packet to pin a note"
                  : "Note (N)"}
              </TooltipContent>
            </Tooltip>

            <Popover>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-9 w-9 transition-transform duration-150 ease-out active:scale-[0.97]",
                        isPresentationModeActive
                          ? "bg-accent text-foreground"
                          : "text-muted-foreground"
                      )}
                      aria-label="Workshop"
                    >
                      <Briefcase className="w-4 h-4" />
                    </Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent side="top">Workshop</TooltipContent>
              </Tooltip>
              <PopoverContent side="top" align="center" className="w-64 p-1">
                {voting && !voting.isSessionVoting && !voting.isRevealed ? (
                  <button
                    type="button"
                    className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-accent"
                    onClick={() => setShowVotingConfig(true)}
                  >
                    <span>Call a round</span>
                  </button>
                ) : null}
                {voting?.isSessionVoting && !voting.isVoting ? (
                  <button
                    type="button"
                    className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-accent"
                    onClick={() => voting.joinVoting?.()}
                  >
                    <span>Open pocket</span>
                  </button>
                ) : null}
                {voting?.isVoting ? (
                  <button
                    type="button"
                    className="w-full flex items-center justify-between px-3 py-2 text-sm text-muted-foreground hover:bg-accent"
                    onClick={() => voting.leaveVoting()}
                  >
                    <span>Close pocket</span>
                  </button>
                ) : null}
                {voting &&
                (voting.isRevealed || (voteResults && voteResults.length > 0)) ? (
                  <div className="border-b border-border px-3 py-2.5 mb-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] tracking-widest uppercase">
                        After Flip
                      </span>
                      {totalVotes > 0 && (
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {totalVotes}
                        </span>
                      )}
                    </div>
                    {voteResults && voteResults.length > 0 ? (
                      <ul className="space-y-1.5">
                        {voteResults.slice(0, 3).map((result) => (
                          <li
                            key={result.clusterId}
                            className="flex items-center gap-2 min-w-0"
                          >
                            <div className="flex -space-x-1 shrink-0">
                              {(result.colors ?? []).slice(0, 3).map((color, i) => (
                                <VoteSticker
                                  key={`${result.clusterId}-${i}`}
                                  color={color}
                                  rotate={((i % 5) - 2) * 6}
                                />
                              ))}
                            </div>
                            <span
                              className="min-w-0 flex-1 truncate italic text-[13px]"
                              style={{ fontFamily: "var(--font-display), serif" }}
                            >
                              {result.title || "Untitled"}
                            </span>
                            <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
                              ×{result.voteCount}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="font-mono text-[10px] text-muted-foreground">
                        No stickers yet
                      </p>
                    )}
                    {onOpenCast && voteResults && voteResults.length > 0 ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onOpenCast()}
                        className="h-7 w-full font-mono text-[10px] uppercase tracking-widest"
                      >
                        Cast
                      </Button>
                    ) : null}
                    {isVotingCreator && voting.isRevealed ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => void voting.startNewRound()}
                        className="h-7 w-full font-mono text-[10px] uppercase tracking-widest"
                      >
                        New round
                      </Button>
                    ) : null}
                  </div>
                ) : null}
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-accent"
                  onClick={() => onToggleAIGroupingPanel?.()}
                >
                  <span>Sort tray</span>
                  {ungroupedCount > 0 && (
                    <span className="font-mono text-[10px] text-muted-foreground">{ungroupedCount}</span>
                  )}
                </button>
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-accent"
                  onClick={() => onTogglePresentationMode?.()}
                >
                  <span>{isPresentationModeActive ? "Leave readout" : "Readout"}</span>
                </button>
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-accent"
                  onClick={() => onOpenCast?.()}
                >
                  <span>Cast</span>
                  {castCount > 0 && (
                    <span className="font-mono text-[10px] text-muted-foreground">{castCount}</span>
                  )}
                </button>
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-accent"
                  onClick={() => onOpenIssue?.()}
                >
                  <span>Issue</span>
                </button>
              </PopoverContent>
            </Popover>

            {/* ── Round chip: Stick / Spent / Flip ── */}
            {voting?.isSessionVoting && (
              <div
                className={cn(
                  "ml-1 flex items-center gap-2 border border-border px-2 py-1",
                  "bg-card transition-colors duration-150"
                )}
              >
                {voting.isVoting ? (
                  <>
                    <span
                      className="font-mono text-[10px] tracking-widest uppercase"
                      style={{
                        fontFamily: isSpent
                          ? "var(--font-display), serif"
                          : undefined,
                        fontStyle: isSpent ? "italic" : undefined,
                      }}
                    >
                      {isSpent ? "Spent" : "Stick"}
                    </span>
                    <div
                      className="flex items-center gap-0.5"
                      aria-label={`${left} stickers left`}
                    >
                      {Array.from({ length: voting.maxDotsPerUser }).map((_, i) => (
                        <VoteSticker
                          key={i}
                          color={voting.userColor}
                          filled={i < voting.myVotesCount}
                          rotate={i % 2 === 0 ? -8 : 6}
                          label={i < voting.myVotesCount ? "Stuck" : "Pocket"}
                        />
                      ))}
                    </div>
                    {roundStats &&
                    ((roundStats.spentUserIds?.length ?? 0) > 0 ||
                      (roundStats.placingUserIds?.length ?? 0) > 0) ? (
                      <div className="hidden sm:flex items-center gap-1.5">
                        {(roundStats.spentUserIds?.length ?? 0) > 0 ? (
                          <div
                            className="flex items-center gap-0.5"
                            aria-label={`${roundStats.spent} spent`}
                          >
                            <span className="font-mono text-[9px] tracking-wide text-muted-foreground">
                              Stuck
                            </span>
                            <div className="flex -space-x-1">
                              {(roundStats.spentUserIds ?? []).slice(0, 5).map((id) => {
                                const face = resolveFace(id);
                                return (
                                  <RoundFace
                                    key={`spent-${id}`}
                                    name={face.name}
                                    avatar={face.avatar}
                                    title={`${face.name} · spent`}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        ) : null}
                        {(roundStats.placingUserIds?.length ?? 0) > 0 ? (
                          <div
                            className="flex items-center gap-0.5"
                            aria-label={`${roundStats.placing} placing`}
                          >
                            <span className="font-mono text-[9px] tracking-wide text-muted-foreground">
                              Still
                            </span>
                            <div className="flex -space-x-1">
                              {(roundStats.placingUserIds ?? []).slice(0, 5).map((id) => {
                                const face = resolveFace(id);
                                return (
                                  <RoundFace
                                    key={`placing-${id}`}
                                    name={face.name}
                                    avatar={face.avatar}
                                    title={`${face.name} · still sticking`}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : roundStats &&
                      (roundStats.placing > 0 || roundStats.spent > 0) ? (
                      <span className="hidden sm:inline font-mono text-[9px] tracking-wide text-muted-foreground tabular-nums">
                        {roundStats.placing > 0
                          ? `${roundStats.placing} placing`
                          : null}
                        {roundStats.placing > 0 && roundStats.spent > 0
                          ? " · "
                          : null}
                        {roundStats.spent > 0
                          ? `${roundStats.spent} spent`
                          : null}
                      </span>
                    ) : null}
                    {isVotingCreator ? (
                      <Button
                        size="sm"
                        variant={flipReady ? "default" : "outline"}
                        onClick={flipRound}
                        className={cn(
                          "h-7 px-2.5 font-mono text-[10px] uppercase tracking-widest",
                          "transition-transform duration-150 ease-out active:scale-[0.97]"
                        )}
                        title={
                          flipReady
                            ? "Everyone ready — flip the table"
                            : "Reveal stickers for the team"
                        }
                      >
                        Flip
                      </Button>
                    ) : isSpent ? (
                      <span className="font-mono text-[9px] tracking-widest uppercase text-muted-foreground">
                        Wait flip
                      </span>
                    ) : null}
                  </>
                ) : (
                  <>
                    <span className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground">
                      Pocket closed
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => voting.joinVoting?.()}
                      className="h-7 px-2.5 font-mono text-[10px] uppercase tracking-widest active:scale-[0.97]"
                    >
                      Open
                    </Button>
                    {isVotingCreator ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={flipRound}
                        className="h-7 px-2.5 font-mono text-[10px] uppercase tracking-widest active:scale-[0.97]"
                      >
                        Flip
                      </Button>
                    ) : null}
                  </>
                )}
              </div>
            )}

            {voting?.isRevealed && !voting.isSessionVoting && voteResults && voteResults.length > 0 ? (
              <div
                className={cn(
                  "ml-1 flex max-w-[16rem] items-center gap-2 border border-border bg-card px-2.5 py-1"
                )}
                title={
                  flipByName
                    ? `Flipped by ${flipByName}`
                    : "Round flipped — stickers are on the wall"
                }
              >
                <span className="shrink-0 font-mono text-[10px] tracking-widest uppercase">
                  Flipped
                </span>
                {flipByName ? (
                  <span className="hidden sm:inline shrink-0 font-mono text-[9px] text-muted-foreground">
                    by {flipByName.split(" ")[0]}
                  </span>
                ) : null}
                <span
                  className="min-w-0 truncate italic text-[12px]"
                  style={{ fontFamily: "var(--font-display), serif" }}
                >
                  {voteResults[0]?.title || "Untitled"}
                </span>
                <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground">
                  ×{voteResults[0]?.voteCount ?? 0}
                </span>
              </div>
            ) : null}
          </div>
        </div>
        )}

        {selectedCount > 0 && !isPresentationModeActive && (
          <div className="absolute left-5 bottom-6 z-30 flex items-center gap-2 border border-border bg-card px-3 py-1.5">
            <span className="font-mono text-[11px] tracking-widest uppercase">
              {selectedCount} selected
            </span>
          </div>
        )}

        <div className="absolute right-5 bottom-6 z-30 flex items-center gap-1">
          <div className="flex items-center gap-1 border border-border bg-card px-1 py-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="w-7 h-7" onClick={onZoomOut}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Zoom out</TooltipContent>
          </Tooltip>
          
          <Button variant="ghost" className="px-2 font-mono text-xs py-1 min-w-[48px] text-center" onClick={onZoomReset}>
            {Math.round(zoom * 100)}%
          </Button>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="w-7 h-7" onClick={onZoomIn}>
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
              <DialogTitle
                style={{ fontFamily: "var(--font-display), serif" }}
                className="italic font-normal"
              >
                Call a round
              </DialogTitle>
              <DialogDescription>
                Stickers in every pocket. Silent until you Flip.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-1">
              <div className="space-y-2">
                <Label className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground">
                  Stickers
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {[3, 5, 7, 10].map((dots) => (
                    <button
                      key={dots}
                      type="button"
                      onClick={() => setDotsPerUser(dots)}
                      className={cn(
                        "h-9 px-3 font-mono text-[11px] tracking-widest uppercase border transition-colors duration-150 ease-out active:scale-[0.97]",
                        dotsPerUser === dots
                          ? "border-foreground bg-accent text-foreground"
                          : "border-border bg-card text-muted-foreground hover:border-foreground/40"
                      )}
                    >
                      {dots}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground">
                  Timer
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {([null, 1, 3, 5, 10] as const).map((duration) => (
                    <button
                      key={duration ?? "none"}
                      type="button"
                      onClick={() => setDurationMinutes(duration)}
                      className={cn(
                        "h-9 px-3 font-mono text-[11px] tracking-widest uppercase border transition-colors duration-150 ease-out active:scale-[0.97]",
                        durationMinutes === duration
                          ? "border-foreground bg-accent text-foreground"
                          : "border-border bg-card text-muted-foreground hover:border-foreground/40"
                      )}
                    >
                      {duration === null ? "Open" : `${duration}m`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="vote-prompt" className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground">
                  Prompt
                </Label>
                <Input
                  id="vote-prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="What matters most"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              {voting?.isVoting && isVotingCreator && (
                <Button
                  variant="outline"
                  onClick={() => {
                    flipRound();
                    setShowVotingConfig(false);
                  }}
                  className="font-mono text-[11px] uppercase tracking-widest"
                >
                  Flip now
                </Button>
              )}
              <Button variant="outline" onClick={() => setShowVotingConfig(false)}>
                Cancel
              </Button>
              {!voting?.isVoting && !voting?.isSessionVoting && (
                <Button
                  onClick={async () => {
                    onCloseSidebar?.();
                    await voting?.startVoting({ dotsPerUser, durationMinutes, prompt });
                    setShowVotingConfig(false);
                  }}
                  className="font-mono text-[11px] uppercase tracking-widest active:scale-[0.97]"
                >
                  Call
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Create Cluster Dialog ── */}
        <Dialog open={showClusterDialog} onOpenChange={setShowClusterDialog}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>New packet</DialogTitle>
              <DialogDescription>
                Leave untitled until the slips tell you the name.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-1">
              <div className="space-y-2">
                <Label htmlFor="cluster-title" className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground">
                  Label
                </Label>
                <Input
                  id="cluster-title"
                  value={clusterTitle}
                  onChange={(e) => setClusterTitle(e.target.value)}
                  placeholder="Untitled"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
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
                  onCreateCluster?.(clusterTitle.trim());
                  setClusterTitle("");
                  setShowClusterDialog(false);
                }}
                className="font-mono text-[11px] uppercase tracking-widest"
              >
                Place packet
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    </TooltipProvider>
  );
}
