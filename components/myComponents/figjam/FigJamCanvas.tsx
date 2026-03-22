/**
 * FigJam-style Affinity Canvas Component
 * 
 * A complete FigJam-inspired canvas for affinity mapping with:
 * - Infinite pan/zoom canvas
 * - Sticky notes for insights
 * - Section frames for clusters
 * - Dot voting
 * - Multi-user presence cursors
 * - Tool selection (select, sticky, draw, etc.)
 */

"use client";

import React, { useState, useCallback, useRef, useEffect, useMemo, memo } from "react";
import { cn } from "@/lib/utils";
import { AffinityGroup as AffinityGroupType, Insight } from "@/types";
import { toast } from "sonner";

import { StickyNote, StickyColor, STICKY_COLORS } from "./StickyNote";
import { Section } from "./Section";
import { SideToolbar, ToolType } from "./SideToolbar";
import { BottomBar } from "./BottomBar";
import { MiniMap } from "./MiniMap";

import { useInfiniteCanvas } from "@/hooks/useInfiniteCanvas";
import {
  getAbsolutePosition,
  getClusterAtPosition,
  computeClusterSize,
  InsightWithPosition,
} from "@/lib/canvas-utils";
import Image from "next/image";

/**
 * Cursor colors for presence
 */
const CURSOR_COLORS = [
  "#FF7262", "#1ABCFE", "#0ACF83", "#F24E1E", "#9747FF",
  "#FF9500", "#FF6EB0", "#4499FF"
];

function getUserColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
}

/**
 * Mock presence user for demo
 */
interface PresenceUser {
  id: string;
  name: string;
  initials: string;
  color: string;
  cursor: { x: number; y: number };
  lastSeen: number;
}

interface FigJamCanvasProps {
  /** All clusters/groups */
  groups: AffinityGroupType[];
  /** All insights */
  insights: Insight[];
  /** Stored sticky positions */
  stickyPositions?: Record<string, { x: number; y: number }>;
  /** Callback to update sticky positions */
  onStickyPositionChange?: (insightId: string, position: { x: number; y: number }) => void;
  /** Callback to delete insight */
  onInsightDelete?: (insightId: string) => void;
  /** Project ID */
  projectId: string;
  /** Project name */
  projectName?: string;
  /** Current user ID */
  currentUserId?: string;
  /** Current user name */
  currentUserName?: string;
  /** Other users for presence */
  otherUsers?: PresenceUser[];
  /** Callback when group position changes */
  onGroupMove: (groupId: string, position: { x: number; y: number }) => void;
  /** Callback when group is created */
  onGroupCreate: (position: { x: number; y: number }) => void;
  /** Callback when insight is dropped on group */
  onInsightDrop: (insightId: string, groupId: string) => void;
  /** Callback when insight is removed from group */
  onInsightRemove?: (insightId: string, groupId: string) => void;
  /** Callback when group is deleted */
  onGroupDelete?: (groupId: string) => void;
  /** Callback when group title is updated */
  onGroupTitleUpdate?: (groupId: string, title: string) => void;
  /** Callback when group is selected */
  onGroupSelect?: (groupId: string | null) => void;
  /** Callback when comments panel is opened */
  onOpenComments?: (groupId: string, rect: DOMRect) => void;
  /** Callback when sticky note is created */
  onStickyCreate?: (position: { x: number; y: number }, color: StickyColor) => void;
  /** Active voting mode */
  isVotingMode?: boolean;
  /** Current user votes */
  userVotes?: string[];
  /** Callback when vote is cast */
  onVote?: (insightId: string) => void;
}

/**
 * Main FigJam-style canvas component
 */
