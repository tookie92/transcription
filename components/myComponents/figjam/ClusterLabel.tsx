"use client";

import React, { useCallback, useRef, useState, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ClusterLabelData, StickyNoteData } from "@/types/figjam";
import { usePureDrag } from "@/hooks/usePureDrag";
import { AIRenameModal } from "./AIRenameModal";

export const LABEL_COLORS = [
  { bg: "#dbeafe", border: "#3b82f6", text: "#1e40af", glow: "#3b82f6" },
  { bg: "#dcfce7", border: "#22c55e", text: "#166534", glow: "#22c55e" },
  { bg: "#fce7f3", border: "#ec4899", text: "#9d174d", glow: "#ec4899" },
  { bg: "#fef3c7", border: "#f59e0b", text: "#92400e", glow: "#f59e0b" },
  { bg: "#e9d5ff", border: "#a855f7", text: "#6b21a8", glow: "#a855f7" },
  { bg: "#f3f4f6", border: "#6b7280", text: "#374151", glow: "#6b7280" },
];

interface ClusterVote {
  clusterId: string;
  votedBy: string;
  color: string;
}

interface ClusterLabelProps {
  label: ClusterLabelData;
  zoom: number;
  isSelected: boolean;
  isHighlighted?: boolean;
  highlightDistance?: number;
  isLocked?: boolean;
  isVotingMode?: boolean;
  isRevealed?: boolean;
  hasUserVoted?: boolean;
  userVotesRemaining?: number;
  votes?: ClusterVote[];
  userNames?: Map<string, string>;
  stickiesInCluster?: StickyNoteData[];
  projectContext?: string;
  onSelect: (id: string, multi: boolean) => void;
  onUpdate: (id: string, patch: Partial<ClusterLabelData>) => void;
  onDelete: (id: string) => void;
  onMove?: (id: string, pos: { x: number; y: number }) => void;
  onVote?: (id: string) => void;
}

