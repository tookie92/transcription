"use client";

// components/AffinityCanvas.tsx - REFACTORED VERSION

import { useRef, useEffect, useState, useCallback, useMemo } from "react";

import AffinityGroup from "./AffinityGroup";
import { motion } from "framer-motion";
import { ActivePanel, AffinityGroup as AffinityGroupType, Insight, WorkspaceMode, DetectedTheme } from "@/types";
import { toast } from "sonner";
import { useCanvasShortcuts } from "@/hooks/useCanvasShortcuts";
import { useHistory } from "@/hooks/useHistory";
import { Button } from "../ui/button";
import { InsightsOrganizationPanel } from "./InsightsOrganizationPanel";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ThemeVisualizationFixed } from "./ThemeVisualizationFixed";
import { ImportModal } from "./ImportModal";
import { usePresence } from "@/hooks/usePresence";
import { useAuth, useUser } from "@clerk/nextjs";
import { CommentPanel } from "./CommentPanel";
import { useFollowGroupRect } from "@/hooks/useFollowGroupRect";
import { useActivity } from "@/hooks/useActivity";
import { FloatingToolbar } from "./FloatingToolbar";
import { VotingSessionManager } from "./VotingSessionManager";
import { useSilentSorting } from "@/hooks/useSilentSorting";

// Extracted hooks
import { usePresentationMode } from "@/hooks/usePresentationMode";
import { useDotVotingCanvas } from "@/hooks/useDotVotingCanvas";
import { useThemeManagement } from "@/hooks/useThemeManagement";
import { useCanvasNavigation } from "@/hooks/useCanvasNavigation";

// Extracted components
import { PresentationOverlay } from "./canvas/PresentationOverlay";
import { CanvasSidePanels } from "./canvas/CanvasSidePanels";
import { CanvasStatusIndicators } from "./canvas/CanvasStatusIndicators";
import { ZoomControls } from "./canvas/ZoomControls";

// ==================== INTERFACES ====================

interface PresenceUser {
  userId: string;
  cursor: { x: number; y: number };
  selection: string[];
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
}

interface AffinityCanvasProps {
  groups: AffinityGroupType[];
  insights: Insight[];
  projectId: string;
  projectInfo?: {
    name: string;
    description?: string;
  };
  mapId: string;
  activePanel?: ActivePanel;
  setActivePanel?: (panel: ActivePanel) => void;
  onGroupMove: (groupId: string, position: { x: number; y: number }) => void;
  onGroupCreate: (position: { x: number; y: number }) => void;
  onInsightDrop: (insightId: string, groupId: string) => void;
  onInsightRemoveFromGroup?: (insightId: string, groupId: string) => void;
  onGroupDelete?: (groupId: string) => void;
  onManualInsightCreate: (text: string, type: Insight['type']) => void;
  onGroupTitleUpdate?: (groupId: string, title: string) => void;
  onGroupsReplace?: (groups: AffinityGroupType[]) => void;
}

