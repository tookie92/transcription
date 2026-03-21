"use client";

import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { 
  GripVertical, 
  Palette, 
  Trash2, 
  Copy, 
  Edit3, 
  Check, 
  X,
  MoreHorizontal
} from "lucide-react";
import { AffinityGroup as AffinityGroupType, Insight } from "@/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const CLUSTER_COLORS = [
  { name: "Red", value: "#ef4444" },
  { name: "Orange", value: "#f97316" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Green", value: "#22c55e" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Indigo", value: "#6366f1" },
  { name: "Purple", value: "#a855f7" },
  { name: "Pink", value: "#ec4899" },
  { name: "Gray", value: "#6b7280" },
];

interface ClusterCardProps {
  group: AffinityGroupType;
  insights: Insight[];
  isSelected: boolean;
  isDragOver: boolean;
  scale: number;
  onMove: (groupId: string, position: { x: number; y: number }) => void;
  onDelete?: (groupId: string) => void;
  onTitleUpdate?: (groupId: string, title: string) => void;
  onColorUpdate?: (groupId: string, color: string) => void;
  onDuplicate?: (groupId: string) => void;
  onSelect: (groupId: string, e: React.MouseEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onInsightDragStart?: (insightId: string, groupId: string) => void;
  onInsightDrop?: (insightId: string, targetGroupId: string) => void;
  onRemoveInsight?: (insightId: string, groupId: string) => void;
  onResize?: (groupId: string, size: { width: number; height: number }) => void;
}

export function ClusterCard({
  group,
  insights,
  isSelected,
  isDragOver,
  scale,
  onMove,
  onDelete,
  onTitleUpdate,
  onColorUpdate,
  onDuplicate,
  onSelect,
  onDragOver,
  onDragLeave,
  onDrop,
  onInsightDragStart,
  onInsightDrop,
  onRemoveInsight,
  onResize,
}: ClusterCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(group.title);
  const [isResizing, setIsResizing] = useState(false);
  const [localSize, setLocalSize] = useState({ width: 460, height: 320 });
  const inputRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const resizeStartRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);

  const groupInsights = useMemo(
    () => insights.filter((i) => group.insightIds.includes(i.id)),
    [insights, group.insightIds]
  );

