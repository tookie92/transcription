"use client";

import React, { useCallback, useRef, useState, useEffect, useMemo } from "react";
import { useFigJamBoard } from "@/hooks/useFigJamBoard";
import { StickyNote } from "./StickyNote";
import { ClusterLabel } from "./ClusterLabel";
import { FigJamToolbar } from "./FigJamToolbar";
import { AIGroupingPanel } from "./AIGroupingPanel";
import { StickyColorPicker } from "./StickyColorPicker";
import { LassoContextMenu } from "./ContextMenu";
import { CommentBubblesLayer } from "./CommentBubble";
import type { FigJamElement, Position, Size, StickyColor, StickyNoteData, DotData, ToolType, ClusterLabelData, SectionData, TextData } from "@/types/figjam";

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
import { toast } from "sonner";
import { MessageSquare } from "lucide-react";

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

  const isDraggingElement = useCallback((id: string) => {
    return draggingRef.current.has(id);
  }, []);

  const [draggingStickyId, setDraggingStickyId] = useState<string | null>(null);
  const draggingPositionRef = useRef<{ pos: Position; size: Size } | null>(null);

  const [lassoStart, setLassoStart] = useState<Position | null>(null);
  const [lassoEnd, setLassoEnd] = useState<Position | null>(null);
  const isLassoing = lassoStart !== null;

  const [renameSectionId, setRenameSectionId] = useState<string | null>(null);
  const [showStickyPicker, setShowStickyPicker] = useState(false);
  const [pendingStickyPosition, setPendingStickyPosition] = useState<Position | null>(null);
  const [showAIGroupingPanel, setShowAIGroupingPanel] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    position: { x: number; y: number };
    ids: string[];
  } | null>(null);

  // Comment bubbles state
  const [commentBubbles, setCommentBubbles] = useState<CommentBubbleData[]>([]);
  const [selectedBubbleId, setSelectedBubbleId] = useState<string | null>(null);
  const [isCommentToolActive, setIsCommentToolActive] = useState(false);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;
      const active = document.activeElement;
      if (active?.tagName === "INPUT" || active?.tagName === "TEXTAREA" || (active as HTMLElement)?.isContentEditable) return;

      const key = e.key.toLowerCase();
      
      // Tool shortcuts
      if (key === "v") {
        setTool("select");
      } else if (key === "h") {
        setTool("hand");
      } else if (key === "s") {
        setTool("sticky");
      } else if (key === "f") {
        setTool("section");
      } else if (key === "c") {
        setTool("label");
      } else if (key === "m") {
        setIsCommentToolActive(prev => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setTool]);

  // ── Presence (cursors) ───────────────────────────────────────────────────
  const { userId } = useAuth();
  const { user } = useUser();
  const currentUserName = user?.fullName || user?.firstName || "Anonymous";
  
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
  
  // Throttled save - only saves every 2 seconds to avoid too many writes to Convex
  const throttledSave = useThrottle((elements: Record<string, FigJamElement>) => {
    if (hasMapId) {
      saveToConvex({
        mapId: mapId as Id<"affinityMaps">,
        elements,
      });
    }
  }, 2000);
  
  // Throttled broadcast - sends movement updates every 200ms for real-time sync
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
      console.log("[FigJamBoard] Element locked by another user:", lock.userId);
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
  useEffect(() => {
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

    // Priority 3: localStorage (fallback for offline)
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Record<string, FigJamElement>;
        board.loadElements(parsed);
      } catch (e) {
        console.error("Failed to load board from localStorage:", e);
      }
    }
    
    // Mark as loaded even if nothing was loaded
    setIsLoaded(true);
  }, [savedElements, initialElements, storageKey]);

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
    
    // Always save to localStorage (instant)
    localStorage.setItem(storageKey, JSON.stringify(state.elements));
    
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

      if (state.activeTool === "sticky") {
        const pos = screenToCanvas(e.clientX, e.clientY);
        setPendingStickyPosition({ x: pos.x - 100, y: pos.y - 100 });
        setShowStickyPicker(true);
      }

      if (isCommentToolActive) {
        const pos = screenToCanvas(e.clientX, e.clientY);
        const newBubbleId = `comment-${Date.now()}`;
        const newBubble: CommentBubbleData = {
          id: newBubbleId,
          position: pos,
          targetType: "canvas",
          resolved: false,
        };
        setCommentBubbles(prev => [...prev, newBubble]);
        setSelectedBubbleId(newBubbleId);
        setIsCommentToolActive(false);
      }
    },
    [state.activeTool, state.pan, board, screenToCanvas, isSpacePressed, currentUserName, hasMapId, mapId, logActivity]
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
        case "s": case "S": 
          e.preventDefault();
          setShowStickyPicker((v) => !v);
          break;
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

  // Proximity grouping - find which label a sticky belongs to
  const PROXIMITY_RADIUS = 350; // px

  const getStickyCluster = useCallback((stickyPos: Position, stickySize: Size): string | null => {
    const stickyCenterX = stickyPos.x + stickySize.width / 2;
    const stickyCenterY = stickyPos.y + stickySize.height / 2;
    
    for (const label of labels) {
      const labelCenterX = label.position.x;
      const labelCenterY = label.position.y;
      const distance = Math.sqrt(
        Math.pow(stickyCenterX - labelCenterX, 2) + 
        Math.pow(stickyCenterY - labelCenterY, 2)
      );
      
      if (distance < PROXIMITY_RADIUS) {
        return label.id;
      }
    }
    return null;
  }, [labels]);

  // Ungrouped stickies - stickies not near any cluster label
  const ungroupedStickies = useMemo(() => {
    return stickies.filter((s) => {
      const clusterId = getStickyCluster(s.position, s.size ?? { width: 200, height: 200 });
      return clusterId === null;
    });
  }, [stickies, getStickyCluster]);

  // Handle creating a cluster from AI grouping suggestions
  const handleCreateClusterFromAI = useCallback((
    stickyIds: string[],
    title: string,
    position: Position
  ) => {
    // Cluster label position is the CENTER of the proximity zone
    // PROXIMITY_RADIUS = 350px - stickies must be within this distance from cluster label center
    const clusterId = board.addClusterLabel(position);
    
    // Update the cluster title
    board.updateElement(clusterId, { text: title });
    
    // Position stickies within the proximity radius (350px from cluster label)
    // Sticky center must be within this distance from cluster label
    const STICKY_SPACING_X = 220; // Horizontal spacing between sticky centers
    const STICKY_SPACING_Y = 160; // Vertical spacing - kept small to stay within radius
    const COLUMNS = 3;
    const FIRST_ROW_OFFSET = 40; // First row starts close to cluster label center
    
    stickyIds.forEach((stickyId, index) => {
      const col = index % COLUMNS;
      const row = Math.floor(index / COLUMNS);
      
      // Calculate offset from cluster label center
      const offsetX = (col - 1) * STICKY_SPACING_X;
      const offsetY = FIRST_ROW_OFFSET + row * STICKY_SPACING_Y;
      
      // Sticky position: top-left corner = center - half size
      // Cluster label is at (position.x, position.y) - this is the proximity center
      const stickyPosition = {
        x: position.x + offsetX - 100, // -100 centers the 200px wide sticky
        y: position.y + offsetY, // offset from cluster label center
      };
      
      // Get current sticky to preserve size
      const sticky = state.elements[stickyId];
      const size = (sticky && sticky.type === "sticky") 
        ? (sticky as StickyNoteData).size 
        : { width: 200, height: 200 };
      
      // Update sticky position
      board.updateElement(stickyId, { position: stickyPosition, size });
    });
    
    toast.success(`Created cluster "${title}" with ${stickyIds.length} stickies`);
  }, [board, state.elements]);

  // Get distance from sticky to nearest cluster (for highlight effect)
  const getDistanceToNearestCluster = useCallback((stickyPos: Position, stickySize: Size): { id: string; distance: number } | null => {
    const stickyCenterX = stickyPos.x + stickySize.width / 2;
    const stickyCenterY = stickyPos.y + stickySize.height / 2;
    
    let nearest: { id: string; distance: number } | null = null;
    
    for (const label of labels) {
      const labelCenterX = label.position.x;
      const labelCenterY = label.position.y;
      const distance = Math.sqrt(
        Math.pow(stickyCenterX - labelCenterX, 2) + 
        Math.pow(stickyCenterY - labelCenterY, 2)
      );
      
      if (!nearest || distance < nearest.distance) {
        nearest = { id: label.id, distance };
      }
    }
    
    return nearest;
  }, [labels]);

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
      className="relative w-full h-full overflow-hidden bg-[#f5f5f0] select-none"
      style={{ fontFamily: "'DM Sans', system-ui, sans-serif", ...style }}
    >
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
        className={`absolute inset-0 ${cursorStyle}`}
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
      >
        <CanvasGrid zoom={state.zoom} pan={state.pan} />

        <div
          className="absolute origin-top-left lasso-area"
          style={{ transform: `translate(${state.pan.x}px, ${state.pan.y}px) scale(${state.zoom})` }}
        >
          {/* ── Remote cursors (inside transformed layer) ── */}
          {/* In silent mode during voting, hide other users' cursors */}
          {voting.isSilentMode && voting.isVoting ? null : otherUsers
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
            const isDragging = draggingStickyId !== null;
            const nearestCluster = draggingPositionRef.current
              ? getDistanceToNearestCluster(
                  draggingPositionRef.current.pos,
                  draggingPositionRef.current.size
                )
              : null;
            const isHighlighted = isDragging && nearestCluster?.id === el.id;
            
            const clusterVotes = voting.getClusterVotes(el.id);
            const stickiesInThisCluster = stickies.filter(s => {
              const clusterId = getStickyCluster(s.position, s.size ?? { width: 200, height: 200 });
              return clusterId === el.id;
            });
            return (
              <ClusterLabel
                key={el.id}
                label={el}
                zoom={state.zoom}
                isSelected={state.selectedIds.includes(el.id)}
                isHighlighted={isHighlighted && nearestCluster?.id === el.id}
                highlightDistance={nearestCluster?.id === el.id ? nearestCluster.distance : 0}
                isLocked={getLockInfo(el.id).isLocked}
                isVotingMode={voting.isVoting}
                isRevealed={voting.isRevealed}
                votes={clusterVotes}
                userNames={userNamesMap}
                hasUserVoted={voting.myVotes.has(el.id)}
                userVotesRemaining={voting.getUserVotesRemaining()}
                stickiesInCluster={stickiesInThisCluster}
                projectContext={projectName ? `PROJECT NAME: ${projectName}` : undefined}
                onSelect={handleSelectWithLock}
                onMove={(id, pos) => {
                  board.updateElement(id, { position: pos });
                  if (hasMapId) {
                    throttledBroadcast(id, "label", "move", pos);
                  }
                }}
                onUpdate={(id, patch) => {
                  board.updateElement(id, patch);
                  if (hasMapId) {
                    throttledBroadcast(id, "label", "update", patch.position, undefined, patch);
                  }
                }}
                onDelete={board.deleteElement}
                onVote={voting.toggleVote}
              />
            );
          })}

          {/* ── All Sticky notes (flat canvas - no hierarchy) ── */}
          {stickies.map((el) => {
            const stickyClusterId = getStickyCluster(el.position, el.size ?? { width: 200, height: 200 });
            const stickyClusterLabel = stickyClusterId ? (labels.find(l => l.id === stickyClusterId)?.text || "Untitled") : undefined;
            
            return (
              <StickyNote
                key={el.id}
                note={el}
                zoom={state.zoom}
                isSelected={state.selectedIds.includes(el.id)}
                isLocked={getLockInfo(el.id).isLocked}
                lockedByName={getLockInfo(el.id).lockedByName}
                clusterLabel={stickyClusterLabel}
                onSelect={handleSelectWithLock}
                onMove={(id, pos) => {
                  board.moveSticky(id, pos);
                  if (state.elements[id]) {
                    throttledBroadcast(id, "sticky", "move", pos);
                  }
                  if (draggingStickyId === id) {
                    draggingPositionRef.current = {
                      pos,
                      size: state.elements[id]?.type === "sticky" 
                        ? state.elements[id].size 
                        : { width: 200, height: 200 }
                    };
                  }
                }}
                onMoveSelected={board.moveSelected}
                selectedIds={state.selectedIds}
                isVotingMode={voting.isVoting}
                onUpdate={(id, patch) => {
                  board.updateElement(id, patch);
                  if (state.elements[id]) {
                    throttledBroadcast(id, "sticky", "update", patch.position, patch.size, patch);
                  }
                }}
                onDelete={board.deleteElement}
                onDuplicate={board.duplicateElement}
                onBringToFront={board.bringToFront}
                onResize={(id, size) => {
                  board.updateElement(id, { size });
                  if (state.elements[id]) {
                    throttledBroadcast(id, "sticky", "resize", undefined, size);
                  }
                }}
                onDragStart={(id) => {
                  draggingRef.current.add(id);
                  setDraggingStickyId(id);
                  const el = state.elements[id];
                  if (el && el.type === "sticky") {
                    draggingPositionRef.current = { 
                      pos: el.position, 
                      size: el.size 
                    };
                  }
                }}
                onDragEnd={(id) => {
                  draggingRef.current.delete(id);
                  setDraggingStickyId(null);
                  draggingPositionRef.current = null;
                }}
              />
            );
          })}
        </div>
      </div>

      {/* ── Toolbar ── */}
      <FigJamToolbar
        activeTool={state.activeTool}
        zoom={state.zoom}
        onToolChange={board.setTool}
        onZoomIn={() => board.setZoom(state.zoom * 1.2)}
        onZoomOut={() => board.setZoom(state.zoom / 1.2)}
        onZoomReset={() => { board.setZoom(1); board.setPan({ x: 0, y: 0 }); }}
        showStickyPicker={showStickyPicker}
        onToggleStickyPicker={() => setShowStickyPicker((v) => !v)}
        onAddSticky={(color?: StickyColor) => {
          const stickyId = board.addStickyNote({ x: 200 / state.zoom, y: 200 / state.zoom }, color || "insight", { width: 200, height: 200 }, currentUserName);
          if (hasMapId && mapId) {
            try {
              logActivity({
                mapId: mapId as Id<"affinityMaps">,
                action: "sticky_created",
                targetId: stickyId,
                targetName: color || "insight",
                details: { color },
              });
            } catch (err) {
              console.error("Failed to log activity:", err);
            }
          }
          setShowStickyPicker(false);
        }}
        onGroupSelected={() => board.groupSelectedIntoSection()}
        onBack={onBack}
        ungroupedCount={ungroupedStickies.length}
        onToggleAIGroupingPanel={() => setShowAIGroupingPanel((v) => !v)}
        isCommentToolActive={isCommentToolActive}
        onToggleCommentTool={() => setIsCommentToolActive((v) => !v)}
        bubbleCount={commentBubbles.length}
        selectedCount={state.selectedIds.length}
        votingConfig={{ dotsPerUser: voting.session?.maxDotsPerUser ?? 5, durationMinutes: voting.session?.durationMinutes ?? null }}
        onVotingConfigChange={(config) => {}}
        isVotingActive={voting.isVoting}
        votingPhase={voting.session ? (voting.session.isActive ? "voting" : "revealed") : "setup"}
        isCreator={true}
        remainingTime={voting.remainingTime}
        voteResults={voteResults}
        onStartVoting={(dotsPerUser, duration) => {
          voting.startVoting({ dotsPerUser, durationMinutes: duration });
        }}
        onStopAndReveal={() => voting.stopVoting()}
        onStartNewVote={() => voting.startVoting({ dotsPerUser: voting.session?.maxDotsPerUser ?? 5, durationMinutes: voting.session?.durationMinutes ?? null })}
        isManualVotingMode={false}
      />

      {/* ── Sticky Color Picker ── */}
      <StickyColorPicker
        isOpen={showStickyPicker}
        onClose={() => {
          setShowStickyPicker(false);
          setPendingStickyPosition(null);
        }}
        onSelectColor={(color) => {
          if (pendingStickyPosition) {
            const stickyId = board.addStickyNote(
              pendingStickyPosition,
              color,
              { width: 200, height: 200 },
              currentUserName
            );
            if (hasMapId && mapId) {
              try {
                logActivity({
                  mapId: mapId as Id<"affinityMaps">,
                  action: "sticky_created",
                  targetId: stickyId,
                  targetName: color,
                });
              } catch (err) {
                console.error("Failed to log activity:", err);
              }
            }
            board.selectElement(stickyId);
            board.setTool("select");
          }
          setShowStickyPicker(false);
          setPendingStickyPosition(null);
        }}
      />

      {Object.keys(state.elements).length === 0 && (
        <div className="absolute inset-0 top-12 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-gray-300 text-4xl mb-3">✦</p>
            <p className="text-gray-400 text-sm font-medium">Click the sticky note tool to start</p>
            <p className="text-gray-300 text-xs mt-1">Or press S, Ctrl+scroll to zoom</p>
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
        }}
        onBubbleDelete={(id) => {
          setCommentBubbles(prev => prev.filter(b => b.id !== id));
          if (selectedBubbleId === id) {
            setSelectedBubbleId(null);
          }
        }}
        onBubblePositionChange={(id, position) => {
          setCommentBubbles(prev => prev.map(b => 
            b.id === id ? { ...b, position } : b
          ));
        }}
        mapId={mapId || ""}
        projectId={projectId || ""}
        presenceUsers={otherUsers?.map(u => ({
          id: u.userId,
          name: u.user?.name || "User",
        })) || []}
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
          contextMenu?.ids.forEach(id => board.deleteElement(id));
          setContextMenu(null);
        }}
        onDuplicate={() => {
          contextMenu?.ids.forEach(id => board.duplicateElement(id));
          setContextMenu(null);
        }}
        onComment={() => {
          if (contextMenu?.ids.length) {
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
            
            const newBubbleId = `comment-${Date.now()}`;
            const newBubble: CommentBubbleData = {
              id: newBubbleId,
              position: pos,
              targetId: firstId,
              targetType,
              resolved: false,
            };
            setCommentBubbles(prev => [...prev, newBubble]);
            setSelectedBubbleId(newBubbleId);
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

    </div>
  );
}
