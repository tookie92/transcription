"use client";

import React from "react";
import { GripVertical, Trash2 } from "lucide-react";
import { AffinityGroup as AffinityGroupType, Insight } from "@/types";
import { GroupNameAssistant } from "../GroupNameAssistant";

interface GroupHeaderProps {
  group: AffinityGroupType;
  insights: Insight[];
  groupInsights: Insight[];
  hasInsights: boolean;
  isEditing: boolean;
  tempTitle: string;
  setTempTitle: (title: string) => void;
  onTitleSave: () => void;
  onTitleClick: (e: React.MouseEvent) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onDelete: (groupId: string) => void;
  onTitleUpdate?: (groupId: string, title: string) => void;
  onOpenComments?: (groupId: string, position: { x: number; y: number }, groupTitle: string) => void;
  onAddDot: (e: React.MouseEvent) => void;
  projectContext?: string;
  isPresentationMode: boolean;
  isFocusedInPresentation: boolean;
  isPlacingDot: boolean;
  unreadCount?: number;
  amIMentioned?: boolean;
  styles: {
    header: React.CSSProperties;
    counterBadge: React.CSSProperties;
    buttonGlossy: React.CSSProperties;
  };
}

export function GroupHeader({
  group,
  insights,
  groupInsights,
  hasInsights,
  isEditing,
  tempTitle,
  setTempTitle,
  onTitleSave,
  onTitleClick,
  onKeyDown,
  onDelete,
  onTitleUpdate,
  onOpenComments,
  onAddDot,
  projectContext,
  isPresentationMode,
  isFocusedInPresentation,
  isPlacingDot,
  unreadCount,
  amIMentioned,
  styles,
}: GroupHeaderProps) {
  return (
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
      onClick={onAddDot}
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
          onBlur={onTitleSave}
          onKeyDown={onKeyDown}
          className="flex-1 font-bold text-base bg-white/80 border-2 outline-none px-3 py-2 rounded-xl transition-all shadow-inner"
          style={{
            color: group.color,
            border: `2px solid ${group.color}40`,
            backgroundColor: "rgba(255, 255, 255, 0.9)",
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
            onTitleClick(e);
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
              onTitleUpdate?.(group.id, newTitle);
            }}
            projectContext={projectContext}
          />
        )}

        {/* BOUTON SUPPRIMER */}
        {!isPresentationMode && !isPlacingDot && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(group.id);
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
  );
}