export default function AffinityCanvas(props: AffinityCanvasProps) {
  const {
    groups, insights, projectId, projectInfo, mapId,
    activePanel: controlledActivePanel, setActivePanel: controlledSetActivePanel,
    onGroupMove, onGroupCreate, onInsightDrop,
    onInsightRemoveFromGroup, onGroupDelete, onManualInsightCreate,
    onGroupTitleUpdate, onGroupsReplace
  } = props;

  // Use controlled state if provided, otherwise use internal state
  const [internalActivePanel, setInternalActivePanel] = useState<ActivePanel>(null);
  const activePanel = controlledActivePanel !== undefined ? controlledActivePanel : internalActivePanel;
  const setActivePanel = controlledSetActivePanel || setInternalActivePanel;

  // ==================== HOOKS CLERK ====================
  const { userId } = useAuth();
  const { user } = useUser();
  const currentUserId = userId || "anonymous";

  // ==================== HOOKS PRESENCE ====================
  const updatePresence = usePresence(mapId as Id<"affinityMaps">);
  const otherUsers = useQuery(api.presence.getByMap, { mapId: mapId as Id<"affinityMaps"> });

  // ==================== HOOKS SILENT SORTING ====================
  const { isSilentSortingActive, currentPhase, groupTimeLeft, personalTimeLeft } = useSilentSorting(mapId as Id<"affinityMaps">);

  // ==================== HOOKS EXTERNES ====================
  const history = useHistory();
  const activity = useActivity();

  // ==================== EXTRACTED HOOKS ====================
  const projectContext = useMemo(() => {
    return projectInfo ? `PROJECT: ${projectInfo.name}\nDESCRIPTION: ${projectInfo.description || 'No description'}`.trim() : 'General user research project';
  }, [projectInfo]);

  const saveCurrentState = useCallback((action: string, description: string) => {
    history.pushState(groups, insights, action, description);
  }, [groups, insights, history]);

  const presentation = usePresentationMode(groups);
  const dotVoting = useDotVotingCanvas(mapId);
  const canvasNav = useCanvasNavigation();
  const themeManagement = useThemeManagement({
    groups, insights, projectContext,
    onGroupCreate, onGroupMove, onInsightDrop,
    onGroupDelete, onGroupTitleUpdate, saveCurrentState,
  });

  // ==================== useRef ====================
  const canvasRef = useRef<HTMLDivElement>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const clickCountRef = useRef(0);
  const zoomControlsRef = useRef<{
    zoomIn: () => void; zoomOut: () => void;
    resetTransform: () => void; centerView: () => void;
  } | null>(null);

  // ==================== useState ====================
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [dragOverGroup, setDragOverGroup] = useState<string | null>(null);
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('grouping');
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [isMovingWithArrows, setIsMovingWithArrows] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [showThemeDiscovery, setShowThemeDiscovery] = useState(false);
  const [optimisticPositions, setOptimisticPositions] = useState<Map<string, {x: number, y: number}>>(new Map());
  const [renderKey, setRenderKey] = useState(0);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [draggedInsightId, setDraggedInsightId] = useState<string | null>(null);
  const [dragSourceGroupId, setDragSourceGroupId] = useState<string | null>(null);
  const [lastSelectedGroup, setLastSelectedGroup] = useState<string | null>(null);
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [sharedSelections, setSharedSelections] = useState<Record<string, string[]>>({});
  const [isPresentMode, setPresentMode] = useState(false);
  const [showVotingHistory, setShowVotingHistory] = useState(false);
  const [showPersonaGenerator, setShowPersonaGenerator] = useState(false);
  const [showComments, setShowComments] = useState<{
    groupId: string; screenRect: DOMRect; groupTitle: string;
  } | null>(null);
  const [showActivityPanel, setShowActivityPanel] = useState(false);

  // ==================== QUERIES ====================
  const commentCounts = useQuery(api.comments.getCommentCountsByMap, {
    mapId: mapId as Id<"affinityMaps">,
  });

  // ==================== useMemo ====================
  const stats = useMemo(() => {
    const totalInsights = insights.length;
    const groupedInsights = groups.reduce((sum, group) => sum + group.insightIds.length, 0);
    return {
      totalInsights, 
      groupedInsights, 
      ungroupedInsights: totalInsights - groupedInsights,
      groupCount: groups.length,
      completion: totalInsights > 0 ? Math.round((groupedInsights / totalInsights) * 100) : 0
    };
  }, [groups, insights]);

  const presenceUsers = useMemo(
    () => otherUsers?.map((u: PresenceUser) => ({ id: u.userId, name: u.user?.name || "Unknown" })) ?? [],
    [otherUsers]
  );

  const followRect = useFollowGroupRect(showComments?.groupId ?? null, { scale: canvasNav.scale, position: canvasNav.position });

  // ==================== useCallback ====================

  const handleGroupSelect = useCallback((groupId: string, e: React.MouseEvent) => {
    if (presentation.presentationState.isActive) { e.stopPropagation(); return; }

    const isTaken = Object.entries(sharedSelections || {}).some(
      ([uId, groupIds]) => uId !== currentUserId && (groupIds as string[]).includes(groupId)
    );
    if (isTaken) return;
    e.stopPropagation();

    if (e.shiftKey && lastSelectedGroup && lastSelectedGroup !== groupId) {
      const groupIds = groups.map(g => g.id);
      const startIndex = groupIds.indexOf(lastSelectedGroup);
      const endIndex = groupIds.indexOf(groupId);
      if (startIndex !== -1 && endIndex !== -1) {
        const start = Math.min(startIndex, endIndex);
        const end = Math.max(startIndex, endIndex);
        const groupsToSelect = groupIds.slice(start, end + 1);
        setSelectedGroups(prev => {
          const newSelection = new Set(prev);
          groupsToSelect.forEach(id => newSelection.add(id));
          return newSelection;
        });
        toast.info(`Selected ${groupsToSelect.length} groups with Shift+click`);
        return;
      }
    }

    if (e.ctrlKey || e.metaKey) {
      setSelectedGroups(prev => {
        const newSelection = new Set(prev);
        if (newSelection.has(groupId)) { newSelection.delete(groupId); setLastSelectedGroup(null); }
        else { newSelection.add(groupId); setLastSelectedGroup(groupId); }
        return newSelection;
      });
    } else {
      setSelectedGroups(new Set([groupId]));
      setLastSelectedGroup(groupId);
    }
  }, [groups, lastSelectedGroup, presentation.presentationState.isActive, sharedSelections, currentUserId]);

  const handleOpenComments = useCallback((groupId: string, position: { x: number; y: number }) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;
    const rect = new DOMRect(position.x, position.y, 0, 0);
    setShowComments({ groupId, screenRect: rect, groupTitle: group.title });
  }, [groups]);

  const handleImportSuccess = (newMapId: string) => {
    console.log('✅ Map imported successfully:', newMapId);
    toast.success("Map imported successfully!");
  };

  const handleArrowKeys = useCallback((direction: 'up' | 'down' | 'left' | 'right', shiftKey: boolean) => {
    if (selectedGroups.size === 0) return;
    const moveDistance = shiftKey ? 20 : 5;
    let deltaX = 0, deltaY = 0;
    switch (direction) {
      case 'up': deltaY = -moveDistance; break;
      case 'down': deltaY = moveDistance; break;
      case 'left': deltaX = -moveDistance; break;
      case 'right': deltaX = moveDistance; break;
    }
    setIsMovingWithArrows(true);
    setTimeout(() => setIsMovingWithArrows(false), 150);

    selectedGroups.forEach(groupId => {
      const group = groups.find(g => g.id === groupId);
      if (group) {
        const newPosition = { x: group.position.x + deltaX, y: group.position.y + deltaY };
        setOptimisticPositions(prev => { const m = new Map(prev); m.set(groupId, newPosition); return m; });
        onGroupMove(groupId, newPosition);
      }
    });
  }, [selectedGroups, groups, onGroupMove]);

  const handleGroupMoveOptimistic = useCallback((groupId: string, newPosition: { x: number; y: number }) => {
    const group = groups.find(g => g.id === groupId);
    const oldPosition = group?.position;
    setOptimisticPositions(prev => { const m = new Map(prev); m.set(groupId, newPosition); return m; });
    onGroupMove(groupId, newPosition);
    if (group && oldPosition) {
      activity.logGroupMoved(mapId as Id<"affinityMaps">, groupId, group.title, oldPosition, newPosition);
    }
  }, [groups, onGroupMove, mapId, activity]);

  const handleUndo = useCallback(() => {
    const previousState = history.undo();
    if (previousState) { onGroupsReplace?.(previousState.groups); toast.success("Undone"); }
    else { toast.info("Nothing to undo"); }
  }, [history, onGroupsReplace]);

  const handleRedo = useCallback(() => {
    const nextState = history.redo();
    if (nextState) { onGroupsReplace?.(nextState.groups); toast.success("Redone"); }
    else { toast.info("Nothing to redo"); }
  }, [history, onGroupsReplace]);

  // ==================== ZOOM/PAN FUNCTIONS ====================
  const { zoomIn, zoomOut, resetTransform, centerView, setPosition, setScale, position, scale, isPanning, setIsPanning } = canvasNav;

  const isControlled = controlledSetActivePanel !== undefined;
  
  const togglePanel = useCallback((panel: ActivePanel) => {
    if (isControlled) {
      const currentPanel = controlledActivePanel;
      setActivePanel(currentPanel === panel ? null : panel);
    } else {
      setInternalActivePanel(prev => prev === panel ? null : panel);
    }
  }, [isControlled, controlledActivePanel, setActivePanel]);

  const toggleAnalyticsPanel = useCallback(() => togglePanel('analytics'), [togglePanel]);
  const togglePersonaPanel = useCallback(() => togglePanel('persona'), [togglePanel]);
  const toggleExportPanel = useCallback(() => togglePanel('export'), [togglePanel]);
  const toggleVotingHistoryPanel = useCallback(() => togglePanel('votingHistory'), [togglePanel]);
  const toggleThemeDiscoveryPanel = useCallback(() => togglePanel('themeDiscovery'), [togglePanel]);
  const toggleActivityPanel = useCallback(() => togglePanel('activity'), [togglePanel]);

  // ==================== HANDLERS SOURIS/CLAVIER ====================
  const wheelTimeout = useRef<NodeJS.Timeout | null>(null);
  const rafId = useRef<number | null>(null);
  const pendingWheel = useRef<{deltaX: number, deltaY: number, ctrlKey: boolean, clientX: number, clientY: number} | null>(null);

  const handleWheel = useCallback((e: WheelEvent) => {
    const target = e.target as HTMLElement;
    const isScrollableElement = target.classList.contains('overflow-y-auto') || target.classList.contains('overflow-auto') || target.closest('.overflow-y-auto') || target.closest('.overflow-auto');
    if (isScrollableElement) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const { ctrlKey, deltaX, deltaY, clientX, clientY } = e;
    
    if (ctrlKey) {
      const delta = -deltaY * 0.002;
      const newScale = Math.min(3, Math.max(0.3, scale * (1 + delta)));
      
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = clientX - rect.left;
        const mouseY = clientY - rect.top;
        const worldX = (mouseX - position.x) / scale;
        const worldY = (mouseY - position.y) / scale;
        
        setScale(newScale);
        setPosition({ 
          x: mouseX - worldX * newScale, 
          y: mouseY - worldY * newScale 
        });
      }
    } else {
      setPosition(prev => ({ 
        x: prev.x - deltaX, 
        y: prev.y - deltaY 
      }));
    }
  }, [scale, position, setScale, setPosition, canvasRef]);

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 2) return;
    if (e.button === 1) {
      e.preventDefault();
      setIsPanning(true);
      return;
    }
    if (e.button === 0 && isSpacePressed) { 
      setIsPanning(true); 
      return; 
    }
  };

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCursorPosition({ x, y });
    if (updatePresence) {
      const worldX = (x - position.x) / scale;
      const worldY = (y - position.y) / scale;
      updatePresence(worldX, worldY, Array.from(selectedGroups));
    }
    if (isPanning && (e.buttons & 1 || e.buttons & 4)) {
      setPosition(prev => ({ x: prev.x + e.movementX, y: prev.y + e.movementY }));
    }
  }, [isPanning, position, scale, selectedGroups, updatePresence]);

  const handleCanvasMouseUp = () => setIsPanning(false);

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      const rect = canvasRef.current!.getBoundingClientRect();
      const x = (e.clientX - rect.left - position.x) / scale;
      const y = (e.clientY - rect.top - position.y) / scale;
      onGroupCreate({ x, y });
      toast.success("Group created with double-click");
    }
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (dotVoting.isPlacingDot) return;
    if (e.target === canvasRef.current) {
      clickCountRef.current++;
      if (clickCountRef.current === 1) {
        clickTimeoutRef.current = setTimeout(() => { setSelectedGroups(new Set()); clickCountRef.current = 0; }, 300);
      } else if (clickCountRef.current === 2) {
        if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
        const rect = canvasRef.current!.getBoundingClientRect();
        const x = (e.clientX - rect.left - position.x) / scale;
        const y = (e.clientY - rect.top - position.y) / scale;
        onGroupCreate({ x, y });
        toast.success("Group created with double-click");
        clickCountRef.current = 0;
      }
    } else {
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
      clickCountRef.current = 0;
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => e.preventDefault();

  // ==================== EFFETS ====================

  useEffect(() => {
    const selections: Record<string, string[]> = {};
    otherUsers?.forEach(user => { selections[user.userId] = user.selection || []; });
    setSharedSelections(selections);
  }, [otherUsers]);

  useEffect(() => {
    if (selectedGroups.size === 0) setLastSelectedGroup(null);
    else if (selectedGroups.size === 1) setLastSelectedGroup(Array.from(selectedGroups)[0]);
  }, [selectedGroups]);

  useEffect(() => {
    const wrapper = canvasWrapperRef.current;
    const canvas = canvasRef.current;
    
    if (wrapper) {
      wrapper.addEventListener('wheel', handleWheel, { passive: false });
    }
    if (canvas) {
      canvas.addEventListener('wheel', handleWheel, { passive: false });
    }
    
    return () => {
      if (wrapper) wrapper.removeEventListener('wheel', handleWheel);
      if (canvas) canvas.removeEventListener('wheel', handleWheel);
    };
  }, [handleWheel]);

  useEffect(() => {
    const handleFocusChange = () => {
      const activeElement = document.activeElement;
      const isInput = activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement || (activeElement instanceof HTMLElement && activeElement.isContentEditable);
      setIsInputFocused(isInput);
    };
    document.addEventListener('focusin', handleFocusChange);
    document.addEventListener('focusout', handleFocusChange);
    return () => { document.removeEventListener('focusin', handleFocusChange); document.removeEventListener('focusout', handleFocusChange); };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isInputFocused) { e.preventDefault(); setIsSpacePressed(true); if (canvasRef.current) canvasRef.current.style.cursor = 'grab'; }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isInputFocused) { setIsSpacePressed(false); if (canvasRef.current) canvasRef.current.style.cursor = 'default'; }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    return () => { document.removeEventListener('keydown', handleKeyDown); document.removeEventListener('keyup', handleKeyUp); };
  }, [isInputFocused]);

  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.style.cursor = isSpacePressed && !isInputFocused
        ? (isPanning ? 'grabbing' : 'grab')
        : (isPanning ? 'grabbing' : 'default');
    }
  }, [isSpacePressed, isPanning, isInputFocused]);

  useEffect(() => { setOptimisticPositions(new Map()); }, [groups]);
  useEffect(() => { setRenderKey(prev => prev + 1); }, [optimisticPositions]);

  useEffect(() => {
    if (showThemeDiscovery && groups.length >= 2) {
      const hasNewGroups = groups.some(group => !themeManagement.themeAnalysis?.themes.some(theme => theme.groupIds.includes(group.id)));
      if (hasNewGroups || !themeManagement.themeAnalysis) {
        const timer = setTimeout(() => themeManagement.handleAnalyzeThemes(), 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [groups, showThemeDiscovery, themeManagement]);

  useEffect(() => { return () => { if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current); }; }, []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isPresentMode) { e.preventDefault(); setPresentMode(false); }
      if (e.key === 'v') { e.preventDefault(); setWorkspaceMode('voting'); }
      if (e.key === 'Escape' && workspaceMode === 'voting' && !isPresentMode) { e.preventDefault(); setWorkspaceMode('grouping'); toast.info("Voting mode disabled"); }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isPresentMode, workspaceMode]);

  useEffect(() => {
    const handleQuitPanel = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activePanel) { setActivePanel(null); return; }
      return;
    };
    document.addEventListener('keydown', handleQuitPanel);
    return () => document.removeEventListener('keydown', handleQuitPanel);
  }, [activePanel]);

  // ==================== CUSTOM HOOKS ====================
  useCanvasShortcuts({
    onNewGroup: () => {
      const x = (cursorPosition.x - position.x) / scale;
      const y = (cursorPosition.y - position.y) / scale;
      onGroupCreate({ x, y });
      toast.success("New group created (N)");
    },
    onSelectAll: () => { setSelectedGroups(new Set(groups.map(g => g.id))); toast.info(`Selected all ${groups.length} groups`); },
    onDeleteSelected: () => {
      if (selectedGroups.size > 0) {
        saveCurrentState("before_multiple_delete", `Before deleting ${selectedGroups.size} groups`);
        if (confirm(`Delete ${selectedGroups.size} selected group(s)?`)) {
          selectedGroups.forEach(groupId => onGroupDelete?.(groupId));
          setSelectedGroups(new Set());
          toast.success(`Deleted ${selectedGroups.size} group(s)`);
        }
      }
    },
    onEscape: () => { if (selectedGroups.size > 0) { setSelectedGroups(new Set()); toast.info("Selection cleared"); } },
    onArrowMove: handleArrowKeys,
    onUndo: handleUndo,
    onRedo: handleRedo,
    onToggleAnalyticsPanel: toggleAnalyticsPanel,
    onTogglePersonaPanel: togglePersonaPanel,
    onToggleThemeDiscoveryPanel: toggleThemeDiscoveryPanel,
    onToggleExportPanel: toggleExportPanel,
    onZoomIn: () => zoomControlsRef.current?.zoomIn(),
    onZoomOut: () => zoomControlsRef.current?.zoomOut(),
    onResetZoom: () => zoomControlsRef.current?.resetTransform(),
    onCenterZoom: () => zoomControlsRef.current?.centerView(),
    selectedGroups,
  });

  // ==================== RENDER ====================

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {isPresentMode && (
        <div className="fixed top-4 right-4 bg-black/70 text-white px-3 py-1 rounded text-xs">
          Present mode – press ESC to exit
        </div>
      )}

      {/* VOTING SESSION MANAGER */}
      {!isPresentMode && workspaceMode === 'voting' && (
        <VotingSessionManager
          mapId={mapId}
          projectId={projectId}
          isPlacingDot={dotVoting.isPlacingDot}
          onToggleDotPlacement={dotVoting.toggleDotPlacement}
          onSessionEnd={dotVoting.handleSessionEnd}
        />
      )}

      {/* FLOATING TOOLBAR */}
      {!isPresentMode && (
        <FloatingToolbar
          stats={stats}
          workspaceMode={workspaceMode}
          setWorkspaceMode={setWorkspaceMode}
          activePanel={activePanel}
          setActivePanel={setActivePanel}
          showThemeDiscovery={showThemeDiscovery}
          setShowThemeDiscovery={setShowThemeDiscovery}
          showExportPanel={showExportPanel}
          setShowExportPanel={setShowExportPanel}
          showImportModal={showImportModal}
          setShowImportModal={setShowImportModal}
          showActivityPanel={showActivityPanel}
          setShowActivityPanel={setShowActivityPanel}
          onEnterPresentation={presentation.enterPresentationMode}
          onAnalyzeThemes={themeManagement.handleAnalyzeThemes}
          themeAnalysis={themeManagement.themeAnalysis}
          isThemesAnalyzing={themeManagement.isThemesAnalyzing}
          activities={[]}
          showVotingHistory={showVotingHistory}
          onShowVotingHistory={setShowVotingHistory}
          showPersonaGenerator={showPersonaGenerator}
          onShowPersonaGenerator={setShowPersonaGenerator}
          hasActiveVotingSession={!!dotVoting.activeSessions?.[0]}
          isVotingPhase={dotVoting.activeSessions?.[0]?.votingPhase === "voting"}
        />
      )}

      {/* MAIN WORKSPACE */}
      <div className="flex-1 flex min-h-0">
        {/* SIDEBAR - INSIGHTS */}
        <InsightsOrganizationPanel
          groups={groups}
          insights={insights}
          projectInfo={projectInfo}
          onGroupCreate={onGroupCreate}
          onInsightDrop={onInsightDrop}
          onManualInsightCreate={onManualInsightCreate}
          onGroupTitleUpdate={onGroupTitleUpdate}
        />

        {/* CANVAS PRINCIPAL */}
        <div
          className="flex-1 relative overflow-hidden bg-linear-to-br from-gray-50 to-gray-100"
          onDragOver={(e: React.DragEvent) => {
            if (workspaceMode === 'grouping') { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }
          }}
          onDrop={(e: React.DragEvent) => {
            if (workspaceMode === 'grouping') {
              e.preventDefault();
              const insightId = e.dataTransfer.getData('text/plain');
              const sourceGroupId = e.dataTransfer.getData('application/group-id');
              if (insightId && sourceGroupId) {
                saveCurrentState("before_insight_remove", `Removing insight from group`);
                onInsightRemoveFromGroup?.(insightId, sourceGroupId);
                toast.info("Insight removed from group and returned to available insights");
              }
              setDraggedInsightId(null);
              setDragSourceGroupId(null);
            }
          }}
        >
          {/* COMMENT PANEL */}
          {!isPresentMode && showComments && (
            <CommentPanel
              mapId={mapId}
              groupId={showComments.groupId}
              groupTitle={showComments.groupTitle}
              projectId={projectId}
              presenceUsers={presenceUsers}
              screenRect={followRect ?? showComments.screenRect}
              onClose={() => setShowComments(null)}
            />
          )}

          {/* PRESENTATION OVERLAY */}
          <PresentationOverlay
            presentationState={presentation.presentationState}
            groups={groups}
            exitPresentationMode={presentation.exitPresentationMode}
            nextGroup={presentation.nextGroup}
            prevGroup={presentation.prevGroup}
            toggleOverview={presentation.toggleOverview}
          />

          {/* THEME VISUALIZATION */}
          {themeManagement.detectedThemes.length > 0 && (
            <ThemeVisualizationFixed
              groups={groups}
              themes={themeManagement.detectedThemes}
              selectedTheme={themeManagement.selectedTheme}
              canvasPosition={position}
              canvasScale={scale}
            />
          )}

          {/* CANVAS WITH ZOOM/PAN */}
          <div
            ref={canvasWrapperRef}
            className="absolute inset-0 z-20 overflow-hidden"
          >
            <div
              ref={canvasRef}
              style={{
                cursor: isSpacePressed ? 'grab' : (isPanning ? 'grabbing' : 'default'),
                width: '5000px',
                height: '5000px',
                position: 'absolute',
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                transformOrigin: '0 0',
              }}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
              onDoubleClick={handleDoubleClick}
              onContextMenu={handleContextMenu}
              onClick={handleCanvasClick}
            >
                      {/* OTHER USERS CURSORS */}
                      {!isPresentMode && otherUsers?.map((user: PresenceUser) => (
                        <motion.div
                          key={user.userId}
                          className="absolute pointer-events-none z-50"
                          style={{ left: user.cursor.x, top: user.cursor.y }}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow" />
                            <span className="text-xs bg-gray-900 text-white px-2 py-1 rounded shadow">
                              {user.user?.name || "User"}
                            </span>
                          </div>
                        </motion.div>
                      ))}

                      {/* CANVAS CONTENT */}
                      <div key={renderKey} style={{ width: '100%', height: '100%', position: 'relative' }}>
                        {/* GRID BACKGROUND */}
                        <div
                          className="absolute inset-0 canvas-background"
                          style={{
                            backgroundImage: `linear-gradient(rgba(217, 243, 230, 1) 1px, transparent 1px), linear-gradient(90deg, rgba(217, 243, 230, 1) 1px, transparent 1px)`,
                            backgroundSize: '40px 40px',
                          }}
                        />

                        {/* GROUPS */}
                        <div className="p-8">
                          {groups.map((group, index) => {
                            const isCurrentInPresentation = presentation.presentationState.isActive &&
                              !presentation.presentationState.isOverview &&
                              index === presentation.presentationState.currentGroupIndex;

                            return (
                              <AffinityGroup
                                key={group.id}
                                group={group}
                                activeSessionId={dotVoting.activeSessions?.[0]?._id}
                                myDotsCount={dotVoting.myDots?.length ?? 0}
                                insights={insights}
                                scale={scale}
                                isPlacingDot={dotVoting.isPlacingDot && !!dotVoting.activeSessions?.[0]}
                                onMove={(groupId, pos) => {
                                  if (presentation.presentationState.isActive) return;
                                  handleGroupMoveOptimistic(groupId, pos);
                                }}
                                onDragOver={(e: React.DragEvent) => {
                                  if (presentation.presentationState.isActive) { e.preventDefault(); return; }
                                  if (workspaceMode === 'grouping') { e.preventDefault(); setDragOverGroup(group.id); }
                                }}
                                onDragLeave={() => {
                                  if (presentation.presentationState.isActive) return;
                                  setDragOverGroup(null);
                                }}
                                onDrop={(e: React.DragEvent) => {
                                  if (presentation.presentationState.isActive) { e.preventDefault(); return; }
                                  if (workspaceMode === 'grouping') {
                                    e.preventDefault();
                                    const insightId = e.dataTransfer.getData('text/plain');
                                    const sourceGroupId = e.dataTransfer.getData('application/group-id');
                                    if (insightId) {
                                      saveCurrentState("before_insight_add", `Adding insight to group "${group.title}"`);
                                      onInsightDrop(insightId, group.id);
                                      toast.success(sourceGroupId ? `Insight moved to "${group.title}"` : `Insight added to "${group.title}"`);
                                    }
                                    setDragOverGroup(null);
                                  }
                                }}
                                onSelect={handleGroupSelect}
                                isSelected={presentation.presentationState.isActive ? false : selectedGroups.has(group.id)}
                                isDragOver={presentation.presentationState.isActive ? false : dragOverGroup === group.id}
                                isHighlighted={isCurrentInPresentation || themeManagement.highlightedGroups.has(group.id)}
                                isPresentationMode={presentation.presentationState.isActive}
                                isFocusedInPresentation={isCurrentInPresentation}
                                presentationScale={1.1}
                                onDelete={onGroupDelete}
                                onTitleUpdate={onGroupTitleUpdate}
                                onRemoveInsight={onInsightRemoveFromGroup}
                                onInsightDragStart={(insightId, sourceGroupId) => {
                                  if (!presentation.presentationState.isActive) {
                                    setDraggedInsightId(insightId);
                                    setDragSourceGroupId(sourceGroupId);
                                  }
                                }}
                                onInsightDrop={(insightId, targetGroupId) => {
                                  if (!presentation.presentationState.isActive) {
                                    saveCurrentState("before_insight_move", `Moving insight to different group`);
                                    onInsightDrop(insightId, targetGroupId);
                                    toast.success("Insight moved to new group");
                                    setDraggedInsightId(null);
                                    setDragSourceGroupId(null);
                                  }
                                }}
                                onOpenComments={handleOpenComments}
                                workspaceMode={workspaceMode}
                                projectContext={projectInfo ? `PROJECT: ${projectInfo.name}` : undefined}
                                sharedSelections={sharedSelections}
                                currentUserId={currentUserId!}
                                mapId={mapId}
                                commentCounts={commentCounts}
                                activeSession={dotVoting.activeSessions?.[0]}
                              />
                            );
                          })}

                          {/* EMPTY STATE */}
                          {groups.length === 0 && (
                            <div className="text-center py-20">
                              <div className="text-6xl mb-4">📊</div>
                              <h3 className="text-xl font-semibold text-gray-700 mb-2">Start Creating Groups</h3>
                              <p className="text-gray-500 mb-4">Double-click on the canvas to create your first group</p>
                              <div className="flex justify-center gap-4 text-sm text-gray-600 mb-6">
                                <div className="flex items-center gap-2">
                                  <kbd className="px-2 py-1 bg-gray-100 rounded border text-xs">Double-click</kbd>
                                  <span>Create group</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <kbd className="px-2 py-1 bg-gray-100 rounded border text-xs">N</kbd>
                                  <span>New group</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* ZOOM CONTROLS */}
                      <ZoomControls
                        zoomIn={zoomIn}
                        zoomOut={zoomOut}
                        resetTransform={resetTransform}
                        centerView={centerView}
                        scale={scale}
                      />
                    </div>
          </div>

          {/* STATUS INDICATORS */}
          <CanvasStatusIndicators
            isPlacingDot={dotVoting.isPlacingDot}
            isMovingWithArrows={isMovingWithArrows}
            selectedGroupsCount={selectedGroups.size}
            isSpacePressed={isSpacePressed}
            applyingAction={themeManagement.applyingAction}
            isSilentSortingActive={isSilentSortingActive}
            currentPhase={currentPhase}
            groupTimeLeft={groupTimeLeft}
            personalTimeLeft={personalTimeLeft}
          />
        </div>

        {/* SIDE PANELS */}
        <CanvasSidePanels
          isPresentMode={isPresentMode}
          activePanel={activePanel}
          setActivePanel={setActivePanel}
          groups={groups}
          insights={insights}
          projectId={projectId}
          projectInfo={projectInfo}
          mapId={mapId}
          selectedTheme={themeManagement.selectedTheme}
          setSelectedTheme={themeManagement.setSelectedTheme}
          onApplyRecommendation={themeManagement.handleApplyRecommendation}
          onGroupsMerge={themeManagement.handleGroupsMerge}
          filteredRecommendations={themeManagement.filteredRecommendations}
          themeAnalysis={themeManagement.themeAnalysis}
          isThemesAnalyzing={themeManagement.isThemesAnalyzing}
          onAnalyzeThemes={themeManagement.handleAnalyzeThemes}
          onClearThemes={themeManagement.clearThemes}
        />
      </div>

      {/* IMPORT MODAL */}
      <ImportModal
        open={showImportModal}
        onOpenChange={setShowImportModal}
        projectId={projectId}
        onImportSuccess={handleImportSuccess}
      />
    </div>
  );
}