export const FigJamCanvas = memo(function FigJamCanvas({
  groups,
  insights,
  stickyPositions = {},
  onStickyPositionChange,
  onInsightDelete,
  projectId,
  projectName = "Untitled",
  currentUserId,
  currentUserName,
  otherUsers = [],
  onGroupMove,
  onGroupCreate,
  onInsightDrop,
  onInsightRemove,
  onGroupDelete,
  onGroupTitleUpdate,
  onGroupSelect,
  onOpenComments,
  onStickyCreate,
  isVotingMode = false,
  userVotes = [],
  onVote,
}: FigJamCanvasProps) {
  // Canvas container ref
  const containerRef = useRef<HTMLDivElement>(null);

  // Canvas state
  const [selectedInsightId, setSelectedInsightId] = useState<string | null>(null);
  const [selectedInsightIds, setSelectedInsightIds] = useState<Set<string>>(new Set());
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [draggingInsightId, setDraggingInsightId] = useState<string | null>(null);
  const [hoveringGroupId, setHoveringGroupId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<ToolType>("select");
  const [selectedColor, setSelectedColor] = useState<StickyColor>(STICKY_COLORS[0].value);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [stickyColors, setStickyColors] = useState<Record<string, StickyColor>>({});

  // Use the infinite canvas hook
  const canvas = useInfiniteCanvas();

  /**
   * Map insights to their group positions
   * Uses RELATIVE positioning: clustered stickies are positioned relative to cluster
   * Absolute position is computed at render time using getAbsolutePosition()
   */
  const insightsWithPositions = useMemo((): InsightWithPosition[] => {
    return insights.map((insight, index) => {
      const position = getAbsolutePosition(insight, stickyPositions, groups, index);
      const group = groups.find((g) => g.insightIds.includes(insight.id));

      return {
        ...insight,
        position,
        groupId: group?.id || null,
      };
    });
  }, [insights, groups, stickyPositions]);

   /**
   * Handle insight click
   */
  const handleInsightClick = useCallback(
    (insight: Insight, e: React.MouseEvent) => {
      if (e.ctrlKey || e.metaKey) {
        // Multi-select with Ctrl/Cmd click
        setSelectedInsightIds(prev => {
          const newSet = new Set(prev);
          if (newSet.has(insight.id)) {
            newSet.delete(insight.id);
          } else {
            newSet.add(insight.id);
          }
          return newSet;
        });
        setSelectedInsightId(null);
      } else {
        // Single select
        setSelectedInsightId(insight.id);
        setSelectedInsightIds(new Set());
      }
      setSelectedGroupId(null);
    },
    []
  );

  /**
   * Handle insight double-click (edit)
   */
  const handleInsightDoubleClick = useCallback(
    (insight: Insight) => {
      toast.info(`Edit: ${insight.text}`);
    },
    []
  );

  /**
   * Handle insight position change
   */
  const handleInsightPositionChange = useCallback(
    (id: string, position: { x: number; y: number }) => {
      onStickyPositionChange?.(id, position);
    },
    [onStickyPositionChange]
  );

  /**
   * Handle group click
   */
  const handleGroupClick = useCallback(
    (group: AffinityGroupType, e: React.MouseEvent) => {
      setSelectedGroupId(group.id);
      setSelectedInsightId(null);
      onGroupSelect?.(group.id);
    },
    [onGroupSelect]
  );

  /**
   * Handle group position change
   */
  const handleGroupPositionChange = useCallback(
    (id: string, position: { x: number; y: number }) => {
      onGroupMove(id, position);
    },
    [onGroupMove]
  );

  /**
   * Handle group title change
   */
  const handleGroupTitleChange = useCallback(
    (id: string, title: string) => {
      onGroupTitleUpdate?.(id, title);
      toast.success(`Renamed to "${title}"`);
    },
    [onGroupTitleUpdate]
  );

  /**
   * Handle click on canvas (deselect or create)
   */
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      // Check if click is on canvas (either directly or on a descendant)
      const target = e.target as HTMLElement;
      const isOnCanvas = target.closest(".canvas-area") !== null;
      
      if (!isOnCanvas) {
        return;
      }

      // Clear selections
      setSelectedInsightId(null);
      setSelectedGroupId(null);

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = (e.clientX - rect.left - canvas.x) / canvas.scale;
      const y = (e.clientY - rect.top - canvas.y) / canvas.scale;

      // If sticky tool is active, create new sticky
      if (activeTool === "sticky") {
        onStickyCreate?.({ x, y }, selectedColor);
        toast.success("Sticky note created");
      }

      // If cluster tool is active, create new cluster
      if (activeTool === "cluster") {
        onGroupCreate?.({ x, y });
        toast.success("Cluster created");
        setActiveTool("select");
      }
    },
    [activeTool, canvas, selectedColor, onStickyCreate, onGroupCreate]
  );

  /**
   * Handle space key for pan mode
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !isSpacePressed) {
        setIsSpacePressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsSpacePressed(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, [isSpacePressed]);

  /**
   * Handle vote
   */
  const handleVote = useCallback(
    (insightId: string) => {
      onVote?.(insightId);
    },
    [onVote]
  );

  /**
   * Cursor style based on tool/mode
   */
  const cursorStyle = useMemo(() => {
    if (isSpacePressed) return "grab";
    if (canvas.isPanning) return "grabbing";
    if (activeTool === "hand") return "grab";
    if (activeTool === "sticky") return "crosshair";
    if (activeTool === "cluster") return "crosshair";
    return "default";
  }, [isSpacePressed, canvas.isPanning, activeTool]);

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {/* Top bar */}
      <div className="h-[52px] shrink-0 bg-card border-b border-border flex items-center px-3 gap-2 shadow-sm dark:shadow-none">
        {/* Logo */}
        <div className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 mr-2">
          <Image src="/logomark.svg" width={22} height={22} alt="Skripta Logo" />
          <span className="text-sm font-semibold text-foreground dark:text-neutral-100">Skripta</span>
        </div>

        {/* File name */}
        <div className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-accent cursor-pointer">
          <span className="text-sm font-medium text-foreground dark:text-neutral-100">{projectName} ✦</span>
          <svg width="12" height="12" fill="currentColor" viewBox="0 0 20 20" className="text-muted-foreground">
            <path d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"/>
          </svg>
        </div>

        <div className="flex-1" />

        {/* Collaborator avatars */}
        <div className="flex items-center -space-x-2 mr-2">
          {otherUsers.slice(0, 4).map((user, i) => (
            <div
              key={user.id}
              className="w-7 h-7 rounded-full border-2 border-background flex items-center justify-center text-[10px] font-bold text-white z-[30]"
              style={{ backgroundColor: user.color, zIndex: 30 - i }}
              title={user.name}
            >
              {user.initials}
            </div>
          ))}
          {otherUsers.length > 4 && (
            <div className="w-7 h-7 rounded-full bg-[#9747FF] border-2 border-background flex items-center justify-center text-[10px] font-bold text-white">
                +{otherUsers.length - 4}
            </div>
          )}
        </div>

        {/* Share button */}
        <button className="px-4 py-1.5 bg-[#9747FF] hover:bg-[#8133ee] text-white text-sm font-semibold rounded-lg transition-colors">
          Share
        </button>
      </div>

      {/* Canvas area */}
      <div className="flex-1 relative overflow-hidden">
        {/* Main canvas */}
        <div
          ref={containerRef}
          className="canvas-area absolute inset-0"
          onClick={handleCanvasClick}
          {...canvas.containerProps}
          style={{
            ...canvas.containerProps.style,
            cursor: cursorStyle,
            zIndex: 1,
          }}
        >
          {/* Transformed canvas content */}
          <div
            className="absolute inset-0"
            style={{
              transform: `translate(${canvas.x}px, ${canvas.y}px) scale(${canvas.scale})`,
              transformOrigin: "0 0",
            }}
          >
            {/* Dot grid background */}
            <div
              className="absolute inset-0 pointer-events-none dark:opacity-20"
              style={{
                backgroundImage: "radial-gradient(circle, #c8c8c0 1px, transparent 1px)",
                backgroundSize: "24px 24px",
              }}
            />

            {/* Sections/Clusters */}
            {groups.map((group) => {
              const insightCount = group.insightIds.length;
              const groupInsights = insights.filter(i => group.insightIds.includes(i.id));
              
              const clusterSize = computeClusterSize(insights, group.id, groups);
              
              return (
                <Section
                  key={group.id}
                  group={group}
                  insightCount={insightCount}
                  insights={groupInsights}
                  scale={canvas.scale}
                  isSelected={selectedGroupId === group.id}
                  isDropTarget={hoveringGroupId === group.id}
                  onClick={handleGroupClick}
                  onPositionChange={onGroupMove}
                  onTitleChange={handleGroupTitleChange}
                  onSizeChange={(id, size) => console.log("Size change:", id, size)}
                  onLockChange={(id, locked) => console.log("Lock change:", id, locked)}
                  onOpacityChange={(id, opacity) => console.log("Opacity change:", id, opacity)}
                  onAutoFit={(id) => console.log("Auto-fit:", id)}
                  onDelete={(id) => {
                    if (confirm("Delete this cluster?")) {
                      onGroupDelete?.(id);
                    }
                  }}
                  onOpenComments={onOpenComments}
                  autoSize={clusterSize}
                  projectContext={projectName}
                />
              );
            })}

            {/* Sticky Notes */}
            {insightsWithPositions.map((insight) => (
              <StickyNote
                key={insight.id}
                insight={insight}
                position={insight.position}
                scale={canvas.scale}
                isSelected={selectedInsightId === insight.id || selectedInsightIds.has(insight.id)}
                isDragging={draggingInsightId === insight.id}
                author={
                  currentUserId
                    ? {
                        name: currentUserName || "You",
                        color: getUserColor(currentUserId),
                        initials: (currentUserName || "Y").charAt(0).toUpperCase(),
                      }
                    : undefined
                }
                votes={isVotingMode ? (userVotes.includes(insight.id) ? 1 : 0) : 0}
                color={stickyColors[insight.id] || selectedColor}
                onClick={handleInsightClick}
                onDoubleClick={handleInsightDoubleClick}
                onDragStart={() => setDraggingInsightId(insight.id)}
                onDragEnd={(position) => {
                  setDraggingInsightId(null);
                  
                  const targetGroup = getClusterAtPosition(position, groups);
                  
                  if (targetGroup) {
                    const isInCluster = targetGroup.insightIds.includes(insight.id);
                    if (!isInCluster) {
                      onInsightDrop?.(insight.id, targetGroup.id);
                      toast.success(`Added to "${targetGroup.title}"`);
                    }
                  } else {
                    const currentCluster = groups.find(g => g.insightIds.includes(insight.id));
                    if (currentCluster) {
                      onInsightRemove?.(insight.id, currentCluster.id);
                    }
                  }
                }}
                onPositionChange={handleInsightPositionChange}
                onColorChange={(id, color) => {
                  setStickyColors(prev => ({ ...prev, [id]: color }));
                }}
                onDelete={(id) => {
                  if (insight.source === "manual" && confirm("Delete this note?")) {
                    onInsightDelete?.(id);
                    toast.success("Note deleted");
                    setSelectedInsightId(null);
                  } else if (insight.source !== "manual") {
                    toast.error("Only manual notes can be deleted");
                  }
                }}
                onVote={() => handleVote(insight.id)}
              />
            ))}

            {/* Other users' cursors */}
            {otherUsers.map((user) => (
              <div
                key={user.id}
                className="absolute pointer-events-none z-50"
                style={{
                  left: user.cursor.x,
                  top: user.cursor.y,
                }}
              >
                {/* Cursor icon */}
                <svg width="16" height="20" viewBox="0 0 16 20">
                  <path d="M0 0l16 12-7 2-4 8L0 0z" fill={user.color} />
                </svg>
                {/* Name label */}
                <div
                  className="ml-4 -mt-1 bg-card text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap shadow-sm border border-border"
                  style={{ color: user.color }}
                >
                  {user.name}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Side toolbar */}
        <SideToolbar
          activeTool={activeTool}
          onToolChange={setActiveTool}
        />

        {/* Bottom bar with zoom and colors */}
        <BottomBar
          scale={canvas.scale}
          onZoomIn={canvas.zoomIn}
          onZoomOut={canvas.zoomOut}
          onFitToScreen={() => {
            if (groups.length > 0) {
              const bounds = {
                minX: Math.min(...groups.map((g) => g.position.x)) - 100,
                minY: Math.min(...groups.map((g) => g.position.y)) - 100,
                maxX: Math.max(...groups.map((g) => g.position.x + 500)) + 100,
                maxY: Math.max(...groups.map((g) => g.position.y + 400)) + 100,
              };
              canvas.zoomToFit(
                bounds,
                containerRef.current?.clientWidth ?? 800,
                containerRef.current?.clientHeight ?? 600
              );
            }
          }}
        />

        {/* Mini map */}
        <MiniMap
          groups={groups}
          viewportPosition={{ x: canvas.x, y: canvas.y }}
          scale={canvas.scale}
          viewportSize={{
            width: containerRef.current?.clientWidth ?? 800,
            height: containerRef.current?.clientHeight ?? 600,
          }}
          onNavigate={(x, y) => {
            const vp = containerRef.current;
            if (vp) {
              canvas.setPosition({
                x: vp.clientWidth / 2 - x * canvas.scale,
                y: vp.clientHeight / 2 - y * canvas.scale,
              });
            }
          }}
        />

        {/* Selection toolbar (when item selected) */}
        {(selectedInsightId || selectedGroupId || selectedInsightIds.size > 0) && (
          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-white rounded-lg shadow-lg border border-[#e8e8e8] p-2 flex items-center gap-2 z-30">
            {/* Create Cluster button - shown when multiple insights selected */}
            {selectedInsightIds.size >= 2 && (
              <button
                onClick={() => {
                  const selectedIds = Array.from(selectedInsightIds);
                  const firstInsight = insights.find(i => i.id === selectedIds[0]);
                  if (firstInsight) {
                    const pos = insightsWithPositions.find(i => i.id === selectedIds[0])?.position;
                    if (pos) {
                      onGroupCreate?.({ x: pos.x - 50, y: pos.y - 50 });
                      toast.success(`Created cluster with ${selectedIds.length} notes`);
                      setSelectedInsightIds(new Set());
                      setActiveTool("select");
                    }
                  }
                }}
                className="px-3 py-1.5 text-sm bg-[#9747FF] text-white hover:bg-[#8133ee] rounded flex items-center gap-1"
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <rect x="3" y="3" width="18" height="18" rx="3" strokeDasharray="4 2" />
                </svg>
                Create Cluster ({selectedInsightIds.size})
              </button>
            )}
            <button
              onClick={() => {
                if (selectedInsightId) {
                  const insight = insights.find((i) => i.id === selectedInsightId);
                  if (insight) {
                    navigator.clipboard.writeText(insight.text);
                    toast.success("Copied to clipboard");
                  }
                }
              }}
              className="px-3 py-1.5 text-sm hover:bg-[#f5f5f5] rounded"
            >
              Copy
            </button>
            {isVotingMode && selectedInsightId && (
              <button
                onClick={() => handleVote(selectedInsightId)}
                className="px-3 py-1.5 text-sm hover:bg-[#f5f5f5] rounded flex items-center gap-1"
              >
                <span>👍</span> Vote
              </button>
            )}
            <button
              onClick={() => {
                if (selectedInsightId && confirm("Delete this insight?")) {
                  setSelectedInsightId(null);
                }
              }}
              className="px-3 py-1.5 text-sm text-red-500 hover:bg-red-50 rounded"
            >
              Delete
            </button>
            <button
              onClick={() => {
                setSelectedInsightId(null);
                setSelectedInsightIds(new Set());
                setSelectedGroupId(null);
              }}
              className="px-3 py-1.5 text-sm text-[#8a8a8a] hover:bg-[#f5f5f5] rounded"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
});
