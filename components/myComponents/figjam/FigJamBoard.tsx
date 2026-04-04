"use client";

import React, { useCallback, useRef, useState, useEffect, useMemo } from "react";

import { useFigJamBoard } from "@/hooks/useFigJamBoard";
import { StickyNote } from "./StickyNote";
import { ClusterLabel } from "./ClusterLabel";
import { FigJamToolbar } from "./FigJamToolbar";
import { MiniMap } from "./MiniMap";
import { AIGroupingPanel } from "./AIGroupingPanel";
import { LassoContextMenu, ClusterContextMenu } from "./ContextMenu";
import { ClusterAIRename } from "./ClusterAIRename";
import { CommentBubblesLayer } from "./CommentBubble";
import { PresentationMode } from "./PresentationMode";
import { InsightsSidebar } from "./InsightsSidebar";
import type { FigJamElement, Position, Size, StickyColor, StickyNoteData, DotData, ClusterLabelData, SectionData, TextData } from "@/types/figjam";
import type { Insight } from "@/types";

interface CommentBubbleData {
  id: string;
  position: Position;
  targetId?: string;
  targetType?: "sticky" | "label" | "canvas";
  resolved: boolean;
}
import { useAuth, useUser } from "@clerk/nextjs";
import { usePresence } from "@/hooks/usePresence";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { motion } from "framer-motion";
import { useThrottle } from "@/hooks/useThrottle";
import { useVotingSync } from "@/hooks/useVotingSync";
import { MentionToastProvider } from "@/hooks/useMentionToasts";
import { toast } from "sonner";
import { MessageSquare } from "lucide-react";
import { useConfirmationToast } from "@/hooks/useConfirmationToast";

interface PresenceUser {
  _id: string;
  _creationTime: number;
  userId: string;
  mapId: string;
  cursor: { x: number; y: number };
  selection: string[];
  user: { id: string; name: string; avatar?: string };
  cursorColor?: string;
  lastSeen: number;
}

type ElementPatch = Partial<StickyNoteData> | Partial<SectionData> | Partial<TextData> | Partial<DotData> | Partial<ClusterLabelData>;


// ─── Canvas dot grid ──────────────────────────────────────────────────────────

function CanvasGrid({ zoom, pan }: { zoom: number; pan: Position }) {
  const spacing = 24 * zoom;
  const offsetX = (pan.x % spacing + spacing) % spacing;
  const offsetY = (pan.y % spacing + spacing) % spacing;

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
      <defs>
        <pattern
          id="figjam-grid"
          x={offsetX} y={offsetY}
          width={spacing} height={spacing}
          patternUnits="userSpaceOnUse"
        >
          <path d={`M 0 0 L ${spacing} 0 M 0 0 L 0 ${spacing}`} stroke="#e5e7eb" strokeWidth={0.5} fill="none" opacity={0.5} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#figjam-grid)" />
    </svg>
  );
}

// ─── FigJamBoard ──────────────────────────────────────────────────────────────

interface FigJamBoardProps {
  projectName?: string;
  projectId?: string;
  storageKey?: string;
  onChange?: (elements: Record<string, FigJamElement>) => void;
  initialElements?: Record<string, FigJamElement>;
  mapId?: string;
  maxVotesPerUser?: number;
  onToggleActivityPanel?: () => void;
  isActivityPanelOpen?: boolean;
  style?: React.CSSProperties;
  isVotingMode?: boolean;
  voting?: ReturnType<typeof useVotingSync>;
  onBack?: () => void;
  onOpenComment?: (elementId: string, elementRect: DOMRect, elementTitle?: string) => void;
  // Import insights
  projectInsights?: Insight[];
  existingInsightIds?: string[];
  onImportInsights?: (insights: Insight[]) => void;
  // Callback to get current insight IDs on canvas
  onCanvasInsightIdsChange?: (insightIds: string[]) => void;
  // Presence users for displaying voter names
  presenceUsers?: Array<{ userId: string; user?: { id: string; name: string; avatar?: string } }>;
  // Current user for displaying own vote name
  currentUser?: { userId: string; name: string };
}

