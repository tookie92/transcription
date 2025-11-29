"use client";

import { motion, PanInfo } from "framer-motion";
import { Trash2, Vote, GripVertical, Edit, Copy, Edit3, Sparkles, VolumeX } from "lucide-react";
import React, { useState, useCallback, useMemo } from "react";
import { AffinityGroup as AffinityGroupType, Comment, DotVotingSession, Insight } from "@/types";
import { useMotionValue, useTransform } from "framer-motion";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { GroupNameAssistant } from "./GroupNameAssistant";
import { toast } from "sonner";
import { hashCode } from "@/utils/hashCodes";
import { useAuth, useUser } from "@clerk/nextjs";
import { CommentPanel } from "./CommentPanel";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useSilentSorting } from "@/hooks/useSilentSorting";

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
  onOpenComments?: ( groupId: string, position: { x: number; y: number }, groupTitle: string) => void;
  mapId: string;
  commentCounts?: Record<string, number>;
  comments?: Comment[];
  
  isPresentationMode?: boolean;
  isFocusedInPresentation?: boolean;
  presentationScale?: number;
  isPlacingDot?: boolean;
  activeSessionId?: string;
  activeSession?: DotVotingSession;
}

export default function AffinityGroup({
  group,
  insights,
  scale,
  isSelected,
  isDragOver,
  isHighlighted,
  onMove,
  onDelete,
  onTitleUpdate,
  onRemoveInsight,
  onSelect,
  onDragOver,
  onDragLeave,
  onDrop,
  onInsightDragStart,
  onInsightDrop,
  workspaceMode,
  projectContext,
  sharedSelections,
  currentUserId,
  onOpenComments,
  mapId,
  commentCounts,
  comments,
  isPresentationMode = false,
  isFocusedInPresentation = false,
  presentationScale = 1,
  isPlacingDot = false,
  activeSessionId,
  activeSession,
}: AffinityGroupProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempTitle, setTempTitle] = useState(group.title);
  const [applyingAction, setApplyingAction] = useState<string | null>(null);
  const [highlightedGroups, setHighlightedGroups] = useState<Set<string>>(new Set());
  const [showComments, setShowComments] = useState<{
    groupId: string;
    screenRect: DOMRect;
    groupTitle: string;
  } | null>(null);
  const { user } = useUser();

  const isNew = comments?.some(
    (c) => Date.now() - c.createdAt < 5 * 60 * 1000
  );

  const unreadCount = useQuery(api.comments.getUnreadCount, {
    groupId: group.id,
    userId: currentUserId!,
    mapId: mapId as Id<"affinityMaps">,
  });

  const sharedUser = Object.entries(sharedSelections || {}).find(
    ([userId, groupIds]) =>
      userId !== currentUserId && (groupIds as string[]).includes(group.id)
  );

  const [isDragging, setIsDragging] = useState(false);

  const x = useMotionValue(group.position.x);
  const y = useMotionValue(group.position.y);

  const rotateX = useTransform(y, [-100, 0, 100], [1, 0, -1]);
  const rotateY = useTransform(x, [-100, 0, 100], [-1, 0, 1]);

  const groupDots = useQuery(api.dotVoting.getDotsByTarget, 
    activeSessionId ? {
      sessionId: activeSessionId as Id<"dotVotingSessions">,
      targetType: 'group',
      targetId: group.id
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

  // ==================== GAMIFIED STYLES ====================

  const getGamifiedStyles = () => {
    const baseColor = group.color;
    
    return {
      // 🎮 Container avec effet de carte de jeu
      container: {
        background: `linear-gradient(135deg, ${baseColor}08, ${baseColor}15)`,
        border: `3px solid ${baseColor}40`,
        borderRadius: '20px',
        boxShadow: isSelected 
          ? `0 8px 32px ${baseColor}40, 0 0 0 3px ${baseColor}80`
          : isHighlighted
          ? `0 6px 24px ${baseColor}30, 0 0 0 2px ${baseColor}60`
          : `0 4px 20px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.05)`,
        backdropFilter: 'blur(10px)',
        transform: isSelected ? 'scale(1.02)' : 'scale(1)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      },
      
      // 🎮 Header avec effet badge
      header: {
        background: `linear-gradient(135deg, ${baseColor}20, ${baseColor}30)`,
        borderBottom: `2px solid ${baseColor}30`,
        borderRadius: '17px 17px 0 0',
      },
      
      // 🎮 Insights avec effet de carte empilée
      insightCard: {
        background: `linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.7))`,
        border: `1px solid ${baseColor}20`,
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
      },
      
      // 🎮 Badge de compteur
      counterBadge: {
        background: `linear-gradient(135deg, ${baseColor}, ${baseColor}CC)`,
        color: 'white',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      },
      
      // 🎮 Boutons avec effet glossy
      buttonGlossy: {
        background: `linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.6))`,
        border: `1px solid ${baseColor}20`,
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
      }
    };
  };

  const styles = getGamifiedStyles();

  // ==================== EVENT HANDLERS ====================

  const handleDelete = useCallback((groupId: string) => {
    onDelete?.(groupId);
  }, [onDelete]);

  const handleTitleUpdate = useCallback((groupId: string, title: string) => {
    onTitleUpdate?.(groupId, title);
  }, [onTitleUpdate]);

  const handleRemoveInsight = useCallback((insightId: string, groupId: string) => {
    onRemoveInsight?.(insightId, groupId);
  }, [onRemoveInsight]);

  const handleInsightDragStart = useCallback((e: React.DragEvent, insightId: string) => {
    if (isPresentationMode) return;
    
    e.stopPropagation();
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', insightId);
    e.dataTransfer.setData('application/group-id', group.id);
    e.dataTransfer.setData('application/insight-drag', 'true');
    
    onInsightDragStart?.(insightId, group.id);
    
    const element = e.currentTarget as HTMLElement;
    element.style.opacity = '0.4';
  }, [group.id, isPresentationMode, onInsightDragStart]);

  const handleInsightDrop = useCallback((e: React.DragEvent, targetGroupId: string) => {
    if (isPresentationMode) return;
    
    e.stopPropagation();
    e.preventDefault();
    
    const insightId = e.dataTransfer.getData('text/plain');
    const sourceGroupId = e.dataTransfer.getData('application/group-id');
    
    const element = e.currentTarget as HTMLElement;
    element.style.backgroundColor = '';
    element.style.borderColor = '';
    
    const isValidDrop = !sourceGroupId || sourceGroupId !== targetGroupId;
    
    if (isValidDrop && insightId) {
      onInsightDrop?.(insightId, targetGroupId);
    }
  }, [isPresentationMode, onInsightDrop]);

  const handleOpenComments = useCallback((
    groupId: string, 
    position: { x: number; y: number }, 
    groupTitle: string
  ) => {
    const rect = new DOMRect(position.x, position.y, 0, 0);
    setShowComments({ 
      groupId, 
      screenRect: rect,
      groupTitle
    });
  }, []);

  const [localDots, setLocalDots] = useState<Array<{id: string, x: number, y: number, color: string}>>([]);

  const handleDragEnd = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false);
    const finalX = group.position.x + info.offset.x / scale;
    const finalY = group.position.y + info.offset.y / scale;
    onMove(group.id, { x: finalX, y: finalY });
  }, [group.position.x, group.position.y, group.id, scale, onMove]); 

  const handleTitleSave = () => {
    if (tempTitle.trim() && tempTitle !== group.title) {
      onTitleUpdate?.(group.id, tempTitle.trim());
    }
    setIsEditing(false);
  };

  const handleTitleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTempTitle(group.title);
    setIsEditing(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSave();
    } else if (e.key === 'Escape') {
      setTempTitle(group.title);
      setIsEditing(false);
    }
  };

  const handleRename = useCallback(() => {
    if (isPresentationMode) return;
    setTempTitle(group.title);
    setIsEditing(true);
  }, [group.title, isPresentationMode]);

  const handleDuplicate = useCallback(() => {
    if (isPresentationMode) return;
    toast.info("Duplicate functionality coming soon");
  }, [group.id, isPresentationMode]);

  const handleGroupDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDrop(e);
  };

  const handleMove = useCallback((groupId: string, position: { x: number; y: number }) => {
    if (isPresentationMode) return;
    onMove(groupId, position);
  }, [onMove, isPresentationMode]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    if (isPresentationMode) return;
    onDrop(e);
  }, [onDrop, isPresentationMode]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (isPresentationMode) return;
    onDragOver(e);
  }, [onDragOver, isPresentationMode]);

  const handleDragLeave = useCallback(() => {
    if (isPresentationMode) return;
    onDragLeave();
  }, [onDragLeave, isPresentationMode]);

  const handleInsightDragOver = useCallback((e: React.DragEvent) => {
    if (isPresentationMode) return;
    
    e.stopPropagation();
    e.preventDefault();
    
    const sourceGroupId = e.dataTransfer.getData('application/group-id');
    if (sourceGroupId && sourceGroupId !== group.id) {
      e.dataTransfer.dropEffect = 'move';
      
      const element = e.currentTarget as HTMLElement;
      element.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
      element.style.borderColor = '#3B82F6';
    }
  }, [group.id, isPresentationMode]);

  const handleInsightDragLeave = useCallback((e: React.DragEvent) => {
    if (isPresentationMode) return;
    
    e.stopPropagation();
    
    const element = e.currentTarget as HTMLElement;
    element.style.backgroundColor = '';
    element.style.borderColor = '';
  }, [isPresentationMode]);

  const handleInsightDragEnd = useCallback((e: React.DragEvent) => {
    if (isPresentationMode) return;
    
    e.stopPropagation();
    
    const element = e.currentTarget as HTMLElement;
    element.style.opacity = '1';
    element.style.backgroundColor = '';
    element.style.borderColor = '';
  }, [isPresentationMode]);

  const getUserColor = useCallback((userId: string) => {
    const colors = ["#EF4444", "#F59E0B", "#10B981", "#3B82F6", "#8B5CF6", "#EC4899"];
    const hash = userId.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    return colors[hash % colors.length];
  }, []);

  const handleAddDot = useCallback(async (e: React.MouseEvent) => {
    if (!isPlacingDot || !activeSessionId || !currentUserId) return;
    
    e.stopPropagation();
    e.preventDefault();

    const rect = e.currentTarget.getBoundingClientRect();
    const position = {
      x: e.clientX - rect.left - 12,
      y: e.clientY - rect.top - 12
    };

    const userColor = getUserColor(currentUserId!);
    const tempDotId = `local-${Date.now()}-${Math.random()}`;
    
    setLocalDots(prev => [...prev, {
      id: tempDotId,
      x: position.x,
      y: position.y,
      color: userColor
    }]);

    try {
      const result = await placeDot({
        sessionId: activeSessionId as Id<"dotVotingSessions">,
        targetType: 'group',
        targetId: group.id,
        position,
      });
      
      if (result.success) {
        setLocalDots(prev => prev.filter(dot => dot.id !== tempDotId));
      }
    } catch (error) {
      console.error('Failed to save dot:', error);
    }
  }, [isPlacingDot, activeSessionId, currentUserId, placeDot, group.id, getUserColor]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (isPlacingDot) {
      handleAddDot(e);
      return;
    }
    
    if (isPresentationMode) {
      e.stopPropagation();
      return;
    }

    const isTaken = Object.entries(sharedSelections || {}).some(
      ([userId, groupIds]) =>
        userId !== currentUserId && (groupIds as string[]).includes(group.id)
    );
    
    if (isTaken) return;
    
    e.stopPropagation();
    onSelect(group.id, e);
  }, [isPlacingDot, isPresentationMode, sharedSelections, currentUserId, group.id, onSelect, handleAddDot]);

  const handleDragStart = useCallback(() => {
    if (isPresentationMode) return;
    setIsDragging(true);
  }, [isPresentationMode]);

  const isSelectedByOther = Object.entries(sharedSelections || {}).some(
    ([userId, groupIds]) =>
      userId !== currentUserId && (groupIds as string[]).includes(group.id)
  );

  const myMentions = useQuery(api.comments.getMentionsForUser, {
    mapId: mapId as Id<"affinityMaps">,
    userName: user?.fullName || user?.firstName || "",
  });

  const amIMentioned = myMentions?.includes(group.id);

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
            if (!isInsightDrag) {
              handleDragStart();
            }
          }}
          onDragEnd={isPresentationMode ? undefined : handleDragEnd}
          onClick={handleClick}
          
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          
          style={{ 
            ...styles.container,
            x, 
            y,
            rotateX: isDragging ? rotateX : 0,
            rotateY: isDragging ? rotateY : 0,
            pointerEvents: isPresentationMode ? 'none' : 'auto'
          }}
          
          className={`absolute min-w-80 max-w-96 ${
            isPresentationMode 
              ? 'cursor-default' 
              : 'cursor-grab active:cursor-grabbing'
          } ${isPlacingDot ? 'ring-4 ring-blue-400 ring-opacity-60 animate-pulse' : ''}
          ${!canInteract ? 'opacity-80 cursor-not-allowed' : 'cursor-grab'}`}
        >

          {!canInteract && isSilentSortingActive && (
            <div className="absolute inset-0 bg-white/70 rounded-2xl flex items-center justify-center z-10 backdrop-blur-sm">
              <div className="text-center p-4" style={styles.buttonGlossy}>
                <VolumeX className="w-8 h-8 mx-auto mb-2 text-gray-500" />
                <p className="text-sm text-gray-600 font-medium">Silent Sorting</p>
                <p className="text-xs text-gray-500">Discussion paused</p>
              </div>
            </div>
          )}

        {unreadCount !== undefined && unreadCount > 0 && (
          <div className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center z-20 animate-bounce">
            <span className="text-white text-xs font-bold">{unreadCount}</span>
          </div>
        )}

          {/* 🎮 HEADER AVEC STYLE GAMIFIÉ */}
          <div 
            className="flex items-center gap-3 px-4 py-3 cursor-grab active:cursor-grabbing relative"
            style={styles.header}
            onMouseDown={(e) => {
              if (isPresentationMode) {
                e.preventDefault();
                return;
              }
              e.stopPropagation();
            }}
            onClick={handleAddDot}
          >
            
            {/* INDICATEUR PRÉSENTATION */}
            {isPresentationMode && isFocusedInPresentation && (
              <div className="absolute -top-3 -left-3 bg-linear-to-r from-blue-500 to-purple-600 text-white text-xs px-3 py-1 rounded-full font-bold animate-pulse shadow-lg">
                🎯 FOCUS
              </div>
            )}

            {/* INDICATEUR VOTE */}
            {isPlacingDot && (
              <div className="absolute -top-3 -right-3 w-7 h-7 bg-linear-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center animate-ping z-10 shadow-lg">
                <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center">
                  <span className="text-green-600 text-xs font-bold">+</span>
                </div>
              </div>
            )}

            {/* GRIP ICON */}
            <GripVertical 
              size={18} 
              style={{ 
                color: group.color,
                opacity: isPresentationMode ? 0.3 : 0.8,
              }} 
              className="shrink-0"
            />

            {/* TITRE */}
            {isEditing ? (
              <input
                type="text"
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={handleKeyDown}
                className="flex-1 font-bold text-base bg-white/80 border-2 outline-none px-3 py-2 rounded-xl transition-all shadow-inner"
                style={{
                  color: group.color,
                  border: `2px solid ${group.color}40`,
                  backgroundColor: 'rgba(255, 255, 255, 0.9)'
                }}
                autoFocus
                readOnly={isPresentationMode}
              />
            ) : (
              <h3 
                className="flex-1 font-bold text-base cursor-text select-text hover:bg-white/30 px-3 py-2 rounded-xl transition-all"
                style={{ color: group.color }}
                onClick={(e) => {
                  if (isPresentationMode || isPlacingDot) return;
                  handleTitleClick(e);
                }}
                title={isPresentationMode ? "" : "Click to edit title"}
              >
                {group.title}
                {isPlacingDot && (
                  <span className="block text-xs font-normal text-gray-500 mt-1">
                    Click anywhere to vote!
                  </span>
                )}
              </h3>
            )}

            {/* BOUTONS D'ACTION */}
            <div className="flex items-center gap-2">
              {/* COMPTEUR D'INSIGHTS */}
              <span 
                className="text-sm font-bold text-white px-3 py-1.5 rounded-xl shadow-lg"
                style={styles.counterBadge}
              >
                {groupInsights.length}
              </span>

              {/* ASSISTANT IA */}
              {hasInsights && !isPresentationMode && !isPlacingDot && (
                <GroupNameAssistant
                  group={group}
                  insights={insights}
                  currentTitle={group.title}
                  onTitleUpdate={(newTitle: string) => {
                    handleTitleUpdate(group.id, newTitle);
                  }}
                  projectContext={projectContext}
                />
              )}

              {/* BOUTON SUPPRIMER */}
              {!isPresentationMode && !isPlacingDot && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(group.id);
                  }}
                  className="p-2 text-gray-400 hover:text-red-500 transition-all hover:scale-110 rounded-lg"
                  style={styles.buttonGlossy}
                  title="Delete group"
                >
                  <Trash2 size={16} />
                </button>
              )}

              {/* BOUTON COMMENTAIRES */}
              {!isPresentationMode && !isPlacingDot && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const rect = (e.currentTarget as HTMLElement)
                      .closest('[data-group-id]')!
                      .getBoundingClientRect();
                    
                    if (onOpenComments) {
                      onOpenComments(group.id, { x: rect.right, y: rect.top }, group.title);
                    }
                  }}
                  className="p-2 text-gray-400 hover:text-blue-500 transition-all hover:scale-110 rounded-lg relative"
                  style={styles.buttonGlossy}
                  title="Add comment"
                >
                  <span className="text-lg">💬</span>
                  {amIMentioned && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* CONTENU DES INSIGHTS */}
          <div 
            className={`p-4 space-y-3 max-h-60 overflow-y-auto ${
              isPresentationMode && isFocusedInPresentation 
                ? 'bg-linear-to-br from-blue-50 to-indigo-50' 
                : 'bg-white/50'
            } rounded-b-2xl`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {groupInsights.map(insight => (
              <div
                key={insight.id}
                className="p-3 rounded-xl transition-all hover:scale-[1.02] hover:shadow-md cursor-move group"
                style={styles.insightCard}
                draggable={workspaceMode === 'grouping' && !isSelectedByOther && !isPresentationMode && !isPlacingDot}
                onDragStart={(e) => {
                  if (isPresentationMode || isPlacingDot) return;
                  handleInsightDragStart(e, insight.id);
                }}
                onDragOver={handleInsightDragOver}
                onDragLeave={handleInsightDragLeave}
                onDrop={(e) => {
                  if (isPresentationMode || isPlacingDot) return;
                  handleInsightDrop(e, group.id);
                }}
                onDragEnd={handleInsightDragEnd}
              >
                <div className="flex items-start justify-between">
                  <span className={`text-xs font-bold px-2 py-1 rounded-lg mr-3 shadow-sm ${
                    insight.type === 'pain-point' ? 'bg-linear-to-r from-red-100 to-red-200 text-red-700' :
                    insight.type === 'quote' ? 'bg-linear-to-r from-blue-100 to-blue-200 text-blue-700' :
                    insight.type === 'insight' ? 'bg-linear-to-r from-purple-100 to-purple-200 text-purple-700' :
                    'bg-linear-to-r from-green-100 to-green-200 text-green-700'
                  }`}>
                    {insight.type.charAt(0).toUpperCase()}
                  </span>
                  <span className="flex-1 text-sm leading-relaxed">{insight.text}</span>
                  
                  {workspaceMode === 'grouping' && onRemoveInsight && !isPresentationMode && !isPlacingDot && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveInsight(insight.id, group.id);
                      }}
                      className="ml-2 text-gray-400 hover:text-red-500 transition-all hover:scale-110 opacity-0 group-hover:opacity-100 p-1 rounded"
                      title="Remove from group"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {groupInsights.length === 0 && (
              <div className={`text-center py-6 text-sm rounded-xl ${
                isDragOver 
                  ? 'bg-linear-to-r from-blue-50 to-indigo-50 text-blue-600 font-bold border-2 border-dashed border-blue-300' 
                  : 'text-gray-400 bg-gray-50/50'
              } transition-all`}>
                {workspaceMode === 'grouping' && !isPlacingDot
                  ? (isDragOver 
                      ? '🎉 Drop insights here!' 
                      : '✨ Drag insights here to group them')
                  : 'No insights yet'
                }
                {isPlacingDot && (
                  <div className="mt-2 text-xs text-gray-500">
                    Click to place your vote dot!
                  </div>
                )}
              </div>
            )}
          </div>

          {/* DOTS DE VOTE LOCAUX */}
          {localDots.map(dot => (
            <div
              key={dot.id}
              className="absolute w-10 h-10 rounded-full border-4 border-white shadow-2xl flex items-center justify-center z-40 animate-pop-in"
              style={{
                left: dot.x,
                top: dot.y,
                background: `radial-gradient(circle, ${dot.color}, ${dot.color}CC)`,
                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
              }}
              title="Your vote"
            >
              <span className="text-white text-sm font-bold">✓</span>
            </div>
          ))}

          {/* DOTS DE VOTE DE LA BASE */}
          {groupDots && groupDots.map(dot => {
            const isMyDot = dot.userId === currentUserId;
            const isVisible = 
              isMyDot || 
              !activeSession?.isSilentMode ||
              activeSession?.votingPhase !== 'voting';

            if (!isVisible) return null;

            return (
              <div
                key={dot._id}
                className="absolute w-10 h-10 rounded-full border-4 border-white shadow-2xl flex items-center justify-center z-30 transition-all hover:scale-125 hover:rotate-12"
                style={{
                  left: dot.position.x,
                  top: dot.position.y,
                  background: `radial-gradient(circle, ${dot.color || getUserColor(dot.userId)}, ${dot.color || getUserColor(dot.userId)}CC)`,
                  filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
                }}
                title={isMyDot ? "Your vote" : "Participant vote"}
              >
                {isMyDot && (
                  <span className="text-white text-sm font-bold animate-pulse">✓</span>
                )}
              </div>
            );
          })}

        </motion.div>
      </ContextMenuTrigger>

      {/* CONTEXT MENU GAMIFIÉ */}
      {!isPresentationMode && (
        <ContextMenuContent className="w-72 rounded-2xl shadow-2xl border-0 overflow-hidden">
          <div 
            className="px-4 py-3 text-sm font-bold text-white border-b"
            style={{ 
              background: `linear-gradient(135deg, ${group.color}, ${group.color}CC)`,
            }}
          >
            {group.title}
          </div>
          
          <div className="p-2 bg-white/95 backdrop-blur-sm">
            <ContextMenuItem 
              onClick={(e: React.MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                handleRename();
              }}
              className="flex items-center gap-3 cursor-pointer p-3 rounded-xl hover:bg-gray-50 transition-all mb-1"
            >
              <div className="p-2 rounded-lg bg-blue-50">
                <Edit3 size={16} className="text-blue-600" />
              </div>
              <span className="font-medium">Rename Group</span>
            </ContextMenuItem>
            
            {hasInsights && (
              <ContextMenuItem 
                className="flex items-center gap-3 cursor-pointer p-3 rounded-xl hover:bg-gray-50 transition-all mb-1"
              >
                <div className="p-2 rounded-lg bg-purple-50">
                  <Sparkles size={16} className="text-purple-600" />
                </div>
                <span className="font-medium">AI Name Suggestions</span>
              </ContextMenuItem>
            )}
            
            <ContextMenuItem 
              onClick={(e: React.MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                handleDuplicate();
              }}
              className="flex items-center gap-3 cursor-pointer p-3 rounded-xl hover:bg-gray-50 transition-all mb-1"
            >
              <div className="p-2 rounded-lg bg-green-50">
                <Copy size={16} className="text-green-600" />
              </div>
              <span className="font-medium">Duplicate Group</span>
            </ContextMenuItem>
            
            <div className="border-t my-2"></div>
            
            <ContextMenuItem 
              onClick={(e: React.MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                handleDelete(group.id);
              }}
              className="flex items-center gap-3 cursor-pointer p-3 rounded-xl hover:bg-red-50 transition-all text-red-600"
            >
              <div className="p-2 rounded-lg bg-red-50">
                <Trash2 size={16} className="text-red-600" />
              </div>
              <span className="font-medium">Delete Group</span>
            </ContextMenuItem>
          </div>
        </ContextMenuContent>
      )}
    </ContextMenu>
  );
}