  const colorInfo = useMemo(
    () => CLUSTER_COLORS.find((c) => c.value === group.color) || CLUSTER_COLORS[5],
    [group.color]
  );

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleTitleSave = useCallback(() => {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== group.title) {
      onTitleUpdate?.(group.id, trimmed);
    } else {
      setEditTitle(group.title);
    }
    setIsEditing(false);
  }, [editTitle, group.id, group.title, onTitleUpdate]);

  const handleTitleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleTitleSave();
      } else if (e.key === "Escape") {
        setEditTitle(group.title);
        setIsEditing(false);
      }
    },
    [group.title, handleTitleSave]
  );

  const handleDoubleClickTitle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setEditTitle(group.title);
    setIsEditing(true);
  }, [group.title]);

  const handleColorSelect = useCallback(
    (color: string) => {
      onColorUpdate?.(group.id, color);
    },
    [group.id, onColorUpdate]
  );

  const handleResizeStart = useCallback(
    (e: React.MouseEvent, direction: string) => {
      e.stopPropagation();
      e.preventDefault();
      setIsResizing(true);
      resizeStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        width: localSize.width,
        height: localSize.height,
      };

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!resizeStartRef.current) return;

        const dx = (moveEvent.clientX - resizeStartRef.current.x) / scale;
        const dy = (moveEvent.clientY - resizeStartRef.current.y) / scale;

        let newWidth = resizeStartRef.current.width;
        let newHeight = resizeStartRef.current.height;

        if (direction.includes("e")) newWidth = Math.max(300, resizeStartRef.current.width + dx);
        if (direction.includes("s")) newHeight = Math.max(200, resizeStartRef.current.height + dy);
        if (direction.includes("w")) newWidth = Math.max(300, resizeStartRef.current.width - dx);
        if (direction.includes("n")) newHeight = Math.max(200, resizeStartRef.current.height - dy);

        setLocalSize({ width: newWidth, height: newHeight });
      };

      const handleMouseUp = () => {
        setIsResizing(false);
        resizeStartRef.current = null;
        onResize?.(group.id, localSize);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [localSize, scale, group.id, onResize]
  );

  const handleInsightDragStart = useCallback(
    (e: React.DragEvent, insightId: string) => {
      e.stopPropagation();
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", insightId);
      e.dataTransfer.setData("application/group-id", group.id);
    },
    [group.id]
  );

  const handleInsightDrop = useCallback(
    (e: React.DragEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const insightId = e.dataTransfer.getData("text/plain");
      const sourceGroupId = e.dataTransfer.getData("application/group-id");
      if (insightId && sourceGroupId !== group.id) {
        onInsightDrop?.(insightId, group.id);
      }
    },
    [group.id, onInsightDrop]
  );

  const handleRemoveInsight = useCallback(
    (insightId: string) => {
      onRemoveInsight?.(insightId, group.id);
    },
    [group.id, onRemoveInsight]
  );

  const getInsightStyle = (type: Insight["type"]) => {
    const styles: Record<string, { bg: string; border: string; text: string }> = {
      "pain-point": { bg: "#fef2f2", border: "#fecaca", text: "#991b1b" },
      quote: { bg: "#eff6ff", border: "#bfdbfe", text: "#1e40af" },
      insight: { bg: "#faf5ff", border: "#e9d5ff", text: "#6b21a8" },
      question: { bg: "#fffbeb", border: "#fde68a", text: "#92400e" },
      "follow-up": { bg: "#f0fdf4", border: "#bbf7d0", text: "#166534" },
      custom: { bg: "#f9fafb", border: "#e5e7eb", text: "#374151" },
    };
    return styles[type] || styles.custom;
  };

  const getInsightEmoji = (type: Insight["type"]) => {
    const emojis: Record<string, string> = {
      "pain-point": "😫",
      quote: "💬",
      insight: "💡",
      question: "🤔",
      "follow-up": "📋",
      custom: "📝",
    };
    return emojis[type] || "📝";
  };

  return (
    <div
      ref={cardRef}
      data-cluster-id={group.id}
      className={cn(
        "absolute bg-card border-2 rounded-xl shadow-lg transition-all duration-200",
        isSelected && "ring-2 ring-primary ring-offset-2",
        isDragOver && "border-primary bg-primary/5",
        isResizing && "select-none"
      )}
      style={{
        borderColor: isSelected || isDragOver ? group.color : `${group.color}40`,
        width: localSize.width,
        minHeight: localSize.height,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(group.id, e);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver(e);
      }}
      onDragLeave={onDragLeave}
      onDrop={handleInsightDrop}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2 border-b"
        style={{ borderColor: `${group.color}40`, backgroundColor: `${group.color}10` }}
      >
        {/* Drag Handle */}
        <div className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
          <GripVertical className="w-4 h-4" />
        </div>

        {/* Title */}
        {isEditing ? (
          <div className="flex-1 flex items-center gap-1">
            <Input
              ref={inputRef}
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={handleTitleKeyDown}
              onClick={(e) => e.stopPropagation()}
              className="h-7 text-sm font-semibold bg-background"
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleTitleSave();
              }}
              className="p-1 hover:bg-background rounded"
            >
              <Check className="w-4 h-4 text-green-600" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditTitle(group.title);
                setIsEditing(false);
              }}
              className="p-1 hover:bg-background rounded"
            >
              <X className="w-4 h-4 text-red-600" />
            </button>
          </div>
        ) : (
          <h3
            className="flex-1 text-sm font-semibold text-foreground truncate cursor-text"
            onDoubleClick={handleDoubleClickTitle}
          >
            {group.title}
          </h3>
        )}

        {/* Color Indicator */}
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: group.color }}
        />

        {/* Actions Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className="p-1 hover:bg-background rounded text-muted-foreground hover:text-foreground"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                setEditTitle(group.title);
                setIsEditing(true);
              }}
            >
              <Edit3 className="w-4 h-4 mr-2" />
              Rename
            </DropdownMenuItem>

            <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
              <Palette className="w-4 h-4 mr-2" />
              <span>Color</span>
              <div className="ml-auto flex gap-1 ml-4">
                {CLUSTER_COLORS.slice(0, 5).map((c) => (
                  <button
                    key={c.value}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleColorSelect(c.value);
                    }}
                    className={cn(
                      "w-4 h-4 rounded-full border",
                      group.color === c.value && "ring-2 ring-offset-1 ring-foreground"
                    )}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  />
                ))}
              </div>
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate?.(group.id);
              }}
            >
              <Copy className="w-4 h-4 mr-2" />
              Duplicate
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Delete "${group.title}"?`)) {
                  onDelete?.(group.id);
                }
              }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Insights List */}
      <div className="p-2 space-y-1.5 overflow-y-auto" style={{ maxHeight: localSize.height - 60 }}>
        {groupInsights.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <p>Drop insights here</p>
            <p className="text-xs mt-1">Drag from the sidebar</p>
          </div>
        ) : (
          groupInsights.map((insight) => {
            const style = getInsightStyle(insight.type);
            return (
              <div
                key={insight.id}
                draggable
                onDragStart={(e) => handleInsightDragStart(e, insight.id)}
                className="group p-2 rounded-lg border cursor-grab active:cursor-grabbing transition-all hover:shadow-md"
                style={{
                  backgroundColor: style.bg,
                  borderColor: style.border,
                }}
              >
                <div className="flex items-start gap-2">
                  <span className="text-sm">{getInsightEmoji(insight.type)}</span>
                  <p className="text-sm flex-1" style={{ color: style.text }}>
                    {insight.text}
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveInsight(insight.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/50 rounded transition-opacity"
                  >
                    <X className="w-3 h-3" style={{ color: style.text }} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Resize Handles */}
      <div
        className="absolute -bottom-1 -right-1 w-4 h-4 cursor-se-resize opacity-0 hover:opacity-100 transition-opacity"
        onMouseDown={(e) => handleResizeStart(e, "se")}
      >
        <svg viewBox="0 0 16 16" className="w-full h-full text-muted-foreground">
          <path d="M14 14L8 14M14 14L14 8M14 14L6 6" stroke="currentColor" strokeWidth="2" fill="none" />
        </svg>
      </div>

      {/* Bottom resize handle */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 cursor-s-resize opacity-0 hover:opacity-100 transition-opacity"
        onMouseDown={(e) => handleResizeStart(e, "s")}
      >
        <div className="w-full h-full bg-muted-foreground/30 rounded-full" />
      </div>

      {/* Right resize handle */}
      <div
        className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-16 cursor-e-resize opacity-0 hover:opacity-100 transition-opacity"
        onMouseDown={(e) => handleResizeStart(e, "e")}
      >
        <div className="w-full h-full bg-muted-foreground/30 rounded-full" />
      </div>
    </div>
  );
}
