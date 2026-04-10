"use client";

import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { ActivePanel, AffinityGroup as AffinityGroupType, Insight, WorkspaceMode, DetectedTheme, ThemeAnalysis, ThemeRecommendation } from "@/types";
import { toast } from "sonner";
import { useHistory } from "@/hooks/useHistory";
import { InsightsOrganizationPanel } from "./InsightsOrganizationPanel";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { usePresence } from "@/hooks/usePresence";
import { useAuth } from "@clerk/nextjs";
import { FloatingToolbar } from "./FloatingToolbar";
import { useInfiniteCanvas } from "@/hooks/useInfiniteCanvas";
import { useDragToCreate } from "@/hooks/useDragToCreate";
import { useLassoSelection } from "@/hooks/useLassoSelection";
import { MiniMap } from "./canvas/MiniMap";
import { ZoomControls } from "./canvas/ZoomControls";
import { ClusterCard } from "./canvas/ClusterCard";
import { CreationRect, CreationHint } from "./canvas/CreationOverlay";
import { SelectionBox, SelectionToolbar } from "./canvas/SelectionOverlay";
import { MergeClustersModal } from "./canvas/MergeClustersModal";
import { KeyboardShortcuts } from "./canvas/KeyboardShortcuts";
import { CanvasSidePanels } from "./canvas/CanvasSidePanels";

const CURSOR_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#14b8a6", "#3b82f6", "#8b5cf6", "#ec4899",
];

const OFFLINE_THRESHOLD_MS = 30000;
const INACTIVE_THRESHOLD_MS = 5000;

function getUserColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
}

interface PresenceUser {
  userId: string;
  cursor: { x: number; y: number };
  selection: string[];
  user: { id: string; name: string; avatar?: string };
  lastSeen: number;
}

interface AffinityCanvasProps {
  groups: AffinityGroupType[];
  insights: Insight[];
  projectId: string;
  projectInfo?: { name: string; description?: string };
  mapId: string;
  activePanel?: ActivePanel;
  setActivePanel?: (panel: ActivePanel) => void;
  onGroupMove: (groupId: string, position: { x: number; y: number }) => void;
  onGroupCreate: (position: { x: number; y: number }) => void;
  onInsightDrop: (insightId: string, groupId: string) => void;
  onInsightRemoveFromGroup?: (insightId: string, groupId: string) => void;
  onGroupDelete?: (groupId: string) => void;
  onManualInsightCreate: (text: string, type: Insight["type"]) => void;
  onGroupTitleUpdate?: (groupId: string, title: string) => void;
  onGroupsReplace?: (groups: AffinityGroupType[]) => void;
  selectedTheme?: DetectedTheme | null;
  setSelectedTheme?: (theme: DetectedTheme) => void;
  onApplyRecommendation?: (recommendation: ThemeRecommendation) => void;
  onGroupsMerge?: (groupIds: string[], newTitle: string) => void;
  filteredRecommendations?: ThemeRecommendation[];
  themeAnalysis?: ThemeAnalysis | null;
  isThemesAnalyzing?: boolean;
  onAnalyzeThemes?: () => void;
  onClearThemes?: () => void;
}

