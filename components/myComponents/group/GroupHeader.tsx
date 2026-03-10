"use client";

import React from "react";
import { GripVertical, Trash2, MessageCircle, Sparkles, ChevronDown, ChevronUp, Maximize2, Minimize2, Circle } from "lucide-react";
import { AffinityGroup as AffinityGroupType, Insight } from "@/types";
import { GroupNameAssistant } from "../GroupNameAssistant";
import { motion } from "framer-motion";

interface GroupHeaderProps {
  group: AffinityGroupType;
  insights: Insight[];
  groupInsights: Insight[];
  hasInsights: boolean;
  isEditing: boolean;
  isCollapsed?: boolean;
  tempTitle: string;
  setTempTitle: (title: string) => void;
  onTitleSave: () => void;
  onTitleClick: (e: React.MouseEvent) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onDelete: (groupId: string) => void;
  onTitleUpdate?: (groupId: string, title: string) => void;
  onOpenComments?: (groupId: string, position: { x: number; y: number }, groupTitle: string) => void;
  onAddDot: (e: React.MouseEvent) => void;
  onToggleCollapse?: () => void;
  onResize?: (groupId: string, size: { width: number; height: number }) => void;
  projectContext?: string;
  isPresentationMode: boolean;
  isFocusedInPresentation: boolean;
  isPlacingDot: boolean;
  unreadCount?: number;
  amIMentioned?: boolean;
  isSelectedByOther?: boolean;
  isChatOpen?: boolean;
  myDotsCount?: number;
  groupDotsCount?: number;
}

