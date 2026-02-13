"use client";

import { motion, PanInfo } from "framer-motion";
import { VolumeX } from "lucide-react";
import React, { useState, useCallback, useMemo } from "react";
import { AffinityGroup as AffinityGroupType, Comment, DotVotingSession, Insight } from "@/types";
import { useMotionValue, useTransform } from "framer-motion";
import {
  ContextMenu,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useAuth, useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";
import { useSilentSorting } from "@/hooks/useSilentSorting";

// Extracted sub-components
import { GroupHeader } from "./group/GroupHeader";
import { InsightsList } from "./group/InsightsList";
import { DotVotingDots } from "./group/DotVotingDots";
import { GroupContextMenu } from "./group/GroupContextMenu";

interface AffinityGroupProps {
  group: AffinityGroupType;
  insights: Insight[];
  scale: number;
  isDragOver: boolean;
  workspaceMode: 'grouping' | 'voting';
  projectContext?: string;
  
  onMove: (groupId: string, position: { x: number; y: number }) => void;
  onDelete?: (groupId: string) => void;
  onTitleUpdate?: (groupId: string, title: string) => void;
  onRemoveInsight?: (insightId: string, groupId: string) => void;
  onSelect: (groupId: string, e: React.MouseEvent) => void;
  isSelected: boolean;
  isHighlighted?: boolean;
  
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  
  onInsightDragStart?: (insightId: string, groupId: string) => void;
  onInsightDrop?: (insightId: string, targetGroupId: string) => void;
  sharedSelections?: Record<string, string[]>;
  currentUserId?: string;
  onOpenComments?: (groupId: string, position: { x: number; y: number }, groupTitle: string) => void;
  mapId: string;
  commentCounts?: Record<string, number>;
  comments?: Comment[];
  
  isPresentationMode?: boolean;
  isFocusedInPresentation?: boolean;
  presentationScale?: number;
  isPlacingDot?: boolean;
  activeSessionId?: string;
  activeSession?: DotVotingSession;
  myDotsCount?: number;
}

export default function AffinityGroup({
  group, insights, scale, isSelected, isDragOver, isHighlighted,
  onMove, onDelete, onTitleUpdate, onRemoveInsight, onSelect,
  onDragOver, onDragLeave, onDrop, onInsightDragStart, onInsightDrop,
  workspaceMode, projectContext, sharedSelections, currentUserId,
  onOpenComments, mapId, commentCounts, comments,
  isPresentationMode = false, isFocusedInPresentation = false,
  presentationScale = 1, isPlacingDot = false, activeSessionId, activeSession,
  myDotsCount = 0,
}: AffinityGroupProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempTitle, setTempTitle] = useState(group.title);
  const { user } = useUser();
  const [isDragging, setIsDragging] = useState(false);
  const [localDots, setLocalDots] = useState<Array<{id: string, x: number, y: number, color: string}>>([]);

  const x = useMotionValue(group.position.x);
  const y = useMotionValue(group.position.y);
  const rotateX = useTransform(y, [-100, 0, 100], [1, 0, -1]);
  const rotateY = useTransform(x, [-100, 0, 100], [-1, 0, 1]);

  const unreadCount = useQuery(api.comments.getUnreadCount, {
    groupId: group.id, userId: currentUserId!, mapId: mapId as Id<"affinityMaps">,
  });

  const groupDots = useQuery(api.dotVoting.getDotsByTarget, 
    activeSessionId ? {
      sessionId: activeSessionId as Id<"dotVotingSessions">,
      targetType: 'group', targetId: group.id
    } : "skip"
  );
  const placeDot = useMutation(api.dotVoting.placeDot);

  const groupInsights = useMemo(() => 
    insights.filter(insight => group.insightIds.includes(insight.id)),
    [insights, group.insightIds]
  );
  const hasInsights = groupInsights.length > 0;

  const { isSilentSortingActive, currentPhase } = useSilentSorting(mapId);
  const canInteract = !isSilentSortingActive || currentPhase === 'discussion';

  const isSelectedByOther = Object.entries(sharedSelections || {}).some(
    ([userId, groupIds]) => userId !== currentUserId && (groupIds as string[]).includes(group.id)
  );

  const myMentions = useQuery(api.comments.getMentionsForUser, {
    mapId: mapId as Id<"affinityMaps">,
    userName: user?.fullName || user?.firstName || "",
  });
  const amIMentioned = myMentions?.includes(group.id);

  // ==================== GAMIFIED STYLES ====================
  const styles = useMemo(() => {
    const baseColor = group.color;
    return {
      container: {
        background: '#fff',
        border: `2px solid ${baseColor}30`,
        borderRadius: '28px',
        boxShadow: isSelected
          ? `0 4px 24px ${baseColor}33, 0 0 0 3px ${baseColor}`
          : isHighlighted
          ? `0 2px 12px ${baseColor}22, 0 0 0 2px ${baseColor}77`
          : `0 2px 12px rgba(0,0,0,0.08)`,
        transform: isSelected ? 'scale(1.03)' : 'scale(1)',
        transition: 'all 0.22s cubic-bezier(.4,0,.2,1)',
      },
      header: {
        background: baseColor + '18',
        borderBottom: `1.5px solid ${baseColor}33`,
        borderRadius: '24px 24px 0 0',
        minHeight: '48px',
      },
      insightCard: {
        background: '#fef9c3', border: '1.5px solid #fde68a',
        borderRadius: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        fontSize: '1rem', color: '#7c6512', fontFamily: 'Inter, sans-serif',
      },
      counterBadge: {
        background: baseColor, color: 'white', borderRadius: '10px',
        fontWeight: 700, fontSize: '0.95rem', boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
      },
      buttonGlossy: { background: '#f3f4f6', border: 'none', borderRadius: '50%', boxShadow: 'none' },
    };
  }, [group.color, isSelected, isHighlighted]);

  // ==================== EVENT HANDLERS ====================
  const handleDelete = useCallback((groupId: string) => onDelete?.(groupId), [onDelete]);
  const handleTitleUpdate = useCallback((groupId: string, title: string) => onTitleUpdate?.(groupId, title), [onTitleUpdate]);
  const handleRemoveInsight = useCallback((insightId: string, groupId: string) => onRemoveInsight?.(insightId, groupId), [onRemoveInsight]);

  const handleInsightDragStart = useCallback((e: React.DragEvent, insightId: string) => {
    if (isPresentationMode) return;
    e.stopPropagation();
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', insightId);
    e.dataTransfer.setData('application/group-id', group.id);
    e.dataTransfer.setData('application/insight-drag', 'true');
    onInsightDragStart?.(insightId, group.id);
    (e.currentTarget as HTMLElement).style.opacity = '0.4';
  }, [group.id, isPresentationMode, onInsightDragStart]);

  const handleInsightDropLocal = useCallback((e: React.DragEvent, targetGroupId: string) => {
    if (isPresentationMode) return;
    e.stopPropagation(); e.preventDefault();
    const insightId = e.dataTransfer.getData('text/plain');
    const sourceGroupId = e.dataTransfer.getData('application/group-id');
    const element = e.currentTarget as HTMLElement;
    element.style.backgroundColor = ''; element.style.borderColor = '';
    if ((!sourceGroupId || sourceGroupId !== targetGroupId) && insightId) {
      onInsightDrop?.(insightId, targetGroupId);
    }
  }, [isPresentationMode, onInsightDrop]);

  const handleDragEnd = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false);
    onMove(group.id, { x: group.position.x + info.offset.x / scale, y: group.position.y + info.offset.y / scale });
  }, [group.position.x, group.position.y, group.id, scale, onMove]); 

  const handleTitleSave = () => {
    if (tempTitle.trim() && tempTitle !== group.title) onTitleUpdate?.(group.id, tempTitle.trim());
    setIsEditing(false);
  };

  const handleTitleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); setTempTitle(group.title); setIsEditing(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleTitleSave();
    else if (e.key === 'Escape') { setTempTitle(group.title); setIsEditing(false); }
  };

  const handleRename = useCallback(() => {
    if (isPresentationMode) return;
    setTempTitle(group.title); setIsEditing(true);
  }, [group.title, isPresentationMode]);

  const handleDuplicate = useCallback(() => {
    if (isPresentationMode) return;
    // toast.info("Duplicate functionality coming soon");
  }, [isPresentationMode]);

  const handleDragOverLocal = useCallback((e: React.DragEvent) => { if (!isPresentationMode) onDragOver(e); }, [onDragOver, isPresentationMode]);
  const handleDragLeaveLocal = useCallback(() => { if (!isPresentationMode) onDragLeave(); }, [onDragLeave, isPresentationMode]);
  const handleDropLocal = useCallback((e: React.DragEvent) => { if (!isPresentationMode) onDrop(e); }, [onDrop, isPresentationMode]);

  const handleInsightDragOver = useCallback((e: React.DragEvent) => {
    if (isPresentationMode) return;
    e.stopPropagation(); e.preventDefault();
    const sourceGroupId = e.dataTransfer.getData('application/group-id');
    if (sourceGroupId && sourceGroupId !== group.id) {
      e.dataTransfer.dropEffect = 'move';
      const el = e.currentTarget as HTMLElement;
      el.style.backgroundColor = 'rgba(59, 130, 246, 0.1)'; el.style.borderColor = '#3B82F6';
    }
  }, [group.id, isPresentationMode]);

  const handleInsightDragLeave = useCallback((e: React.DragEvent) => {
    if (isPresentationMode) return;
    e.stopPropagation();
    const el = e.currentTarget as HTMLElement;
    el.style.backgroundColor = ''; el.style.borderColor = '';
  }, [isPresentationMode]);

  const handleInsightDragEnd = useCallback((e: React.DragEvent) => {
    if (isPresentationMode) return;
    e.stopPropagation();
    const el = e.currentTarget as HTMLElement;
    el.style.opacity = '1'; el.style.backgroundColor = ''; el.style.borderColor = '';
  }, [isPresentationMode]);

  const getUserColor = useCallback((userId: string) => {
    const colors = ["#EF4444", "#F59E0B", "#10B981", "#3B82F6", "#8B5CF6", "#EC4899"];
    return colors[userId.split('').reduce((a, b) => a + b.charCodeAt(0), 0) % colors.length];
  }, []);

  const handleAddDot = useCallback(async (e: React.MouseEvent) => {
    if (!isPlacingDot || !activeSessionId || !currentUserId) return;
    if (myDotsCount >= 10) {
      toast.error("You have reached the maximum of 10 dots");
      return;
    }
    e.stopPropagation(); e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const position = { x: e.clientX - rect.left - 12, y: e.clientY - rect.top - 12 };
    const userColor = getUserColor(currentUserId!);
    const tempDotId = `local-${Date.now()}-${Math.random()}`;
    setLocalDots(prev => [...prev, { id: tempDotId, x: position.x, y: position.y, color: userColor }]);
    try {
      const result = await placeDot({
        sessionId: activeSessionId as Id<"dotVotingSessions">,
        targetType: 'group', targetId: group.id, position,
      });
      if (result.success) setLocalDots(prev => prev.filter(dot => dot.id !== tempDotId));
    } catch (error) { console.error('Failed to save dot:', error); }
  }, [isPlacingDot, activeSessionId, currentUserId, placeDot, group.id, getUserColor, myDotsCount]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (isPlacingDot) { handleAddDot(e); return; }
    if (isPresentationMode) { e.stopPropagation(); return; }
    const isTaken = Object.entries(sharedSelections || {}).some(
      ([userId, groupIds]) => userId !== currentUserId && (groupIds as string[]).includes(group.id)
    );
    if (isTaken) return;
    e.stopPropagation();
    onSelect(group.id, e);
  }, [isPlacingDot, isPresentationMode, sharedSelections, currentUserId, group.id, onSelect, handleAddDot]);

  const handleDragStart = useCallback(() => {
    if (isPresentationMode) return;
    setIsDragging(true);
  }, [isPresentationMode]);

  // ==================== RENDER ====================
  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <motion.div
          data-group-id={group.id}
          drag={!isSelectedByOther && !isPresentationMode}
          dragMomentum={false}
          dragElastic={0}
          onDragStart={(e) => {
            if (isPresentationMode) return;
            const data = e as unknown as React.DragEvent;
            const isInsightDrag = data.dataTransfer?.types.includes('application/insight-drag');
            if (!isInsightDrag) handleDragStart();
          }}
          onDragEnd={isPresentationMode ? undefined : handleDragEnd}
          onClick={handleClick}
          onDragOver={handleDragOverLocal}
          onDragLeave={handleDragLeaveLocal}
          onDrop={handleDropLocal}
          style={{ 
            ...styles.container, x, y,
            rotateX: isDragging ? rotateX : 0,
            rotateY: isDragging ? rotateY : 0,
            pointerEvents: isPresentationMode ? 'none' : 'auto'
          }}
          className={`absolute min-w-80 max-w-96 ${
            isPresentationMode ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
          } ${isPlacingDot ? 'ring-4 ring-blue-400 ring-opacity-60 animate-pulse' : ''}
          ${!canInteract ? 'opacity-80 cursor-not-allowed' : 'cursor-grab'}`}
        >

          {/* SILENT SORTING OVERLAY */}
          {!canInteract && isSilentSortingActive && (
            <div className="absolute inset-0 bg-white/70 rounded-2xl flex items-center justify-center z-10 backdrop-blur-sm">
              <div className="text-center p-4" style={styles.buttonGlossy}>
                <VolumeX className="w-8 h-8 mx-auto mb-2 text-gray-500" />
                <p className="text-sm text-gray-600 font-medium">Silent Sorting</p>
                <p className="text-xs text-gray-500">Discussion paused</p>
              </div>
            </div>
          )}

          {/* UNREAD BADGE */}
          {unreadCount !== undefined && unreadCount > 0 && (
            <div className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center z-20 animate-bounce">
              <span className="text-white text-xs font-bold">{unreadCount}</span>
            </div>
          )}

          {/* GROUP HEADER */}
          <GroupHeader
            group={group}
            insights={insights}
            groupInsights={groupInsights}
            isEditing={isEditing}
            tempTitle={tempTitle}
            setTempTitle={setTempTitle}
            onTitleSave={handleTitleSave}
            onKeyDown={handleKeyDown}
            onTitleClick={handleTitleClick}
            onTitleUpdate={handleTitleUpdate}
            onDelete={handleDelete}
            onAddDot={handleAddDot}
            isPresentationMode={isPresentationMode}
            isFocusedInPresentation={isFocusedInPresentation}
            isPlacingDot={isPlacingDot}
            hasInsights={hasInsights}
            projectContext={projectContext}
            styles={styles}
            onOpenComments={onOpenComments}
            amIMentioned={amIMentioned}
          />

          {/* INSIGHTS LIST */}
          <InsightsList
            groupInsights={groupInsights}
            group={group}
            isDragOver={isDragOver}
            workspaceMode={workspaceMode}
            isPresentationMode={isPresentationMode}
            isFocusedInPresentation={isFocusedInPresentation}
            isPlacingDot={isPlacingDot}
            isSelectedByOther={isSelectedByOther}
            insightCardStyle={styles.insightCard}
            onRemoveInsight={onRemoveInsight}
            onInsightDragStart={handleInsightDragStart}
            onInsightDragOver={handleInsightDragOver}
            onInsightDragLeave={handleInsightDragLeave}
            onInsightDrop={handleInsightDropLocal}
            onInsightDragEnd={handleInsightDragEnd}
            onDragOver={handleDragOverLocal}
            onDragLeave={handleDragLeaveLocal}
            onDrop={handleDropLocal}
          />

          {/* DOT VOTING DOTS */}
          <DotVotingDots
            localDots={localDots}
            groupDots={groupDots}
            currentUserId={currentUserId}
            activeSession={activeSession}
            getUserColor={getUserColor}
          />
        </motion.div>
      </ContextMenuTrigger>

      {/* CONTEXT MENU */}
      <GroupContextMenu
        group={group}
        hasInsights={hasInsights}
        isPresentationMode={isPresentationMode}
        handleRename={handleRename}
        handleDuplicate={handleDuplicate}
        handleDelete={handleDelete}
      />
    </ContextMenu>
  );
}