export function FigJamBoard({
  projectName,
  projectId,
  storageKey = "figjam-default",
  onChange,
  initialElements,
  mapId,
  maxVotesPerUser = 10,
  style,
  isVotingMode,
  voting: votingProp,
  onBack,
  onOpenComment,
  projectInsights = [],
  existingInsightIds = [],
  onImportInsights,
  onCanvasInsightIdsChange,
  presenceUsers = [],
  currentUser,
}: FigJamBoardProps) {
  const board = useFigJamBoard();
  const { state, setTool } = board;

  const hasMapId = !!mapId && !!projectId;
  
  // Simple voting mode - controlled by parent
  const isVotingModeEnabled = isVotingMode ?? false;

  // Voting hook - use passed prop or create new instance
  const localVoting = useVotingSync(undefined, undefined);
  const voting = votingProp ?? localVoting;

  // Local state for UI
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Track last saved elements to prevent save loops
  const lastSavedElementsRef = useRef<string>("");
  // Track last processed movement timestamp to avoid duplicates
  const lastProcessedTimestampRef = useRef<number>(0);

  const draggingRef = useRef<Set<string>>(new Set());
  const draggingClusterRef = useRef<string | null>(null);

  const isDraggingElement = useCallback((id: string) => {
    return draggingRef.current.has(id);
  }, []);

  const [draggingStickyId, setDraggingStickyId] = useState<string | null>(null);
  const draggingPositionRef = useRef<{ pos: Position; size: Size } | null>(null);

  const [lassoStart, setLassoStart] = useState<Position | null>(null);
  const [lassoEnd, setLassoEnd] = useState<Position | null>(null);
  const isLassoing = lassoStart !== null;

  const [renameSectionId, setRenameSectionId] = useState<string | null>(null);
  const [autoFitSectionId, setAutoFitSectionId] = useState<string | null>(null);
  const [showStickyPicker, setShowStickyPicker] = useState(false);
  const [pendingStickyPosition, setPendingStickyPosition] = useState<Position | null>(null);
  const [showAIGroupingPanel, setShowAIGroupingPanel] = useState(false);
  const [showInsightsSidebar, setShowInsightsSidebar] = useState(true);
  const [contextMenu, setContextMenu] = useState<{
    position: { x: number; y: number };
    ids: string[];
  } | null>(null);
  
  const [clusterContextMenu, setClusterContextMenu] = useState<{
    position: { x: number; y: number };
    clusterId: string;
  } | null>(null);

  const [showAIRenameDialog, setShowAIRenameDialog] = useState(false);
  const [selectedClusterForRename, setSelectedClusterForRename] = useState<string | null>(null);

  // Comment bubbles state - loaded from Convex
  const convexBubbles = useQuery(
    mapId ? api.commentBubbles.getBubblesByMap : "skip" as any,
    mapId ? { mapId: mapId as Id<"affinityMaps"> } : {}
  );
  
  const commentBubbles: CommentBubbleData[] = (convexBubbles ?? []).map((b: any) => ({
    id: b._id,
    position: b.position,
    targetId: b.targetId,
    targetType: b.targetType,
    resolved: b.resolved,
  }));

  const createBubbleMutation = useMutation(api.commentBubbles.createBubble);
  const deleteBubbleMutation = useMutation(api.commentBubbles.deleteBubble);
  const updateBubblePositionMutation = useMutation(api.commentBubbles.updateBubblePosition);
  const resolveBubbleMutation = useMutation(api.commentBubbles.resolveBubble);

  const [selectedBubbleId, setSelectedBubbleId] = useState<string | null>(null);
  const [isCommentToolActive, setIsCommentToolActive] = useState(false);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [newBubbleCount, setNewBubbleCount] = useState(0);
  const [isPresentationModeActive, setIsPresentationModeActive] = useState(false);
  const [bouncingBubbleId, setBouncingBubbleId] = useState<string | null>(null);

  // Pure helper function to find cluster at position (defined before useCallback to avoid hoisting issues)
  function findClusterAtPositionHelper(x: number, y: number, width: number, height: number, clusterLabels: ClusterLabelData[]): string | null {
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    
    for (const label of clusterLabels) {
      const clusterX = label.position.x;
      const clusterY = label.position.y;
      const clusterWidth = label.width ?? 400;
      const clusterHeight = label.height ?? 300;
      
      if (
        centerX >= clusterX &&
        centerX <= clusterX + clusterWidth &&
        centerY >= clusterY &&
        centerY <= clusterY + clusterHeight
      ) {
        return label.id;
      }
    }
    return null;
  }

  // Compute new insights that can be imported
  const existingIdsSet = useMemo(() => new Set(existingInsightIds), [existingInsightIds]);
  const newInsightsCount = useMemo(() => {
    return projectInsights.filter(insight => !existingIdsSet.has(insight.id)).length;
  }, [projectInsights, existingIdsSet]);

  // Track which insights are currently on canvas (use ref to avoid infinite loop)
  const onCanvasInsightIdsChangeRef = useRef(onCanvasInsightIdsChange);
  useEffect(() => {
    onCanvasInsightIdsChangeRef.current = onCanvasInsightIdsChange;
  });
  
  useEffect(() => {
    if (!onCanvasInsightIdsChangeRef.current) return;
    
    const canvasInsightIds = Object.values(state.elements)
      .filter(el => el.type === "sticky" && (el as any).insightId)
      .map(el => (el as any).insightId as string);
    
    onCanvasInsightIdsChangeRef.current(canvasInsightIds);
  }, [state.elements]);

  // Import insights to canvas
  const handleImportInsights = useCallback(() => {
    const newInsights = projectInsights.filter(insight => !existingIdsSet.has(insight.id));
    if (newInsights.length === 0) return;

    // Position the stickies in a grid
    const startX = 100;
    const startY = 100;
    const spacingX = 220;
    const spacingY = 220;
    const cols = Math.min(newInsights.length, 5);

    newInsights.forEach((insight, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const position = {
        x: startX + col * spacingX,
        y: startY + row * spacingY,
      };
      const size = { width: 200, height: 200 };
      
      // Determine color based on insight type
      let stickyColor: StickyColor = "insight";
      if (insight.type === "quote") stickyColor = "quote";
      else if (insight.type === "pain-point") stickyColor = "pain-point";
      
      const stickyId = board.addStickyNote(position, stickyColor, size, insight.createdByName || "Imported");
      
      // Auto-assign to cluster if created inside one (labels are available via state.elements after board.addStickyNote updates state)
      const clusterId = findClusterAtPositionHelper(position.x, position.y, size.width, size.height, labels);
      
      // Update content with the insight text, store the insight ID, and assign to cluster
      board.updateElement(stickyId, { 
        content: insight.text,
        insightId: insight.id,
        ...(clusterId && { clusterId }),
      });
    });

    toast.success(`${newInsights.length} insight${newInsights.length > 1 ? "s" : ""} imported`, {
      action: {
        label: "Annuler",
        onClick: () => {
          // Remove the imported stickies
          newInsights.forEach(insight => {
            const stickyId = Object.keys(state.elements).find(
              id => state.elements[id].type === "sticky" && (state.elements[id] as any).insightId === insight.id
            );
            if (stickyId) {
              board.deleteElement(stickyId);
            }
          });
          // Reset the imported state so button re-activates
          onImportInsights?.([]);
        },
      },
    });
    onImportInsights?.(newInsights);
  }, [projectInsights, existingIdsSet, board, onImportInsights]);

  // Track element positions to update bubbles that follow targets
  const elementPositionsRef = useRef<Record<string, Position>>({});

  // Update bubble positions when target elements move
  useEffect(() => {
    if (!convexBubbles) return;

    commentBubbles.forEach((bubble) => {
      if (bubble.targetId && bubble.targetType !== "canvas") {
        const targetElement = state.elements[bubble.targetId];
        if (targetElement) {
          const newPos = targetElement.position;
          const oldPos = elementPositionsRef.current[bubble.targetId];
          
          if (oldPos && (oldPos.x !== newPos.x || oldPos.y !== newPos.y)) {
            const dx = newPos.x - oldPos.x;
            const dy = newPos.y - oldPos.y;
            const newBubblePos = {
              x: bubble.position.x + dx,
              y: bubble.position.y + dy,
            };
            updateBubblePositionMutation({ 
              bubbleId: bubble.id as Id<"commentBubbles">, 
              position: newBubblePos 
            });
          }
        }
        elementPositionsRef.current[bubble.targetId] = targetElement.position;
      }
    });
  }, [state.elements, commentBubbles]);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;
      const active = document.activeElement;
      if (active?.tagName === "INPUT" || active?.tagName === "TEXTAREA" || (active as HTMLElement)?.isContentEditable) return;

      const key = e.key.toLowerCase();
      
      // Tool shortcuts - deactivate comment tool when using other tools
      if (key === "v") {
        setTool("select");
        setIsCommentToolActive(false);
      } else if (key === "h") {
        setTool("hand");
        setIsCommentToolActive(false);
      } else if (key === "s") {
        setTool("sticky");
        setShowStickyPicker(true);
        setIsCommentToolActive(false);
      } else if (key === "f") {
        setTool("section");
        setIsCommentToolActive(false);
      } else if (key === "c") {
        setTool("cluster");
        setIsCommentToolActive(false);
      } else if (key === "m") {
        setIsCommentToolActive(prev => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setTool, setIsCommentToolActive]);

  // ── Presence (cursors) ───────────────────────────────────────────────────
  const { userId } = useAuth();
  const { user } = useUser();
  const currentUserName = user?.fullName || user?.firstName || "Anonymous";

  // ── Confirmation Toasts ─────────────────────────────────────────────────
  const { confirmDelete, confirmMerge, showUndoToast } = useConfirmationToast();
  
  const CURSOR_COLORS = [
    "#ef4444", "#f97316", "#eab308", "#22c55e",
    "#14b8a6", "#3b82f6", "#8b5cf6", "#ec4899",
  ];
  
  // User color for voting dots - consistent based on userId
  const userColor = useMemo(() => {
    const VOTING_COLORS = [
      "#EF4444", "#F59E0B", "#10B981", "#3B82F6",
      "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16"
    ];
    if (!userId) return "#22c55e";
    const hash = userId.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    return VOTING_COLORS[hash % VOTING_COLORS.length];
  }, [userId]);
  const OFFLINE_THRESHOLD_MS = 30000;
  const INACTIVE_THRESHOLD_MS = 5000;

  function getUserColor(userId: string): string {
    // Generate consistent color based on userId
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
  }

  function formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  // ============================================
  // CONvex - Load/Save FigJam Elements
  // ============================================
  const updatePresence = usePresence(hasMapId ? (mapId as Id<"affinityMaps">) : "");
  
  // Query: Get other users' presence (cursors, selections)
  const otherUsers = useQuery(
    api.presence.getByMap,
    hasMapId ? { mapId: mapId as Id<"affinityMaps"> } : "skip"
  );

  // Create userNames map from other users
  const userNamesMap = useMemo(() => {
    const map = new Map<string, string>();
    map.set("current-user", "You");
    if (userId) map.set(userId, currentUserName);
    otherUsers?.forEach((u: PresenceUser) => {
      if (u.userId && u.user?.name) {
        map.set(u.userId, u.user.name);
      }
    });
    return map;
  }, [otherUsers, userId, currentUserName]);

  // Query: Load FigJam elements from Convex
  const savedElements = useQuery(
    api.affinityMaps.getFigJamElements,
    hasMapId ? { mapId: mapId as Id<"affinityMaps"> } : "skip"
  );
  
  // Query: Get recent movements for real-time sync
  const recentMovements = useQuery(
    api.affinityMaps.getRecentMovements,
    hasMapId ? { mapId: mapId as Id<"affinityMaps"> } : "skip"
  );

  // Query: Get element locks
  const elementLocks = useQuery(
    api.affinityMaps.getElementLocks,
    hasMapId ? { mapId: mapId as Id<"affinityMaps"> } : "skip"
  );

  // Mutation: Save FigJam elements to Convex (debounced)
  const saveToConvex = useMutation(api.affinityMaps.saveFigJamElements);
  
  // Mutation: Broadcast real-time movement
  const broadcastMovement = useMutation(api.affinityMaps.broadcastMovement);
  
  // Mutation: Lock/unlock elements
  const lockElement = useMutation(api.affinityMaps.lockElement);
  const unlockElement = useMutation(api.affinityMaps.unlockElement);
  
  // Mutation: Log activity
  const logActivity = useMutation(api.activityLog.logActivity);
  
  // Throttled save - saves every 500ms to keep Convex in sync
  const throttledSave = useThrottle((elements: Record<string, FigJamElement>) => {
    if (hasMapId) {
      saveToConvex({
        mapId: mapId as Id<"affinityMaps">,
        elements,
      });
    }
  }, 500);
  
  // Throttled broadcast - sends movement updates every 100ms for real-time sync
  const throttledBroadcast = useThrottle((
    elementId: string,
    elementType: "sticky" | "section" | "dot" | "label",
    action: "move" | "resize" | "update",
    position?: { x: number; y: number },
    size?: { width: number; height: number },
    patch?: ElementPatch
  ) => {
    if (hasMapId && userId) {
      broadcastMovement({
        mapId: mapId as Id<"affinityMaps">,
        elementId,
        elementType,
        action,
        position,
        size,
        patch,
        userId,
      });
    }
  }, 200);

  // Helper to get lock info for an element
  const getLockInfo = (elementId: string) => {
    const lock = elementLocks?.find(l => l.elementId === elementId);
    if (!lock) return { isLocked: false, lockedByName: undefined };
    
    // Find user name from presence
    const user = otherUsers?.find(u => u.userId === lock.userId);
    const isLockedByMe = lock.userId === userId;
    
    return {
      isLocked: !isLockedByMe,
      lockedByName: user?.user?.name || (isLockedByMe ? "You" : "Someone"),
    };
  };

  // ============================================
  // Selection with locking
  // ============================================
  const handleSelectWithLock = useCallback(async (id: string, multi: boolean = false) => {
    if (!hasMapId || !userId) return;
    
    // Check if already locked by someone else
    const lock = elementLocks?.find(l => l.elementId === id);
    if (lock && lock.userId !== userId) {
      // Element is locked by another user - can't select
      return;
    }
    
    // Lock the element
    const result = await lockElement({
      mapId: mapId as Id<"affinityMaps">,
      elementId: id,
      userId,
    });
    
    if (result.success) {
      board.selectElement(id, multi);
    }
  }, [hasMapId, userId, elementLocks, lockElement, board]);

  const handleDeselectAndUnlock = useCallback(async (id: string) => {
    if (!hasMapId || !userId) return;
    
    // Unlock the element
    await unlockElement({
      mapId: mapId as Id<"affinityMaps">,
      elementId: id,
      userId,
    });
  }, [hasMapId, userId, unlockElement]);

  // ============================================
  // LOAD: Priority Convex > initialElements > localStorage
  // ============================================
  const hasLoadedInitialRef = useRef(false);
  const savedElementsRef = useRef(savedElements);
  
  // Update ref when savedElements changes
  useEffect(() => {
    savedElementsRef.current = savedElements;
  }, [savedElements]);
  
  // Effect to mark board as loaded AFTER state has been updated
  useEffect(() => {
    if (!isLoaded) return;
    
    board.markLoaded();
  }, [isLoaded, board]);

  useEffect(() => {
    // Only run on mount (when savedElements first loads)
    if (hasLoadedInitialRef.current) return;
    
    // Wait for savedElements to be defined (not undefined)
    if (savedElementsRef.current === undefined) return;
    
    hasLoadedInitialRef.current = true;
    
    // Priority 1: Convex (shared state from other users)
    if (savedElements && Object.keys(savedElements).length > 0) {
      board.loadElements(savedElements);
      setIsLoaded(true);
      return;
    }

    // Priority 2: Initial elements prop
    if (initialElements && Object.keys(initialElements).length > 0) {
      board.loadElements(initialElements);
      setIsLoaded(true);
      return;
    }

    // Priority 3: localStorage (fallback for offline) - only if storageKey is defined
    if (storageKey) {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as Record<string, FigJamElement>;
          board.loadElements(parsed);
          setIsLoaded(true);
          return;
        } catch (e) {
          console.error("Failed to load board from localStorage:", e);
        }
      }
    }
    
    // Mark as loaded even if nothing was loaded
    setIsLoaded(true);
  }, [savedElements, initialElements, storageKey]);

  // ============================================
  // REAL-TIME SYNC: Sync with Convex when data changes from other users
  // ============================================
  const lastSyncedElementsRef = useRef<string>("");
  
  useEffect(() => {
    if (!isLoaded || !savedElements) return;
    
    // Skip if this is the initial load (handled above)
    if (!hasLoadedInitialRef.current) return;
    
    // Compare with last synced state to detect changes from other users
    const newElementsStr = JSON.stringify(savedElements);
    if (newElementsStr === lastSyncedElementsRef.current) return;
    
    // Check if there are new elements (clusters) that we don't have
    const currentElementIds = new Set(Object.keys(state.elements));
    const newElementIds = new Set(Object.keys(savedElements));
    
    // Find new elements that we don't have
    const newIds = Array.from(newElementIds).filter(id => !currentElementIds.has(id));
    
    if (newIds.length > 0) {
      // There are new elements - merge them into the board
      const mergedElements = { ...state.elements };
      newIds.forEach(id => {
        mergedElements[id] = savedElements[id];
      });
      board.loadElements(mergedElements);
    }
    
    lastSyncedElementsRef.current = newElementsStr;
  }, [savedElements, isLoaded, state.elements, board]);

  // ============================================
  // Save: On every change → Convex + localStorage
  // ============================================
  useEffect(() => {
    if (!isLoaded) return;
    
    // Serialize current elements to compare
    const currentElementsStr = JSON.stringify(state.elements);
    
    // Skip if elements haven't changed since last save
    if (currentElementsStr === lastSavedElementsRef.current) {
      return;
    }
    
    // Save to localStorage (instant) - only if storageKey is defined
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(state.elements));
    }
    
    // Save to Convex (throttled) - only if there are elements
    if (Object.keys(state.elements).length > 0) {
      lastSavedElementsRef.current = currentElementsStr;
      throttledSave(state.elements);
    }
    
    // Notify parent component
    onChange?.(state.elements);
  }, [state.elements, storageKey, isLoaded, throttledSave]);

  // ============================================
  // PHASE 3: Real-time movements from other users
  // ============================================
  useEffect(() => {
    if (!recentMovements || recentMovements.length === 0) return;
    
    for (const movement of recentMovements) {
      if (movement.userId === userId) continue;
      if (movement.timestamp <= lastProcessedTimestampRef.current) continue;
      lastProcessedTimestampRef.current = movement.timestamp;

      const element = state.elements[movement.elementId];
      if (!element) continue;

      if (isDraggingElement(movement.elementId)) continue;
      
      if (movement.action === "move" && movement.position) {
        board.updateElement(movement.elementId, {
          position: movement.position,
        });
      } else if (movement.action === "resize" && movement.size) {
        board.updateElement(movement.elementId, {
          size: movement.size,
        });
      } else if (movement.action === "update" && movement.patch) {
        board.updateElement(movement.elementId, movement.patch);
      }
    }
  }, [recentMovements, userId, isDraggingElement]);

  // ============================================
  // Unlock elements when deselecting
  // ============================================
  useEffect(() => {
    if (!hasMapId || !userId || !elementLocks) return;
    
    // Find locks we hold that are no longer in selection
    const selectedIds = state.selectedIds;
    const ourLocks = elementLocks.filter(l => l.userId === userId);
    
    for (const lock of ourLocks) {
      if (!selectedIds.includes(lock.elementId)) {
        // We held a lock but no longer have this element selected - unlock it
        unlockElement({
          mapId: mapId as Id<"affinityMaps">,
          elementId: lock.elementId,
          userId,
        });
      }
    }
  }, [state.selectedIds, elementLocks, hasMapId, userId]);

  // ── Context menu event handlers ─────────────────────────────────────
  useEffect(() => {
    const handleRenameSection = (e: Event) => {
      const sectionId = (e as CustomEvent).detail;
      setRenameSectionId(sectionId);
    };

    const handleDuplicateSection = (e: Event) => {
      const sectionId = (e as CustomEvent).detail;
      board.duplicateElement(sectionId);
    };

    window.addEventListener("renameSection", handleRenameSection);
    window.addEventListener("duplicateSection", handleDuplicateSection);

    return () => {
      window.removeEventListener("renameSection", handleRenameSection);
      window.removeEventListener("duplicateSection", handleDuplicateSection);
    };
  }, [board]);

  // ── Derived state ───────────────────────────────────────────────────
  const allStickies = Object.values(state.elements).filter(
    (el): el is StickyNoteData => el.type === "sticky"
  );

  // ── Space key for pan ────────────────────────────────────────────────────
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept space if typing in an input/textarea
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
      
      if (e.code === "Space" && !e.repeat && !isTyping) {
        e.preventDefault();
        setIsSpacePressed(true);
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      // Don't intercept space if typing in an input/textarea
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
      
      if (e.code === "Space" && !isTyping) {
        setIsSpacePressed(false);
        isPanning.current = false;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // ── Canvas pan / zoom ────────────────────────────────────────────────────

  const canvasRef = useRef<HTMLDivElement>(null);
  const isPanning = useRef(false);
  const panStart  = useRef<Position>({ x: 0, y: 0 });
  const panOrigin = useRef<Position>({ x: 0, y: 0 });

  const screenToCanvas = useCallback(
    (screenX: number, screenY: number): Position => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: (screenX - rect.left  - state.pan.x) / state.zoom,
        y: (screenY - rect.top   - state.pan.y) / state.zoom,
      };
    },
    [state.pan, state.zoom]
  );

  // Wheel zoom centred on cursor
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const delta  = e.deltaY < 0 ? 1.08 : 1 / 1.08;
      const newZoom = Math.min(4, Math.max(0.1, state.zoom * delta));
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      board.setZoom(newZoom);
      board.setPan({
        x: mx - (mx - state.pan.x) * (newZoom / state.zoom),
        y: my - (my - state.pan.y) * (newZoom / state.zoom),
      });
    },
    [state.zoom, state.pan, board]
  );

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  // ── Canvas pointer events ────────────────────────────────────────────────

  const handleCanvasPointerDown = useCallback(
    (e: React.PointerEvent) => {
      const isMiddle   = e.button === 1;
      const isHandTool = state.activeTool === "hand";
      const isSpacePan = isSpacePressed;

      // Pan with space + click or middle mouse or hand tool
      if (isMiddle || isHandTool || isSpacePan) {
        isPanning.current = true;
        panStart.current  = { x: e.clientX, y: e.clientY };
        panOrigin.current = { ...state.pan };
        e.currentTarget.setPointerCapture(e.pointerId);
        
        if (isSpacePan) {
          document.body.style.cursor = "grabbing";
        }
        return;
      }

      // Start lasso selection on canvas click
      // Block in silent mode during voting
      const target = e.target as HTMLElement;
      if (target === canvasRef.current || target.closest(".lasso-area")) {
        const pos = screenToCanvas(e.clientX, e.clientY);
        setLassoStart(pos);
        setLassoEnd(pos);
        e.currentTarget.setPointerCapture(e.pointerId);
        if (!e.ctrlKey && !e.metaKey) {
          board.clearSelection();
        }
      }

      if (state.activeTool === "label") {
        const pos = screenToCanvas(e.clientX, e.clientY);
        const labelId = board.addClusterLabel({ x: pos.x, y: pos.y });
        board.setTool("select");
      }

      // Cluster tool - create cluster at click position
      if (state.activeTool === "cluster") {
        const pos = screenToCanvas(e.clientX, e.clientY);
        const clusterId = board.addClusterLabel(
          { x: pos.x - 200, y: pos.y - 100 },
          { width: 400, height: 200 }
        );
        board.updateElement(clusterId, { text: "New Cluster" });
        board.setTool("select");
        
        if (hasMapId) {
          saveToConvex({
            mapId: mapId as Id<"affinityMaps">,
            elements: state.elements,
          });
        }
        return;
      }

      // Sticky notes - disabled during voting
      if (state.activeTool === "sticky" && !voting.isVoting) {
        const pos = screenToCanvas(e.clientX, e.clientY);
        const stickyColor: StickyColor = "insight";
        const size = { width: 200, height: 200 };
        const stickyPos = { x: pos.x - 100, y: pos.y - 100 };
        
        // Auto-assign to cluster if created inside one - compute labels from state.elements
        const currentLabels = Object.values(state.elements).filter((el): el is ClusterLabelData => el.type === "label");
        const clusterId = findClusterAtPositionHelper(stickyPos.x, stickyPos.y, size.width, size.height, currentLabels);
        
        const stickyId = board.addStickyNote(stickyPos, stickyColor, size, currentUserName);
        
        // Update with clusterId if inside a cluster
        if (clusterId) {
          board.updateElement(stickyId, { clusterId });
        }
        
        if (hasMapId && mapId) {
          const newElement: FigJamElement = {
            id: stickyId,
            type: "sticky",
            position: stickyPos,
            color: stickyColor,
            content: "",
            author: userId || "local-user",
            authorName: currentUserName,
            source: stickyColor,
            votes: 0,
            votedBy: [],
            parentSectionId: null,
            size,
            zIndex: 1,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            clusterId,
          };
          saveToConvex({
            mapId: mapId as Id<"affinityMaps">,
            elements: { ...state.elements, [stickyId]: newElement },
          });
          throttledBroadcast(stickyId, "sticky", "update", stickyPos, size, { 
            clusterId,
            content: "",
            color: stickyColor,
            author: userId || "local-user",
            authorName: currentUserName,
            source: stickyColor,
            parentSectionId: null,
          });
          try {
            logActivity({
              mapId: mapId as Id<"affinityMaps">,
              action: "sticky_created",
              targetId: stickyId,
              targetName: stickyColor,
              details: { color: stickyColor },
            });
          } catch (err) {
            console.error("Failed to log activity:", err);
          }
        }
        board.selectElement(stickyId);
        board.setTool("select");
      }

      if (isCommentToolActive) {
        const pos = screenToCanvas(e.clientX, e.clientY);
        if (mapId) {
          createBubbleMutation({
            mapId: mapId as Id<"affinityMaps">,
            position: pos,
            targetType: "canvas",
            createdBy: userId || "",
            createdByName: currentUserName,
          }).catch(console.error);
        }
        setIsCommentToolActive(false);
      }
    },
    [state.activeTool, state.pan, state.elements, board, screenToCanvas, isSpacePressed, currentUserName, hasMapId, mapId, logActivity, createBubbleMutation, userId]
  );

  const handleCanvasPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (isCommentToolActive) {
        setCursorPos({ x: e.clientX, y: e.clientY });
        return;
      }
      
      if (isLassoing) {
        const pos = screenToCanvas(e.clientX, e.clientY);
        setLassoEnd(pos);
        return;
      }
      
      if (!isPanning.current) {
        // Update presence cursor with current position
        if (hasMapId && updatePresence) {
          const pos = screenToCanvas(e.clientX, e.clientY);
          updatePresence(pos.x, pos.y, state.selectedIds);
        }
        return;
      }
      
      board.setPan({
        x: panOrigin.current.x + (e.clientX - panStart.current.x),
        y: panOrigin.current.y + (e.clientY - panStart.current.y),
      });
    },
    [board, isLassoing, isCommentToolActive, screenToCanvas, hasMapId, updatePresence, state.selectedIds]
  );

  const handleCanvasPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (isLassoing && lassoStart && lassoEnd) {
        const minX = Math.min(lassoStart.x, lassoEnd.x);
        const maxX = Math.max(lassoStart.x, lassoEnd.x);
        const minY = Math.min(lassoStart.y, lassoEnd.y);
        const maxY = Math.max(lassoStart.y, lassoEnd.y);
        
        // Select all stickies within lasso
        allStickies.forEach((sticky) => {
          const sRight = sticky.position.x + 200;
          const sBottom = sticky.position.y + 200;
          
          const intersects = !(sRight < minX || sticky.position.x > maxX || sBottom < minY || sticky.position.y > maxY);
          
          if (intersects) {
            board.selectElement(sticky.id, true);
          }
        });
        
        // Select all cluster labels within lasso (compute from state.elements)
        const allLabels = Object.values(state.elements).filter(
          (el): el is ClusterLabelData => el.type === "label"
        );
        allLabels.forEach((label) => {
          const labelX = label.position.x;
          const labelY = label.position.y;
          
          // Check if label center is within lasso (expand lasso to include label area)
          const lassoPadding = 100; // Account for label size
          const intersects = 
            labelX >= minX - lassoPadding && 
            labelX <= maxX + lassoPadding &&
            labelY >= minY - lassoPadding && 
            labelY <= maxY + lassoPadding;
          
          if (intersects) {
            board.selectElement(label.id, true);
          }
        });
      }
      
      setLassoStart(null);
      setLassoEnd(null);
      isPanning.current = false;
    },
    [isLassoing, lassoStart, lassoEnd, allStickies, state.elements, board]
  );

  // ── Keyboard shortcuts ───────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // Undo/Redo
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        board.undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        board.redo();
        return;
      }

      // Group selected (Ctrl+G)
      if ((e.ctrlKey || e.metaKey) && e.key === "g") {
        e.preventDefault();
        board.groupSelectedIntoSection();
        return;
      }

      // Select all (Ctrl+A)
      if ((e.ctrlKey || e.metaKey) && e.key === "a") {
        e.preventDefault();
        const allStickyIds = allStickies.map((s) => s.id);
        allStickyIds.forEach((id, i) => board.selectElement(id, i > 0));
        return;
      }

      // Arrow keys for moving selected elements (stickies AND clusters)
      const arrowKeys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
      if (arrowKeys.includes(e.key) && state.selectedIds.length > 0) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        let dx = 0, dy = 0;
        switch (e.key) {
          case "ArrowUp": dy = -step; break;
          case "ArrowDown": dy = step; break;
          case "ArrowLeft": dx = -step; break;
          case "ArrowRight": dx = step; break;
        }
        
        // Get all selected elements (stickies and labels/clusters)
        const selectedElements = state.selectedIds
          .map((id) => state.elements[id])
          .filter((el) => el && (el.type === "sticky" || el.type === "label"));
        
        // Move all selected elements
        const patches: { id: string; patch: ElementPatch }[] = selectedElements.map((el) => ({
          id: el.id,
          patch: {
            position: {
              x: el.position.x + dx,
              y: el.position.y + dy,
            },
          },
        }));
        
        if (patches.length > 0) {
          board.updateMany(patches);
          
          // Broadcast movements for all moved elements
          if (hasMapId) {
            patches.forEach(({ id, patch }) => {
              const element = state.elements[id];
              if (element?.type === "sticky") {
                throttledBroadcast(id, "sticky", "move", patch.position as Position);
              } else if (element?.type === "label") {
                throttledBroadcast(id, "label", "move", patch.position as Position);
              }
            });
          }
        }

        return;
      }

      switch (e.key) {
        case "v": case "V": board.setTool("select"); break;
        case "h": case "H": board.setTool("hand");   break;
        case "t": case "T": board.setTool("text");   break;
        case "f": case "F": board.setTool("section"); break;
        case "c": case "C": board.setTool("label"); break;
        case "F2":
          if (state.selectedIds.length === 1) {
            const selectedEl = state.elements[state.selectedIds[0]];
            if (selectedEl?.type === "section") {
              e.preventDefault();
              setRenameSectionId(state.selectedIds[0]);
            }
          }
          break;
        case "Escape":
          board.setTool("select");
          board.clearSelection();
          setShowStickyPicker(false);
          break;
        case "Backspace":
        case "Delete":
          state.selectedIds.forEach((id) => {
            const element = state.elements[id];
            if (element) {
              if (hasMapId && mapId) {
                try {
                  if (element.type === "sticky") {
                    logActivity({
                      mapId: mapId as Id<"affinityMaps">,
                      action: "sticky_deleted",
                      targetId: id,
                      targetName: (element as StickyNoteData).source || "sticky",
                    });
                  } else if (element.type === "label") {
                    logActivity({
                      mapId: mapId as Id<"affinityMaps">,
                      action: "group_deleted",
                      targetId: id,
                      targetName: (element as ClusterLabelData).text || "label",
                    });
                  }
                } catch (err) {
                  console.error("Failed to log activity:", err);
                }
              }
              board.deleteElement(id);
            }
          });
          break;
        case "+": board.setZoom(state.zoom * 1.15); break;
        case "-": board.setZoom(state.zoom / 1.15); break;
        case "0": board.setZoom(1); board.setPan({ x: 0, y: 0 }); break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [board, state.selectedIds, state.zoom, state.elements, allStickies]);

  useEffect(() => { onChange?.(state.elements); }, [state.elements, onChange]);

  // ── Sort elements for rendering ──────────────────────────────────────────

  const sorted    = Object.values(state.elements).sort((a, b) => a.zIndex - b.zIndex);
  const labels    = sorted.filter((el): el is ClusterLabelData     => el.type === "label");
  const stickies  = sorted.filter((el): el is StickyNoteData      => el.type === "sticky");
  const clusterElements = labels;

  // Explicit clusterId-based grouping - use clusterId from sticky directly
  // Also check parentSectionId for backwards compatibility with old data
  const getStickyCluster = useCallback((sticky: StickyNoteData): string | null => {
    return sticky.clusterId ?? sticky.parentSectionId ?? null;
  }, []);

  // Ungrouped stickies - stickies not in any cluster
  const ungroupedStickies = useMemo(() => {
    return stickies.filter((s) => {
      const clusterId = getStickyCluster(s as StickyNoteData);
      return clusterId === null;
    });
  }, [stickies, getStickyCluster]);

  // ── Is sticky filtered function ──────────────────────────────────────
  const isStickyFiltered = useCallback((_sticky: StickyNoteData): boolean => {
    return false;
  }, []);

  // Handle creating a cluster from AI grouping suggestions
  const handleCreateClusterFromAI = useCallback((
    stickyIds: string[],
    title: string,
    position: Position
  ) => {
    // Create cluster with default size
    const clusterId = board.addClusterLabel(position, { width: 400, height: 300 });
    
    // Update the cluster title
    board.updateElement(clusterId, { text: title });
    
    // IMMEDIATE SAVE - critical for sync
    if (hasMapId) {
      saveToConvex({
        mapId: mapId as Id<"affinityMaps">,
        elements: state.elements,
      });
    }
    
    // Position stickies within the cluster zone
    const STICKY_SPACING_X = 220;
    const STICKY_SPACING_Y = 160;
    const COLUMNS = 3;
    const CLUSTER_PADDING = 40;
    
    stickyIds.forEach((stickyId, index) => {
      const col = index % COLUMNS;
      const row = Math.floor(index / COLUMNS);
      
      const stickyPosition = {
        x: position.x + CLUSTER_PADDING + col * STICKY_SPACING_X,
        y: position.y + CLUSTER_PADDING + row * STICKY_SPACING_Y,
      };
      
      const sticky = state.elements[stickyId];
      const size = (sticky && sticky.type === "sticky") 
        ? (sticky as StickyNoteData).size 
        : { width: 200, height: 200 };
      
      // Update sticky position AND assign to cluster
      board.updateElement(stickyId, { 
        position: stickyPosition, 
        size,
        clusterId: clusterId 
      });
    });
    
    toast.success(`Created cluster "${title}" with ${stickyIds.length} stickies`);
  }, [board, state.elements]);

  // Vote results for ranking display (using voting hook)
  const voteResults = useMemo(() => {
    if (!voting.session || voting.session.isActive) return [];
    return labels
      .map(label => {
        const clusterVotes = voting.getClusterVotes(label.id);
        return {
          sectionId: label.id,
          title: label.text || "Untitled Cluster",
          voteCount: clusterVotes.length,
          colors: clusterVotes.map((v: { color: string }) => v.color),
        };
      })
      .filter(r => r.voteCount > 0)
      .sort((a, b) => b.voteCount - a.voteCount);
  }, [labels, voting.session, voting]);

  const cursorStyle =
    state.activeTool === "hand"    ? "cursor-grab"
    : state.activeTool === "sticky"  ? "cursor-crosshair"
    : state.activeTool === "section" ? "cursor-crosshair"
    : state.activeTool === "label"  ? "cursor-crosshair"
    : isCommentToolActive ? "cursor-pointer"
    : isSpacePressed ? "cursor-grab"
    : "cursor-default";

  return (
    <div
      className="relative w-full h-full overflow-hidden bg-[#f5f5f0] select-none flex"
      style={{ fontFamily: "'DM Sans', system-ui, sans-serif", ...style }}
    >
      {/* ── Insights Sidebar ── */}
      {showInsightsSidebar && (
        <InsightsSidebar
          ungroupedStickies={ungroupedStickies}
          onCreateSticky={(content, color) => {
            const size = { width: 160, height: 120 };
            const position = { x: 100, y: 100 };
            const stickyId = board.addStickyNote(position, color, size, currentUserName);
            board.updateElement(stickyId, { content });
            board.selectElement(stickyId);
            return stickyId;
          }}
          onDragStart={(sticky) => {
            setDraggingStickyId(sticky.id);
          }}
          draggingStickyId={draggingStickyId}
        />
      )}

      {/* Sidebar Toggle Button */}
      <button
        onClick={() => setShowInsightsSidebar(!showInsightsSidebar)}
        className="fixed top-1/2 z-50 w-8 h-16 rounded-r-xl bg-card border border-l-0 border-[#e8e8e8] dark:border-border shadow-lg flex items-center justify-center hover:bg-accent transition-all -translate-y-1/2"
        style={{ left: showInsightsSidebar ? "272px" : "0px" }}
      >
        <svg 
          className={`w-4 h-4 text-muted-foreground transition-transform ${showInsightsSidebar ? "" : "rotate-180"}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* ── AI Grouping Panel ── */}
      <AIGroupingPanel
        isOpen={showAIGroupingPanel}
        onClose={() => setShowAIGroupingPanel(false)}
        ungroupedStickies={ungroupedStickies}
        existingClusters={labels}
        projectContext={projectName ? `PROJECT NAME: ${projectName}` : undefined}
        onCreateCluster={handleCreateClusterFromAI}
      />

      {/* ── Canvas ── */}
      <div
        ref={canvasRef}
        className={`flex-1 ${cursorStyle}`}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={handleCanvasPointerUp}
        onContextMenu={(e) => {
          e.preventDefault();
          if (state.selectedIds.length > 0) {
            setContextMenu({
              position: { x: e.clientX, y: e.clientY },
              ids: state.selectedIds,
            });
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
        }}
        onDrop={(e) => {
          e.preventDefault();
          const stickyId = e.dataTransfer.getData("application/sticky-id");
          if (stickyId) {
            const pos = screenToCanvas(e.clientX, e.clientY);
            const sticky = state.elements[stickyId];
            if (sticky && sticky.type === "sticky") {
              let targetClusterId: string | null = null;
              
              for (const label of labels) {
                const clusterX = label.position.x;
                const clusterY = label.position.y;
                const clusterWidth = label.width ?? 400;
                const clusterHeight = label.height ?? 300;
                
                if (
                  pos.x >= clusterX &&
                  pos.x <= clusterX + clusterWidth &&
                  pos.y >= clusterY &&
                  pos.y <= clusterY + clusterHeight
                ) {
                  targetClusterId = label.id;
                  break;
                }
              }
              
              board.updateElement(stickyId, { 
                clusterId: targetClusterId,
              });
              if (hasMapId) {
                throttledBroadcast(stickyId, "sticky", "update", undefined, undefined, { clusterId: targetClusterId });
              }
            }
          }
          setDraggingStickyId(null);
        }}
        onDragEnd={() => {
          setDraggingStickyId(null);
        }}
      >
        <CanvasGrid zoom={state.zoom} pan={state.pan} />

        <div
          className="absolute origin-top-left lasso-area"
          style={{ transform: `translate(${state.pan.x}px, ${state.pan.y}px) scale(${state.zoom})` }}
        >
          {/* ── Remote cursors (inside transformed layer) ── */}
          {/* Hide other users' cursors during voting to avoid influencing votes */}
          {voting.isVoting ? null : otherUsers
            ?.filter((u: PresenceUser) => {
              return Date.now() - u.lastSeen < OFFLINE_THRESHOLD_MS;
            })
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
                  <svg 
                    width="24" 
                    height="24" 
                    viewBox="0 0 24 24" 
                    style={{ filter: `drop-shadow(0 0 3px ${userData.cursorColor || getUserColor(userData.userId)})` }}
                  >
                    <path 
                      d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87c.48 0 .72-.58.38-.92L5.85 2.85a.5.5 0 0 0-.35-.15.5.5 0 0 0-.5.51z" 
                      fill={userData.cursorColor || getUserColor(userData.userId)}
                    />
                  </svg>
                  <span
                    className="text-xs text-white px-2 py-1 rounded shadow whitespace-nowrap"
                    style={{ backgroundColor: userData.cursorColor || getUserColor(userData.userId) }}
                  >
                    {userData.user?.name || "User"}
                  </span>
                </div>
              </motion.div>
            ))}
          {/* ── Lasso selection visual ── */}
          {lassoStart && lassoEnd && (
            <div
              className="absolute pointer-events-none border-2 border-blue-500 bg-blue-500/10 rounded-md"
              style={{
                left: Math.min(lassoStart.x, lassoEnd.x),
                top: Math.min(lassoStart.y, lassoEnd.y),
                width: Math.abs(lassoEnd.x - lassoStart.x),
                height: Math.abs(lassoEnd.y - lassoStart.y),
              }}
            />
          )}

          {/* ── Cluster Labels ── */}
          {labels.map((el) => {
            const isClusterDragging = draggingClusterRef.current === el.id;
            
            const clusterWidth = el.width ?? 400;
            const clusterHeight = el.height ?? 300;
            
            const stickiesInThisCluster = stickies.filter(s => 
              s.clusterId === el.id || s.parentSectionId === el.id
            );

            const clusterVotes = voting.getClusterVotes(el.id);
            const isVotingActive = voting.isVoting;
            const isVotingRevealed = voting.isRevealed;

            // Create voteUsers mapping from sessionVotes and presenceUsers
            const voteUsers = (voting.sessionVotes || [])
              .filter(v => v.targetId === el.id)
              .map(v => {
                const presenceUser = presenceUsers.find(p => p.userId === v.userId);
                const isCurrentUser = currentUser?.userId === v.userId;
                return {
                  userId: v.userId,
                  name: isCurrentUser
                    ? (currentUser.name || "You")
                    : (presenceUser?.user?.name || v.userId.split('-')[0] || "User"),
                  color: v.color,
                };
              });

            // Calculate if user has voted for this cluster
            const hasUserVotedForCluster = (voting.sessionVotes || [])
              .some(v => v.targetId === el.id && v.userId === currentUser?.userId);
            
            return (
              <ClusterLabel
                key={el.id}
                cluster={el}
                memberStickies={stickiesInThisCluster}
                isDragging={isClusterDragging}
                isDropTarget={draggingStickyId !== null}
                isLocked={getLockInfo(el.id).isLocked}
                isVotingActive={isVotingActive}
                isVotingRevealed={isVotingRevealed}
                voteCount={clusterVotes.length}
                voteUsers={voteUsers}
                currentUserId={currentUser?.userId}
                currentUserColor={voting.userColor}
                currentUserName={currentUser?.name || "You"}
                hasUserVoted={hasUserVotedForCluster}
                onClusterClick={(clusterId) => {
                  // Simplified vote - just pass cluster ID
                  voting.toggleVote(clusterId, { x: 0, y: 0 });
                }}
                onDragStart={() => {
                  draggingClusterRef.current = el.id;
                  board.startDrag();
                }}
                onDrag={(dx, dy) => {
                  const newPos = {
                    x: el.position.x + dx,
                    y: el.position.y + dy,
                  };
                  board.updateElement(el.id, { position: newPos });

                  // Only move stickies that belong to this cluster
                  stickies.filter(s => s.clusterId === el.id).forEach(sticky => {
                    const newStickyPos = {
                      x: sticky.position.x + dx,
                      y: sticky.position.y + dy,
                    };
                    board.updateElement(sticky.id, { position: newStickyPos });
                  });
                }}
                onDragEnd={(finalX, finalY) => {
                  board.updateElement(el.id, {
                    position: { x: finalX, y: finalY }
                  });

                  // Move all stickies belonging to this cluster
                  stickies.filter(s => s.clusterId === el.id).forEach(sticky => {
                    const dx = finalX - el.position.x;
                    const dy = finalY - el.position.y;
                    board.updateElement(sticky.id, {
                      position: {
                        x: sticky.position.x + dx,
                        y: sticky.position.y + dy
                      }
                    });
                    if (hasMapId) {
                      throttledBroadcast(sticky.id, "sticky", "move", {
                        x: sticky.position.x + dx,
                        y: sticky.position.y + dy
                      });
                    }
                  });

                  if (hasMapId) {
                    throttledBroadcast(el.id, "label", "move", { x: finalX, y: finalY });
                  }
                  setDraggingStickyId(null);
                  draggingClusterRef.current = null;
                  board.endDrag();
                }}
                onLabelChange={(newLabel) => {
                  board.updateElement(el.id, { text: newLabel });
                  if (hasMapId) {
                    throttledBroadcast(el.id, "label", "update", el.position, undefined, { text: newLabel });
                  }
                }}
                onSelect={handleSelectWithLock}
                onRemoveSticky={(stickyId) => {
                  board.updateElement(stickyId, { clusterId: null, parentSectionId: null });
                  if (hasMapId) {
                    throttledBroadcast(stickyId, "sticky", "update", undefined, undefined, { clusterId: null, parentSectionId: null });
                  }
                }}
                onStickyClick={(stickyId) => {
                  board.selectElement(stickyId);
                }}
                onDrop={(stickyId) => {
                  board.updateElement(stickyId, { clusterId: el.id, parentSectionId: el.id });
                  if (hasMapId) {
                    throttledBroadcast(stickyId, "sticky", "update", undefined, undefined, { clusterId: el.id, parentSectionId: el.id });
                  }
                  setDraggingStickyId(null);
                }}
                onContextMenu={(e, clusterId) => {
                  setClusterContextMenu({ position: { x: e.clientX, y: e.clientY }, clusterId });
                }}
                onResize={(clusterId, newHeight) => {
                  board.updateElement(clusterId, { height: newHeight });
                }}
                onOpenAIRename={(clusterId) => {
                  setSelectedClusterForRename(clusterId);
                  setShowAIRenameDialog(true);
                }}
                triggerEdit={renameSectionId === el.id}
                triggerAutoFit={autoFitSectionId === el.id}
              />
            );
          })}
        </div>
      </div>

      {/* ── Cluster Context Menu ── */}
      {clusterContextMenu && (() => {
        const cluster = state.elements[clusterContextMenu.clusterId] as ClusterLabelData;
        
        return (
          <ClusterContextMenu
            isOpen={!!clusterContextMenu}
            position={clusterContextMenu.position}
            clusterId={clusterContextMenu.clusterId}
            clusterTitle={cluster?.text || "Untitled Cluster"}
            stickyTexts={[]}
            onClose={() => setClusterContextMenu(null)}
            onRename={(newName) => {
              board.updateElement(clusterContextMenu.clusterId, { text: newName });
              toast.success(`Renamed to "${newName}"`);
              setClusterContextMenu(null);
            }}
            onAutoFit={() => {
              setAutoFitSectionId(clusterContextMenu.clusterId);
              toast.success("Cluster resized to fit content");
              setClusterContextMenu(null);
              setTimeout(() => setAutoFitSectionId(null), 100);
            }}
            onDelete={() => {
              const clusterId = clusterContextMenu.clusterId;
              
              stickies.forEach(sticky => {
                if (sticky.clusterId === clusterId || sticky.parentSectionId === clusterId) {
                  board.updateElement(sticky.id, { 
                    clusterId: null, 
                    parentSectionId: null 
                  });
                  if (hasMapId) {
                    throttledBroadcast(sticky.id, "sticky", "update", undefined, undefined, { 
                      clusterId: null, 
                      parentSectionId: null 
                    });
                  }
                }
              });
              
              board.deleteElement(clusterId);
              setClusterContextMenu(null);
            }}
          />
        );
      })()}

      {/* ── AI Rename Dialog ── */}
      {showAIRenameDialog && selectedClusterForRename && (() => {
        const cluster = state.elements[selectedClusterForRename] as ClusterLabelData;
        const clusterStickies = stickies.filter(s => s.clusterId === selectedClusterForRename);
        const stickyTexts = clusterStickies.map(s => s.content || "");
        
        return (
          <ClusterAIRename
            isOpen={showAIRenameDialog}
            onClose={() => {
              setShowAIRenameDialog(false);
              setSelectedClusterForRename(null);
            }}
            clusterId={selectedClusterForRename}
            clusterTitle={cluster?.text || "Untitled Cluster"}
            stickyTexts={stickyTexts}
            onRename={(id, newName) => {
              board.updateElement(id, { text: newName });
              toast.success(`Renamed to "${newName}"`);
              setShowAIRenameDialog(false);
              setSelectedClusterForRename(null);
            }}
          />
        );
      })()}

      {/* ── Toolbar ── */}
      <FigJamToolbar
        activeTool={state.activeTool}
        zoom={state.zoom}
        onToolChange={board.setTool}
        onZoomIn={() => board.setZoom(state.zoom * 1.2)}
        onZoomOut={() => board.setZoom(state.zoom / 1.2)}
        onZoomReset={() => { board.setZoom(1); board.setPan({ x: 0, y: 0 }); }}
        onBack={onBack}
        ungroupedCount={ungroupedStickies.length}
        onToggleAIGroupingPanel={() => setShowAIGroupingPanel((v) => !v)}
        isCommentToolActive={isCommentToolActive}
        onToggleCommentTool={() => setIsCommentToolActive((v) => !v)}
        bubbleCount={commentBubbles.length + newBubbleCount}
        isPresentationModeActive={isPresentationModeActive}
        onTogglePresentationMode={() => setIsPresentationModeActive((v) => !v)}
        selectedCount={state.selectedIds.length}
        canvasRef={canvasRef}
        projectName={projectName}
        newInsightsCount={newInsightsCount}
        onImportInsights={handleImportInsights}
        isVotingActive={voting.isVoting}
        onCloseSidebar={() => setShowInsightsSidebar(false)}
        voting={{
          ...voting,
          myVotesCount: voting.myVotesCount,
          maxDotsPerUser: voting.session?.maxDotsPerUser ?? 5,
          userColor: voting.userColor,
          remainingTime: voting.remainingTime,
        }}
        voteResults={voteResults.map(r => ({
          clusterId: r.sectionId,
          title: r.title,
          voteCount: r.voteCount,
          color: r.colors[0] as string || "#3b82f6",
        }))}
        totalVotes={voteResults.reduce((sum, r) => sum + r.voteCount, 0)}
        onCreateCluster={(title) => {
          const position = {
            x: -state.pan.x + 400 + Math.random() * 100,
            y: -state.pan.y + 300 + Math.random() * 100,
          };
          const clusterId = board.addClusterLabel(position, { width: 400, height: 200 });
          board.updateElement(clusterId, { text: title });
          
          // Save to Convex
          if (hasMapId) {
            saveToConvex({
              mapId: mapId as Id<"affinityMaps">,
              elements: state.elements,
            });
          }
        }}
      />

      {/* ── MiniMap ── */}
      <MiniMap
        clusters={clusterElements}
        viewportPosition={state.pan}
        scale={state.zoom}
        viewportSize={{ 
          width: typeof window !== "undefined" ? window.innerWidth : 1200, 
          height: typeof window !== "undefined" ? window.innerHeight : 800 
        }}
        onNavigate={(x, y) => {
          board.setPan({ 
            x: -x * state.zoom + (window.innerWidth / 2), 
            y: -y * state.zoom + (window.innerHeight / 2) 
          });
        }}
      />

      {Object.keys(state.elements).length === 0 && (
        <div className="absolute inset-0 top-12 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-gray-300 text-4xl mb-3">✦</p>
            <p className="text-gray-400 text-sm font-medium">Appuyez sur S ou cliquez sur l&apos;outil sticky pour commencer</p>
            {newInsightsCount > 0 && (
              <p className="text-muted-foreground text-xs mt-2">
                {newInsightsCount} insight{newInsightsCount > 1 ? "s" : ""} available to import
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Comment Bubbles Layer ── */}
      <CommentBubblesLayer
        bubbles={commentBubbles}
        zoom={state.zoom}
        pan={state.pan}
        selectedBubbleId={selectedBubbleId}
        onBubbleClick={(id) => {
          setSelectedBubbleId(prev => prev === id ? null : id);
          // Stop bouncing animation when bubble is opened
          if (bouncingBubbleId === id) {
            setBouncingBubbleId(null);
          }
        }}
        onBubbleDelete={(id) => {
          deleteBubbleMutation({ bubbleId: id as Id<"commentBubbles"> });
          if (selectedBubbleId === id) {
            setSelectedBubbleId(null);
          }
        }}
        onBubblePositionChange={(id, position) => {
          updateBubblePositionMutation({ 
            bubbleId: id as Id<"commentBubbles">, 
            position 
          });
        }}
        mapId={mapId || ""}
        projectId={projectId || ""}
        presenceUsers={otherUsers?.map(u => ({
          id: u.userId,
          name: u.user?.name || "User",
        })) || []}
        currentUserId={userId ?? undefined}
        currentUserName={currentUserName}
        bouncingBubbleId={bouncingBubbleId}
      />

      {/* ── Presentation Mode ── */}
      <PresentationMode
        isActive={isPresentationModeActive}
        onClose={() => setIsPresentationModeActive(false)}
        groups={labels.map(l => ({
          id: l.id,
          title: l.text || "Untitled Cluster",
          position: l.position,
        }))}
        stickies={stickies}
        labels={labels}
        zoom={state.zoom}
        pan={state.pan}
        onZoomChange={(zoom) => board.setZoom(zoom)}
        onPanChange={(pan) => board.setPan(pan)}
      />

      {/* ── Comment Tool Cursor ── */}
      {isCommentToolActive && cursorPos && (
        <div
          className="fixed pointer-events-none z-[60] transition-all duration-75"
          style={{
            left: cursorPos.x,
            top: cursorPos.y,
            transform: "translate(-50%, -50%)",
          }}
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg ring-2 ring-primary/30"
          >
            <MessageSquare className="w-5 h-5 text-primary-foreground" />
          </motion.div>
        </div>
      )}

      {/* ── Context Menu ── */}
      <LassoContextMenu
        selectedIds={contextMenu?.ids || []}
        position={contextMenu?.position || { x: 0, y: 0 }}
        isOpen={contextMenu !== null}
        onClose={() => setContextMenu(null)}
        onGroup={() => {
          board.groupSelectedIntoSection();
          setContextMenu(null);
        }}
        onDelete={() => {
          const ids = contextMenu?.ids || [];
          const count = ids.length;
          confirmDelete(
            `${count} item${count > 1 ? "s" : ""}`,
            count,
            async () => {
              ids.forEach(id => board.deleteElement(id));
            }
          );
          setContextMenu(null);
        }}
        onDuplicate={() => {
          contextMenu?.ids.forEach(id => board.duplicateElement(id));
          setContextMenu(null);
        }}
        onComment={() => {
          if (contextMenu?.ids.length && mapId) {
            const firstId = contextMenu.ids[0];
            const element = state.elements[firstId];
            
            let targetType: "sticky" | "label" | "canvas" = "canvas";
            let elementWidth = 200;
            
            if (element?.type === "sticky") {
              targetType = "sticky";
              elementWidth = (element as StickyNoteData).size?.width || 200;
            } else if (element?.type === "label") {
              targetType = "label";
            }
            
            const pos = element 
              ? { x: element.position.x + elementWidth / 2, y: element.position.y - 30 }
              : screenToCanvas(contextMenu.position.x, contextMenu.position.y);
            
            createBubbleMutation({
              mapId: mapId as Id<"affinityMaps">,
              position: pos,
              targetId: firstId,
              targetType,
              createdBy: userId || "",
              createdByName: currentUserName,
            }).catch(console.error);
          }
          setContextMenu(null);
        }}
        onLabel={() => {
          const pos = screenToCanvas(contextMenu?.position.x || 0, contextMenu?.position.y || 0);
          board.addClusterLabel({ x: pos.x, y: pos.y });
          setContextMenu(null);
        }}
        onMoveToCluster={() => {
          toast.info("Move to cluster feature coming soon");
          setContextMenu(null);
        }}
      />

      {/* ── Mention Toasts ── */}
      <MentionToastProvider
        setBouncingBubbleId={setBouncingBubbleId}
      />

    </div>
  );
}