export const ClusterLabel = memo(function ClusterLabelComponent({
  label,
  zoom,
  isSelected,
  isHighlighted = false,
  highlightDistance = 0,
  isLocked = false,
  isVotingMode = false,
  isRevealed = false,
  hasUserVoted = false,
  userVotesRemaining = 0,
  votes = [],
  userNames = new Map(),
  stickiesInCluster = [],
  projectContext,
  onSelect,
  onUpdate,
  onDelete,
  onMove,
  onVote,
}: ClusterLabelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showAIRename, setShowAIRename] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const voteCount = votes.length;

  const handleMove = useCallback((labelId: string, pos: { x: number; y: number }) => {
    onMove?.(labelId, pos);
  }, [onMove]);

  const { handlePointerDown: dragPointerDown, setElementRef } = usePureDrag({
    id: label.id,
    position: label.position,
    zoom,
    onMove: handleMove,
    onDragStart: (id: string) => {
      onSelect(id, false);
    },
    onDragEnd: () => {},
    disabled: isLocked || isEditing,
  });

  const colorConfig = LABEL_COLORS.find(c => c.border === label.color) ?? LABEL_COLORS[0];
  const canVote = isVotingMode && userVotesRemaining > 0 && !hasUserVoted;
  const hasVotedFor = votes.filter(v => v.votedBy === "current-user").length;

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (isLocked || isEditing) return;
    if (e.button !== 0) return;

    const target = e.target as HTMLElement;
    if (target.closest('input')) return;

    e.stopPropagation();

    // In voting mode, clicking anywhere on cluster area votes
    if (isVotingMode && onVote) {
      onVote(label.id);
      return;
    }

    const multi = e.shiftKey || e.ctrlKey || e.metaKey;
    onSelect(label.id, multi);

    dragPointerDown(e);
  }, [isLocked, isEditing, isVotingMode, onVote, onSelect, label.id, dragPointerDown]);

  const handleDoubleClick = useCallback(() => {
    if (isLocked) return;
    setIsEditing(true);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  }, [isLocked]);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === "Escape") {
      setIsEditing(false);
    }
  }, []);

  const INFLUENCE_RADIUS = 350; // Always show subtle influence zone
  const glowIntensity = isHighlighted ? Math.max(0.4, 1 - highlightDistance / 400) : 0.12;
  const glowSize = isHighlighted 
    ? INFLUENCE_RADIUS + 30 + (1 - highlightDistance / 400) * 50 
    : INFLUENCE_RADIUS;

  return (
    <div
      ref={(el) => setElementRef(el)}
      className="absolute select-none group"
      style={{
        left: label.position.x,
        top: label.position.y,
        zIndex: label.zIndex,
        cursor: isLocked ? "default" : isEditing ? "text" : "grab",
      }}
      onPointerDown={handlePointerDown}
      onDoubleClick={handleDoubleClick}
    >
      {/* Proximity zone - always visible as subtle circle */}
      <div
        className="absolute transition-all"
        style={{
          left: -INFLUENCE_RADIUS,
          top: -INFLUENCE_RADIUS,
          width: glowSize * 2,
          height: glowSize * 2,
          borderRadius: "50%",
          background: isVotingMode
            ? `radial-gradient(circle, ${colorConfig.glow}15 0%, ${colorConfig.glow}05 50%, transparent 70%)`
            : `radial-gradient(circle, ${colorConfig.border}${Math.round(glowIntensity * 25).toString(16).padStart(2, '0')} 0%, transparent 70%)`,
          border: isVotingMode
            ? `3px dashed ${canVote ? colorConfig.glow : colorConfig.glow + '60'}`
            : isHighlighted 
              ? `2px dashed ${colorConfig.border}${Math.round(glowIntensity * 255).toString(16).padStart(2, '0')}` 
              : `1px dashed ${colorConfig.border}40`,
          opacity: isVotingMode ? (canVote ? 1 : 0.7) : isHighlighted ? 1 : 0.4,
          cursor: isVotingMode ? (canVote ? "pointer" : "default") : isLocked ? "default" : "grab",
          pointerEvents: isVotingMode ? "auto" : "none",
        }}
      >
        {/* Voting drop zone indicator - shows "+1" */}
        {isVotingMode && canVote && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div 
              className="w-16 h-16 rounded-full bg-green-500/20 border-2 border-green-500/40 flex items-center justify-center animate-pulse"
            >
              <svg className="w-8 h-8 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </div>
          </div>
        )}
      </div>
      
      {/* Distance indicator line when dragging */}
      {isHighlighted && highlightDistance > 50 && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: -highlightDistance / 2,
            top: -highlightDistance / 2,
            width: highlightDistance,
            height: highlightDistance,
            borderLeft: `1px dashed ${colorConfig.border}60`,
            borderBottom: `1px dashed ${colorConfig.border}60`,
            transform: "rotate(-45deg)",
            transformOrigin: "top left",
          }}
        />
      )}
      
      <div
        className={`px-4 py-2.5 rounded-xl border-2 transition-all ${isVotingMode ? 'cursor-pointer hover:scale-105' : ''}`}
        style={{
          backgroundColor: isVotingMode 
            ? (hasUserVoted ? colorConfig.glow + '20' : colorConfig.bg)
            : colorConfig.bg,
          borderColor: isSelected 
            ? "#0d99ff" 
            : isVotingMode && hasUserVoted 
              ? colorConfig.glow 
              : colorConfig.border,
          boxShadow: isSelected 
            ? "0 0 0 2px rgba(13, 153, 255, 0.3), 0 0 15px rgba(13, 153, 255, 0.2)" 
            : isHighlighted
            ? `0 0 20px ${colorConfig.border}80, 0 0 40px ${colorConfig.border}40, 0 2px 8px rgba(0,0,0,0.15)`
            : isVotingMode && hasUserVoted
            ? `0 0 20px ${colorConfig.glow}60`
            : isVotingMode && canVote
            ? `0 0 15px ${colorConfig.glow}40`
            : "0 1px 3px rgba(0,0,0,0.1)",
          transform: isHighlighted ? "scale(1.08)" : "scale(1)",
        }}
      >
        <div className="flex items-center gap-3">
          {isEditing ? (
            <input
              ref={inputRef}
              autoFocus
              className="outline-none text-sm font-semibold min-w-[80px] bg-transparent"
              style={{ 
                color: colorConfig.text,
              }}
              value={label.text}
              onChange={(e) => onUpdate(label.id, { text: e.target.value })}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              onPointerDown={(e) => e.stopPropagation()}
            />
          ) : (
            <span 
              className="text-base font-semibold whitespace-nowrap"
              style={{ color: colorConfig.text }}
            >
              {label.text || "Cluster"}
            </span>
          )}

          {/* AI Rename Button - shows on hover/selection */}
          {!isLocked && !isVotingMode && stickiesInCluster.length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-violet-200 dark:hover:bg-violet-800"
                  style={{ 
                    opacity: isSelected ? 1 : 0,
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAIRename(true);
                  }}
                >
                  <Sparkles size={12} className="text-violet-600 dark:text-violet-400" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-card text-foreground border border-border shadow-lg">
                <p className="text-xs">AI Rename</p>
              </TooltipContent>
            </Tooltip>
          )}
          
          {/* Vote count badge - show as dots with animation */}
          {voteCount > 0 && (
            <div className="flex items-center gap-1">
              <AnimatePresence mode="popLayout">
                {votes.slice(0, 5).map((vote, i) => {
                  const userName = userNames.get(vote.votedBy) || (vote.votedBy === "current-user" ? "You" : "User");
                  const showTooltip = isRevealed && vote.votedBy !== "current-user";
                  
                  return (
                    <Tooltip key={`${vote.votedBy}-${i}`}>
                      <TooltipTrigger asChild>
                        <motion.div
                          className="w-6 h-6 rounded-full border-2 border-white shadow-md cursor-default"
                          style={{ 
                            backgroundColor: vote.color,
                            opacity: vote.votedBy === "current-user" ? 1 : isVotingMode ? 0.3 : 1
                          }}
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: vote.votedBy === "current-user" ? 1 : isVotingMode ? 0.3 : 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{ 
                            type: "spring", 
                            stiffness: 400, 
                            damping: 15,
                            delay: i * 0.05
                          }}
                          layout
                        />
                      </TooltipTrigger>
                      {showTooltip && (
                        <TooltipContent side="top" className="bg-card text-foreground border border-border shadow-lg">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: vote.color }}
                            />
                            <span className="text-sm font-medium">{userName}</span>
                          </div>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  );
                })}
              </AnimatePresence>
              {voteCount > 5 && (
                <span className="text-xs font-semibold ml-1 px-2 py-0.5 bg-muted text-muted-foreground rounded-full">
                  +{voteCount - 5}
                </span>
              )}
            </div>
          )}
          
          {/* User can vote indicator */}
          {isVotingMode && !hasUserVoted && userVotesRemaining > 0 && (
            <div className="w-5 h-5 rounded-full border-2 border-dashed animate-pulse" style={{ borderColor: colorConfig.border }}>
              <span className="sr-only">Click to vote</span>
            </div>
          )}
          
          {/* User voted indicator */}
          {isVotingMode && hasUserVoted && (
            <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: 'currentColor' }}>
              <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
          )}
        </div>
      </div>
      
      {/* Voting indicator - click to vote */}
      {isVotingMode && !hasUserVoted && userVotesRemaining > 0 && (
        <div
          className="absolute -top-1 -right-1 pointer-events-none"
        >
          <div 
            className="w-6 h-6 rounded-full bg-green-500 border-2 border-white shadow-lg flex items-center justify-center animate-bounce"
            style={{ animationDuration: '1.5s' }}
          >
            <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
        </div>
      )}
      
      {!isLocked && !isVotingMode && (
        <button
          className="absolute -top-2 -right-2 w-5 h-5 bg-white rounded-full shadow-md border border-gray-200 flex items-center justify-center text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ opacity: isSelected ? 1 : 0 }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(label.id);
          }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      )}

      {/* AI Rename Modal */}
      <AIRenameModal
        isOpen={showAIRename}
        onClose={() => setShowAIRename(false)}
        currentName={label.text}
        insights={stickiesInCluster.map(s => ({ text: s.content, type: s.color }))}
        projectContext={projectContext}
        onApplyName={(newName) => onUpdate(label.id, { text: newName })}
      />
    </div>
  );
});