export function GroupHeader({
  group,
  insights,
  groupInsights,
  hasInsights,
  isEditing,
  isCollapsed = false,
  tempTitle,
  setTempTitle,
  onTitleSave,
  onTitleClick,
  onKeyDown,
  onDelete,
  onTitleUpdate,
  onOpenComments,
  onAddDot,
  onToggleCollapse,
  onResize,
  projectContext,
  isPresentationMode,
  isFocusedInPresentation,
  isPlacingDot,
  unreadCount,
  amIMentioned,
  isSelectedByOther,
  isChatOpen = false,
  myDotsCount = 0,
  groupDotsCount = 0,
}: GroupHeaderProps) {
  const insightCount = groupInsights.length;
  const [isResizing, setIsResizing] = React.useState(false);
  const groupWidth = (group as unknown as { width?: number }).width || 320;
  const groupHeight = (group as unknown as { height?: number }).height || 300;

  const handleResize = (e: React.MouseEvent, direction: 'width' | 'height' | 'both') => {
    e.stopPropagation();
    setIsResizing(true);
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = groupWidth;
    const startHeight = groupHeight;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      
      let newWidth = startWidth;
      let newHeight = startHeight;

      if (direction === 'width' || direction === 'both') {
        newWidth = Math.max(250, Math.min(600, startWidth + deltaX));
      }
      if (direction === 'height' || direction === 'both') {
        newHeight = Math.max(150, Math.min(800, startHeight + deltaY));
      }

      if (onResize) {
        onResize(group.id, { width: newWidth, height: newHeight });
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      className={`
        group relative flex items-center gap-2 px-4 py-3 cursor-grab active:cursor-grabbing 
        transition-all duration-200
        ${isFocusedInPresentation ? "bg-blue-50" : ""}
        ${isResizing ? "cursor-resize" : ""}
      `}
      style={{
        backgroundColor: `${group.color}15`,
        borderBottom: `2px solid ${group.color}60`,
      }}
      onMouseDown={(e) => {
        if (isPresentationMode) {
          e.preventDefault();
          return;
        }
        e.stopPropagation();
      }}
      onClick={onAddDot}
    >
      {/* FOCUS indicator */}
      {isPresentationMode && isFocusedInPresentation && (
        <motion.div 
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="absolute -top-2 -left-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-[9px] px-2 py-0.5 rounded-full font-bold shadow-lg z-20"
        >
          🎯
        </motion.div>
      )}

      {/* VOTE indicator */}
      {isPlacingDot && (
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-2 -right-2 w-7 h-7 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg z-20"
        >
          <span className="text-white text-sm font-bold">+</span>
        </motion.div>
      )}

      {/* TAKEN indicator */}
      {isSelectedByOther && (
        <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-700 rounded-full text-orange-700 dark:text-orange-300 text-[10px] font-medium z-10 shadow">
          🔒
        </div>
      )}

      {/* Collapse Toggle */}
      {hasInsights && !isPresentationMode && !isPlacingDot && onToggleCollapse && (
        <motion.button
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          onClick={(e) => {
            e.stopPropagation();
            onToggleCollapse();
          }}
          className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground"
          title={isCollapsed ? "Expand" : "Collapse"}
        >
          {isCollapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
        </motion.button>
      )}

      {/* Grip Icon */}
      <GripVertical
        size={14}
        style={{
          color: group.color,
          opacity: isPresentationMode ? 0.2 : 0.5,
        }}
        className="shrink-0 ml-1"
      />

      {/* Title Section */}
      {isEditing ? (
        <input
          type="text"
          value={tempTitle}
          onChange={(e) => setTempTitle(e.target.value)}
          onBlur={onTitleSave}
          onKeyDown={onKeyDown}
          className="flex-1 font-bold text-sm bg-background border-2 outline-none px-2 py-1 rounded-lg transition-all shadow-sm"
          style={{
            color: group.color,
            borderColor: `${group.color}50`,
          }}
          autoFocus
          readOnly={isPresentationMode}
        />
      ) : (
        <div className="flex-1 min-w-0">
          <h3
            className="font-bold text-sm truncate cursor-text select-text"
            style={{ color: group.color }}
            onClick={(e) => {
              if (isPresentationMode || isPlacingDot) return;
              e.stopPropagation();
              onTitleClick(e);
            }}
          >
            {group.title}
          </h3>
          {isPlacingDot && (
            <p className="text-[9px] text-muted-foreground font-medium">
              Click to vote
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-0.5">
        {/* Insight Counter */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`
            flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg
            ${insightCount > 0 ? "text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground"}
          `}
          style={{
            backgroundColor: insightCount > 0 ? group.color : undefined,
          }}
          title={`${insightCount} insight${insightCount !== 1 ? "s" : ""}`}
        >
          <Sparkles size={10} />
          {insightCount}
        </motion.div>

        {/* Vote Counter - Show during dot voting */}
        {(groupDotsCount > 0 || isPlacingDot) && (
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`
              flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg
              ${groupDotsCount > 0 ? "bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-sm" : "bg-muted text-muted-foreground"}
            `}
            title={myDotsCount > 0 ? `You voted ${myDotsCount} time(s)` : `${groupDotsCount} vote${groupDotsCount !== 1 ? "s" : ""}`}
          >
            <Circle size={10} fill="currentColor" className={myDotsCount > 0 ? "animate-pulse" : ""} />
            {groupDotsCount}
            {myDotsCount > 0 && (
              <span className="text-[9px] opacity-75">({myDotsCount})</span>
            )}
          </motion.div>
        )}

        {/* AI Assistant */}
        {hasInsights && !isPresentationMode && !isPlacingDot && (
          <GroupNameAssistant
            group={group}
            insights={insights}
            currentTitle={group.title}
            onTitleUpdate={(newTitle: string) => {
              onTitleUpdate?.(group.id, newTitle);
            }}
            projectContext={projectContext}
          />
        )}

        {/* Comments - with unread indicator that hides when chat is open */}
        {!isPresentationMode && !isPlacingDot && (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              const rect = (e.currentTarget as HTMLElement)
                .closest("[data-group-id]")!
                .getBoundingClientRect();

              if (onOpenComments) {
                onOpenComments(
                  group.id,
                  { x: rect.right, y: rect.top },
                  group.title
                );
              }
            }}
            className={`
              p-1.5 rounded-lg transition-all relative
              ${amIMentioned ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" : "hover:bg-accent text-muted-foreground hover:text-primary"}
            `}
            title="Comments"
          >
            <MessageCircle size={14} />
            {/* Only show unread count if NOT chat open */}
            {!isChatOpen && unreadCount !== undefined && unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
            {amIMentioned && !isChatOpen && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-white" />
            )}
          </motion.button>
        )}

        {/* Delete */}
        {!isPresentationMode && !isPlacingDot && (
          <motion.button
            whileHover={{ scale: 1.1, backgroundColor: "rgba(239, 68, 68, 0.1)" }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(group.id);
            }}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 transition-all"
            title="Delete group"
          >
            <Trash2 size={14} />
          </motion.button>
        )}
      </div>
    </div>
  );
}