export default function AffinityCanvas(props: AffinityCanvasProps) {
  const {
    groups, insights, projectId, projectInfo, mapId,
    activePanel: controlledActivePanel, setActivePanel: controlledSetActivePanel,
    onGroupMove, onGroupCreate, onInsightDrop,
    onInsightRemoveFromGroup, onGroupDelete, onManualInsightCreate,
    onGroupTitleUpdate, onGroupsReplace,
  } = props;

  const [internalActivePanel, setInternalActivePanel] = useState<ActivePanel>(null);
  const activePanel = controlledActivePanel ?? internalActivePanel;
  const setActivePanel = controlledSetActivePanel ?? setInternalActivePanel;

  const { userId } = useAuth();
  const currentUserId = userId ?? "anonymous";

  const updatePresence = usePresence(mapId as Id<"affinityMaps">);
  const otherUsers = useQuery(api.presence.getByMap, { mapId: mapId as Id<"affinityMaps"> });

  const history = useHistory();
  const canvas = useInfiniteCanvas();
  const canvasRef = useRef<HTMLDivElement>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const clickCountRef = useRef(0);
  const cursorPositionRef = useRef({ x: 0, y: 0 });

  const [dragOverGroup, setDragOverGroup] = useState<string | null>(null);
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>("grouping");
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [, setIsMovingWithArrows] = useState(false);
  const [optimisticPositions, setOptimisticPositions] = useState<Map<string, { x: number; y: number }>>(new Map());
  const [renderKey, setRenderKey] = useState(0);
  const [, setDraggedInsightId] = useState<string | null>(null);
  const [, setDragSourceGroupId] = useState<string | null>(null);
  const [lastSelectedGroup, setLastSelectedGroup] = useState<string | null>(null);
  const [sharedSelections, setSharedSelections] = useState<Record<string, string[]>>({});
  const [isPresentMode, setPresentMode] = useState(false);
  const [, setShowVotingHistory] = useState(false);
  const [, setShowPersonaGenerator] = useState(false);
  const [, setGroupSizes] = useState<Record<string, { width: number; height: number }>>({});
  const [isAnalyzingThemes, setIsAnalyzingThemes] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [toolMode, setToolMode] = useState<"select" | "lasso" | "create">("select");

  // Drag to create
  const dragToCreate = useDragToCreate({
    minWidth: 100,
    minHeight: 80,
    onCreate: (rect) => {
      onGroupCreate({ x: rect.x, y: rect.y });
      toast.success("Cluster created");
    },
  });

  // Lasso selection
  const lassoSelection = useLassoSelection(
    groups.map((g) => ({ id: g.id, position: g.position })),
    {
      onSelectionChange: (ids) => {
        setSelectedGroups(new Set(ids));
      },
    }
  );

  const saveCurrentState = useCallback(
    (action: string, description: string) => {
      history.pushState(groups, insights, action, description);
    },
    [groups, insights, history]
  );

  const stats = useMemo(() => {
    const totalInsights = insights.length;
    const groupedInsights = groups.reduce((sum, group) => sum + group.insightIds.length, 0);
    return {
      totalInsights,
      groupCount: groups.length,
      completion: totalInsights > 0 ? Math.round((groupedInsights / totalInsights) * 100) : 0,
    };
  }, [groups, insights]);

  useEffect(() => {
    const selections: Record<string, string[]> = {};
    otherUsers?.forEach((u) => { selections[u.userId] = u.selection || []; });
    setSharedSelections(selections);
  }, [otherUsers]);

  useEffect(() => {
    if (selectedGroups.size === 0) setLastSelectedGroup(null);
    else if (selectedGroups.size === 1) setLastSelectedGroup(Array.from(selectedGroups)[0]);
  }, [selectedGroups]);

  // Clear selection when groups change (e.g., after deletion)
  useEffect(() => {
    const groupIds = new Set(groups.map(g => g.id));
    const staleSelections = Array.from(selectedGroups).filter(id => !groupIds.has(id));
    if (staleSelections.length > 0) {
      setSelectedGroups(new Set());
      setLastSelectedGroup(null);
    }
  }, [groups]);

  // Clear selection on initial load
  useEffect(() => {
    setSelectedGroups(new Set());
    setLastSelectedGroup(null);
  }, []);

  useEffect(() => {
    setOptimisticPositions(new Map());
  }, [groups]);

  useEffect(() => {
    setRenderKey((k) => k + 1);
  }, [optimisticPositions]);

  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
    };
  }, []);

  const handleGroupResize = useCallback(
    (groupId: string, size: { width: number; height: number }) => {
      setGroupSizes((prev) => ({ ...prev, [groupId]: size }));
    },
    []
  );

  const handleGroupSelect = useCallback(
    (groupId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const isTaken = Object.entries(sharedSelections || {}).some(
        ([uId, groupIds]) => uId !== currentUserId && (groupIds as string[]).includes(groupId)
      );
      if (isTaken) return;

      if (e.shiftKey && lastSelectedGroup && lastSelectedGroup !== groupId) {
        const groupIds = groups.map((g) => g.id);
        const startIndex = groupIds.indexOf(lastSelectedGroup);
        const endIndex = groupIds.indexOf(groupId);
        if (startIndex !== -1 && endIndex !== -1) {
          const start = Math.min(startIndex, endIndex);
          const end = Math.max(startIndex, endIndex);
          const groupsToSelect = groupIds.slice(start, end + 1);
          setSelectedGroups((prev) => {
            const newSelection = new Set(prev);
            groupsToSelect.forEach((id) => newSelection.add(id));
            return newSelection;
          });
          toast.info(`Selected ${groupsToSelect.length} groups`);
          return;
        }
      }

      if (e.ctrlKey || e.metaKey) {
        setSelectedGroups((prev) => {
          const newSelection = new Set(prev);
          if (newSelection.has(groupId)) {
            newSelection.delete(groupId);
            setLastSelectedGroup(null);
          } else {
            newSelection.add(groupId);
            setLastSelectedGroup(groupId);
          }
          return newSelection;
        });
      } else {
        setSelectedGroups(new Set([groupId]));
        setLastSelectedGroup(groupId);
      }
    },
    [groups, lastSelectedGroup, sharedSelections, currentUserId]
  );

  const handleArrowKeys = useCallback(
    (direction: "up" | "down" | "left" | "right", shiftKey: boolean) => {
      if (selectedGroups.size === 0) return;
      const moveDistance = shiftKey ? 20 : 5;
      let deltaX = 0,
        deltaY = 0;
      switch (direction) {
        case "up":
          deltaY = -moveDistance;
          break;
        case "down":
          deltaY = moveDistance;
          break;
        case "left":
          deltaX = -moveDistance;
          break;
        case "right":
          deltaX = moveDistance;
          break;
      }
      setIsMovingWithArrows(true);
      setTimeout(() => setIsMovingWithArrows(false), 150);

      selectedGroups.forEach((groupId) => {
        const group = groups.find((g) => g.id === groupId);
        if (group) {
          const newPosition = { x: group.position.x + deltaX, y: group.position.y + deltaY };
          setOptimisticPositions((prev) => {
            const m = new Map(prev);
            m.set(groupId, newPosition);
            return m;
          });
          onGroupMove(groupId, newPosition);
        }
      });
    },
    [selectedGroups, groups, onGroupMove]
  );

  const handleGroupMoveOptimistic = useCallback(
    (groupId: string, newPosition: { x: number; y: number }) => {
      setOptimisticPositions((prev) => {
        const m = new Map(prev);
        m.set(groupId, newPosition);
        return m;
      });
      onGroupMove(groupId, newPosition);
    },
    [onGroupMove]
  );

  const handleUndo = useCallback(() => {
    const previousState = history.undo();
    if (previousState) {
      onGroupsReplace?.(previousState.groups);
      toast.success("Undone");
    } else {
      toast.info("Nothing to undo");
    }
  }, [history, onGroupsReplace]);

  const handleRedo = useCallback(() => {
    const nextState = history.redo();
    if (nextState) {
      onGroupsReplace?.(nextState.groups);
      toast.success("Redone");
    } else {
      toast.info("Nothing to redo");
    }
  }, [history, onGroupsReplace]);

  const handleMinimapNavigate = useCallback(
    (x: number, y: number) => {
      const viewportWidth = canvasWrapperRef.current?.clientWidth ?? 800;
      const viewportHeight = canvasWrapperRef.current?.clientHeight ?? 600;
      canvas.setPosition({
        x: viewportWidth / 2 - x * canvas.scale,
        y: viewportHeight / 2 - y * canvas.scale,
      });
    },
    [canvas]
  );

  const handleCreateGroup = useCallback(() => {
    const x = (cursorPositionRef.current.x - canvas.x) / canvas.scale;
    const y = (cursorPositionRef.current.y - canvas.y) / canvas.scale;
    onGroupCreate({ x, y });
    toast.success("Cluster created");
  }, [canvas, onGroupCreate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === "n" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleCreateGroup();
        return;
      }

      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        if (selectedGroups.size > 0) {
          const direction = e.key.replace("Arrow", "").toLowerCase() as "up" | "down" | "left" | "right";
          handleArrowKeys(direction, e.shiftKey);
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "a") {
        e.preventDefault();
        setSelectedGroups(new Set(groups.map((g) => g.id)));
        toast.info(`Selected all ${groups.length} clusters`);
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedGroups.size > 0) {
          saveCurrentState("before_delete", `Before deleting ${selectedGroups.size} clusters`);
          if (confirm(`Delete ${selectedGroups.size} selected cluster(s)?`)) {
            selectedGroups.forEach((groupId) => onGroupDelete?.(groupId));
            setSelectedGroups(new Set());
            toast.success(`Deleted ${selectedGroups.size} cluster(s)`);
          }
        }
        return;
      }

      if (e.key === "Escape") {
        if (selectedGroups.size > 0) {
          setSelectedGroups(new Set());
          toast.info("Selection cleared");
        }
        if (activePanel) {
          setActivePanel(null);
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === "+" || e.key === "=")) {
        e.preventDefault();
        canvas.zoomIn();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "-") {
        e.preventDefault();
        canvas.zoomOut();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "0") {
        e.preventDefault();
        canvas.resetView();
        return;
      }

      // Tool modes
      if (e.key === "v" && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        e.preventDefault();
        setToolMode((prev) => (prev === "lasso" ? "select" : "lasso"));
        toast.info(toolMode === "lasso" ? "Select mode" : "Lasso mode");
        return;
      }

      if (e.key === "c" && !e.ctrlKey && !e.metaKey && !e.shiftKey && selectedGroups.size === 0) {
        e.preventDefault();
        setToolMode((prev) => (prev === "create" ? "select" : "create"));
        toast.info(toolMode === "create" ? "Select mode" : "Draw to create mode");
        return;
      }

      // Merge selected (Ctrl+G)
      if ((e.ctrlKey || e.metaKey) && e.key === "g") {
        e.preventDefault();
        if (selectedGroups.size >= 2) {
          setShowMergeModal(true);
        } else {
          toast.error("Select at least 2 clusters to merge");
        }
        return;
      }

      // Show shortcuts (?)
      if (e.key === "?") {
        e.preventDefault();
        setShowShortcuts((prev) => !prev);
        return;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedGroups, groups, handleArrowKeys, handleUndo, handleRedo, handleCreateGroup, activePanel, canvas, saveCurrentState, onGroupDelete, setActivePanel, toolMode]);

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      cursorPositionRef.current = { x, y };

      // Drag to create
      if (toolMode === "create" && dragToCreate.isCreating) {
        const worldX = (x - canvas.x) / canvas.scale;
        const worldY = (y - canvas.y) / canvas.scale;
        dragToCreate.updateCreating({ x: worldX, y: worldY });
        return;
      }

      // Lasso selection
      if (toolMode === "lasso" && lassoSelection.isSelecting) {
        const worldX = (x - canvas.x) / canvas.scale;
        const worldY = (y - canvas.y) / canvas.scale;
        lassoSelection.updateSelection({ x: worldX, y: worldY });
        return;
      }

      if (updatePresence) {
        const worldX = (x - canvas.x) / canvas.scale;
        const worldY = (y - canvas.y) / canvas.scale;
        updatePresence(worldX, worldY, Array.from(selectedGroups));
      }
    },
    [canvas, selectedGroups, updatePresence, toolMode, dragToCreate, lassoSelection]
  );

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;

      // Check if clicking on canvas (not on a cluster)
      const target = e.target as HTMLElement;
      const isCanvasClick = target === canvasRef.current || target.classList.contains("canvas-background");

      if (isCanvasClick) {
        // Create mode - start drag to create
        if (toolMode === "create") {
          const rect = canvasRef.current!.getBoundingClientRect();
          const worldX = (e.clientX - rect.left - canvas.x) / canvas.scale;
          const worldY = (e.clientY - rect.top - canvas.y) / canvas.scale;
          dragToCreate.startCreating({ x: worldX, y: worldY });
          return;
        }

        // Lasso mode - start lasso selection
        if (toolMode === "lasso") {
          const rect = canvasRef.current!.getBoundingClientRect();
          const worldX = (e.clientX - rect.left - canvas.x) / canvas.scale;
          const worldY = (e.clientY - rect.top - canvas.y) / canvas.scale;
          lassoSelection.startSelection({ x: worldX, y: worldY });
          return;
        }
      }
    },
    [toolMode, canvas, dragToCreate, lassoSelection]
  );

  const handleCanvasMouseUp = useCallback(
    (e: React.MouseEvent) => {
      // End drag to create
      if (dragToCreate.isCreating) {
        dragToCreate.endCreating();
      }

      // End lasso selection
      if (lassoSelection.isSelecting) {
        lassoSelection.endSelection();
      }
    },
    [dragToCreate, lassoSelection]
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === canvasRef.current) {
        const rect = canvasRef.current!.getBoundingClientRect();
        const x = (e.clientX - rect.left - canvas.x) / canvas.scale;
        const y = (e.clientY - rect.top - canvas.y) / canvas.scale;
        onGroupCreate({ x, y });
        toast.success("Cluster created");
      }
    },
    [canvas, onGroupCreate]
  );

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (selectedGroups.size > 0 && e.target === canvasRef.current) {
        setSelectedGroups(new Set());
      }

      if (e.target === canvasRef.current) {
        clickCountRef.current++;
        if (clickCountRef.current === 1) {
          clickTimeoutRef.current = setTimeout(() => {
            clickCountRef.current = 0;
          }, 300);
        } else if (clickCountRef.current === 2) {
          if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
          const rect = canvasRef.current!.getBoundingClientRect();
          const x = (e.clientX - rect.left - canvas.x) / canvas.scale;
          const y = (e.clientY - rect.top - canvas.y) / canvas.scale;
          onGroupCreate({ x, y });
          toast.success("Cluster created");
          clickCountRef.current = 0;
        }
      } else {
        if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
        clickCountRef.current = 0;
      }
    },
    [canvas, selectedGroups, onGroupCreate]
  );

  return (
    <div className="h-full flex flex-col bg-background">
      {isPresentMode && (
        <div className="fixed top-4 right-4 bg-black/70 text-white px-3 py-1 rounded text-xs z-50">
          Present mode – press ESC to exit
        </div>
      )}

      {!isPresentMode && (
        <FloatingToolbar
          stats={stats}
          workspaceMode={workspaceMode}
          setWorkspaceMode={setWorkspaceMode}
          activePanel={activePanel}
          setActivePanel={setActivePanel}
          onEnterPresentation={() => setPresentMode(true)}
          onAnalyzeThemes={() => setIsAnalyzingThemes(true)}
          themeAnalysis={null}
          isThemesAnalyzing={isAnalyzingThemes}
          hasActiveVotingSession={false}
          isVotingPhase={false}
        />
      )}

      <div className="flex-1 flex min-h-0">
        <div data-tour="insights-panel">
          <InsightsOrganizationPanel
            groups={groups}
            insights={insights}
            projectInfo={projectInfo}
            onGroupCreate={onGroupCreate}
            onInsightDrop={onInsightDrop}
            onManualInsightCreate={onManualInsightCreate}
            onGroupTitleUpdate={onGroupTitleUpdate}
          />
        </div>

        {/* Main Canvas Area */}
        <div
          className="flex-1 relative overflow-hidden bg-background"
          data-tour="groups"
          onClick={(e: React.MouseEvent) => {
            const target = e.target as HTMLElement;
            const isGroupClick = target.closest("[data-group-id]");
            const isPanelClick = target.closest("[data-panel]");
            if (!isGroupClick && !isPanelClick && selectedGroups.size > 0) {
              setSelectedGroups(new Set());
            }
          }}
          onDragOver={(e: React.DragEvent) => {
            if (workspaceMode === "grouping") {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
            }
          }}
          onDrop={(e: React.DragEvent) => {
            if (workspaceMode === "grouping") {
              e.preventDefault();
              const insightId = e.dataTransfer.getData("text/plain");
              const sourceGroupId = e.dataTransfer.getData("application/group-id");
              if (insightId && sourceGroupId) {
                saveCurrentState("before_insight_remove", "Removing insight from cluster");
                onInsightRemoveFromGroup?.(insightId, sourceGroupId);
                toast.info("Insight removed from cluster");
              }
              setDraggedInsightId(null);
              setDragSourceGroupId(null);
            }
          }}
        >
          <div
            ref={canvasWrapperRef}
            className="absolute inset-0 z-20 overflow-hidden"
            {...canvas.containerProps}
          >
            <div
              ref={canvasRef}
              className="absolute inset-0"
              style={{
                transform: `translate(${canvas.x}px, ${canvas.y}px) scale(${canvas.scale})`,
                transformOrigin: "0 0",
                cursor: toolMode === "lasso" ? "crosshair" : toolMode === "create" ? "crosshair" : "default",
              }}
              onMouseDown={handleCanvasMouseDown}
              onMouseUp={handleCanvasMouseUp}
              onMouseMove={handleCanvasMouseMove}
              onDoubleClick={handleDoubleClick}
              onClick={handleCanvasClick}
            >
              {otherUsers
                ?.filter((u: PresenceUser) => Date.now() - u.lastSeen < OFFLINE_THRESHOLD_MS)
                .map((userData: PresenceUser) => (
                  <motion.div
                    key={userData.userId}
                    className="absolute pointer-events-none z-50"
                    style={{
                      left: userData.cursor.x,
                      top: userData.cursor.y,
                      opacity: Date.now() - userData.lastSeen > INACTIVE_THRESHOLD_MS ? 0.5 : 1,
                      transition: "opacity 0.3s ease",
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <img src="/cursor.svg" alt="cursor" className="w-6 h-6" style={{ filter: `drop-shadow(0 0 2px ${getUserColor(userData.userId)})` }} />
                      <span
                        className="text-xs text-white px-2 py-1 rounded shadow whitespace-nowrap"
                        style={{ backgroundColor: getUserColor(userData.userId) }}
                      >
                        {userData.user?.name || "User"}
                      </span>
                    </div>
                  </motion.div>
                ))}

              <div key={renderKey} style={{ width: "100%", height: "100%", position: "relative" }}>
                <div
                  className="absolute inset-0 canvas-background"
                  style={{
                    backgroundImage: `linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)`,
                    backgroundSize: "40px 40px",
                    opacity: 0.5,
                  }}
                />

                <div className="p-8">
                  {groups.map((group) => {
                    const displayPosition = optimisticPositions.get(group.id) ?? group.position;
                    return (
                      <div
                        key={group.id}
                        style={{
                          position: "absolute",
                          left: displayPosition.x,
                          top: displayPosition.y,
                        }}
                      >
                        <ClusterCard
                          group={group}
                          insights={insights}
                          scale={canvas.scale}
                          isSelected={selectedGroups.has(group.id)}
                          isDragOver={dragOverGroup === group.id}
                          onMove={(groupId, pos) => handleGroupMoveOptimistic(groupId, pos)}
                          onDelete={onGroupDelete}
                          onTitleUpdate={onGroupTitleUpdate}
                          onColorUpdate={(groupId, color) => {
                            // TODO: Add color update mutation
                            toast.info(`Color changed to ${color}`);
                          }}
                          onDuplicate={(groupId) => {
                            toast.info("Duplicate functionality coming soon");
                          }}
                          onSelect={handleGroupSelect}
                          onDragOver={(e: React.DragEvent) => {
                            if (workspaceMode === "grouping") {
                              e.preventDefault();
                              setDragOverGroup(group.id);
                            }
                          }}
                          onDragLeave={() => setDragOverGroup(null)}
                          onDrop={(e: React.DragEvent) => {
                            if (workspaceMode === "grouping") {
                              e.preventDefault();
                              const insightId = e.dataTransfer.getData("text/plain");
                              const sourceGroupId = e.dataTransfer.getData("application/group-id");
                              if (insightId) {
                                saveCurrentState("before_insight_add", `Adding insight to "${group.title}"`);
                                onInsightDrop(insightId, group.id);
                                toast.success(sourceGroupId ? `Insight moved` : "Insight added");
                              }
                              setDragOverGroup(null);
                            }
                          }}
                          onInsightDragStart={(insightId, sourceGroupId) => {
                            setDraggedInsightId(insightId);
                            setDragSourceGroupId(sourceGroupId);
                          }}
                          onInsightDrop={(insightId, targetGroupId) => {
                            saveCurrentState("before_insight_move", "Moving insight to different cluster");
                            onInsightDrop(insightId, targetGroupId);
                            toast.success("Insight moved");
                            setDraggedInsightId(null);
                            setDragSourceGroupId(null);
                          }}
                          onRemoveInsight={onInsightRemoveFromGroup}
                          onResize={handleGroupResize}
                        />
                      </div>
                    );
                  })}

                  {groups.length === 0 && (
                    <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
                      <div className="text-center bg-background/95 backdrop-blur-sm p-8 rounded-2xl border shadow-2xl pointer-events-auto">
                        <div className="text-6xl mb-4">📊</div>
                        <h3 className="text-xl font-semibold mb-2">Start Creating Clusters</h3>
                        <p className="text-muted-foreground mb-4">Double-click on the canvas to create your first cluster</p>
                        <div className="flex justify-center gap-4 text-sm mb-6">
                          <div className="flex items-center gap-2">
                            <kbd className="px-2 py-1 bg-muted rounded border text-xs">Double-click</kbd>
                            <span>Create cluster</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <kbd className="px-2 py-1 bg-muted rounded border text-xs">N</kbd>
                            <span>New cluster</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    )}
                </div>
              </div>

              {/* ZoomControls - outside canvasWrapper to stay fixed */}
              <div className="absolute bottom-4 right-4 z-40">
                <ZoomControls
                  zoomIn={canvas.zoomIn}
                  zoomOut={canvas.zoomOut}
                  resetTransform={canvas.resetView}
                  centerView={() => {
                    if (groups.length > 0) {
                      const bounds = {
                        minX: Math.min(...groups.map((g) => g.position.x)),
                        minY: Math.min(...groups.map((g) => g.position.y)),
                        maxX: Math.max(...groups.map((g) => g.position.x + 500)),
                        maxY: Math.max(...groups.map((g) => g.position.y + 400)),
                      };
                      const vp = canvasWrapperRef.current;
                      if (vp) canvas.zoomToFit(bounds, vp.clientWidth, vp.clientHeight);
                    }
                  }}
                  scale={canvas.scale}
                />
              </div>
            </div>
          </div>

          <MiniMap
            groups={groups}
            position={{ x: canvas.x, y: canvas.y }}
            scale={canvas.scale}
            onNavigate={handleMinimapNavigate}
            viewportSize={{
              width: canvasWrapperRef.current?.clientWidth ?? 800,
              height: canvasWrapperRef.current?.clientHeight ?? 600,
            }}
          />

          {/* Drag to Create Overlay */}
          <CreationRect
            rect={dragToCreate.creationRect}
            scale={canvas.scale}
            position={{ x: canvas.x, y: canvas.y }}
          />
          {toolMode === "create" && !dragToCreate.isCreating && (
            <CreationHint message="Click and drag to create a cluster" shortcut="C" />
          )}

          {/* Lasso Selection Overlay */}
          <SelectionBox
            rect={lassoSelection.selectionRect}
            scale={canvas.scale}
            position={{ x: canvas.x, y: canvas.y }}
          />
          {toolMode === "lasso" && !lassoSelection.isSelecting && lassoSelection.selectedIds.size === 0 && (
            <CreationHint message="Click and drag to select clusters" shortcut="V" />
          )}

          {/* Selection Toolbar */}
          {selectedGroups.size > 0 && (
            <SelectionToolbar
              selectedCount={selectedGroups.size}
              position={cursorPositionRef.current}
              onMove={(direction) => {
                const distance = 5;
                let dx = 0,
                  dy = 0;
                switch (direction) {
                  case "up":
                    dy = -distance;
                    break;
                  case "down":
                    dy = distance;
                    break;
                  case "left":
                    dx = -distance;
                    break;
                  case "right":
                    dx = distance;
                    break;
                }
                selectedGroups.forEach((groupId) => {
                  const group = groups.find((g) => g.id === groupId);
                  if (group) {
                    onGroupMove(groupId, {
                      x: group.position.x + dx,
                      y: group.position.y + dy,
                    });
                  }
                });
              }}
              onDelete={() => {
                if (confirm(`Delete ${selectedGroups.size} cluster(s)?`)) {
                  selectedGroups.forEach((groupId) => onGroupDelete?.(groupId));
                  setSelectedGroups(new Set());
                }
              }}
              onDuplicate={() => toast.info("Duplicate coming soon")}
              onGroup={() => setShowMergeModal(true)}
            />
          )}
        </div>

        {/* Side Panels (Theme Discovery, Analytics, Persona, Export) */}
        <CanvasSidePanels
          isPresentMode={isPresentMode}
          activePanel={activePanel}
          setActivePanel={setActivePanel}
          groups={groups}
          insights={insights}
          projectId={projectId}
          projectInfo={projectInfo}
          mapId={mapId}
          userId={currentUserId}
          selectedTheme={props.selectedTheme ?? null}
          setSelectedTheme={props.setSelectedTheme ?? (() => {})}
          onApplyRecommendation={props.onApplyRecommendation ?? (() => {})}
          onGroupsMerge={props.onGroupsMerge ?? ((() => {}) as (groupIds: string[], newTitle: string) => void)}
          filteredRecommendations={props.filteredRecommendations}
          themeAnalysis={props.themeAnalysis ?? null}
          isThemesAnalyzing={props.isThemesAnalyzing ?? false}
          onAnalyzeThemes={props.onAnalyzeThemes ?? (() => {})}
          onClearThemes={props.onClearThemes ?? (() => {})}
        />
      </div>

      {/* Merge Modal */}
      <MergeClustersModal
        open={showMergeModal}
        onOpenChange={setShowMergeModal}
        clusters={groups}
        selectedIds={Array.from(selectedGroups)}
        onMerge={(merged) => {
          // Remove old clusters and create merged one
          selectedGroups.forEach((id) => onGroupDelete?.(id));
          onGroupCreate(merged.position);
          toast.success(`Merged into "${merged.title}"`);
          setSelectedGroups(new Set());
        }}
      />

      {/* Keyboard Shortcuts */}
      {showShortcuts && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={() => setShowShortcuts(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <KeyboardShortcuts />
          </div>
        </div>
      )}

      {/* Shortcut Hint */}
      <div className="fixed bottom-4 right-4 z-50">
        <kbd
          onClick={() => setShowShortcuts(true)}
          className="px-3 py-2 bg-card border border-border rounded-lg shadow-lg text-sm text-muted-foreground hover:bg-muted/50 cursor-pointer transition-colors"
        >
          Press <kbd className="px-1 bg-muted rounded">?</kbd> for shortcuts
        </kbd>
      </div>
    </div>
  );
}
