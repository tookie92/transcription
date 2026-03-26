"use client";

import React, { useCallback, useRef, useState, useEffect, useMemo } from "react";
import { useFigJamBoard } from "@/hooks/useFigJamBoard";
import { useContainment } from "@/hooks/useContainment";
import { StickyNote } from "./StickyNote";
import { Section } from "./Section";
import { FigJamToolbar } from "./FigJamToolbar";
import { VotingDock } from "./VotingDock";
import type { FigJamElement, Position, StickyColor, StickyNoteData, SectionData, DotData } from "@/types/figjam";
import { useAuth, useUser } from "@clerk/nextjs";
import { usePresence } from "@/hooks/usePresence";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { motion } from "framer-motion";
import { useThrottle } from "@/hooks/useThrottle";


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
          <circle cx={spacing / 2} cy={spacing / 2} r={1.5} fill="#d1d5db" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#figjam-grid)" />
    </svg>
  );
}

// ─── FigJamBoard ──────────────────────────────────────────────────────────────

interface FigJamBoardProps {
  projectName?: string;
  storageKey?: string;
  onChange?: (elements: Record<string, FigJamElement>) => void;
  initialElements?: Record<string, FigJamElement>;
  mapId?: string;
  maxVotesPerUser?: number;
  onToggleActivityPanel?: () => void;
  isActivityPanelOpen?: boolean;
  style?: React.CSSProperties;
}

export function FigJamBoard({
  projectName,
  storageKey = "figjam-default",
  onChange,
  initialElements,
  mapId,
  maxVotesPerUser = 10,
  style,
}: FigJamBoardProps) {
  const board = useFigJamBoard();
  const { state } = board;

  const [isLoaded, setIsLoaded] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  
  // Track last saved elements to prevent save loops
  const lastSavedElementsRef = useRef<string>("");
  // Track last processed movement timestamp to avoid duplicates
  const lastProcessedTimestampRef = useRef<number>(0);

  const [draggingStickyId, setDraggingStickyId] = useState<string | null>(null);

  const [lassoStart, setLassoStart] = useState<Position | null>(null);
  const [lassoEnd, setLassoEnd] = useState<Position | null>(null);
  const isLassoing = lassoStart !== null;

  const [renameSectionId, setRenameSectionId] = useState<string | null>(null);
  const [votingConfig, setVotingConfig] = useState({
    dotsPerUser: 5,
    durationMinutes: null as number | null,
  });
  const [isVotingActive, setIsVotingActive] = useState(false);
  const [usedDots, setUsedDots] = useState(0);
  const [showStickyPicker, setShowStickyPicker] = useState(false);

  // ── Presence (cursors) ───────────────────────────────────────────────────
  const { userId } = useAuth();
  const { user } = useUser();
  const hasMapId = !!mapId;
  const currentUserName = user?.fullName || user?.firstName || "Anonymous";
  
  const CURSOR_COLORS = [
    "#ef4444", "#f97316", "#eab308", "#22c55e",
    "#14b8a6", "#3b82f6", "#8b5cf6", "#ec4899",
  ];
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

  // ============================================
  // CONvex - Load/Save FigJam Elements
  // ============================================
  const updatePresence = usePresence(hasMapId ? (mapId as Id<"affinityMaps">) : "");
  
  // Query: Get other users' presence (cursors, selections)
  const otherUsers = useQuery(
    api.presence.getByMap,
    hasMapId ? { mapId: mapId as Id<"affinityMaps"> } : "skip"
  );

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
    elementType: "sticky" | "section" | "dot",
    action: "move" | "resize" | "update",
    position?: { x: number; y: number },
    size?: { width: number; height: number },
    patch?: any
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
    
    // Apply movements from other users (skip if older than what we have)
    for (const movement of recentMovements) {
      // Skip our own movements
      if (movement.userId === userId) continue;
      
      // Skip old movements
      if (movement.timestamp <= lastProcessedTimestampRef.current) continue;
      lastProcessedTimestampRef.current = movement.timestamp;
      
      // Skip if element was deleted locally
      const element = state.elements[movement.elementId];
      if (!element) continue;
      
      // Apply the movement update
      if (movement.action === "move" && movement.position) {
        board.updateElement(movement.elementId, {
          position: movement.position,
        } as any);
      } else if (movement.action === "resize" && movement.size) {
        board.updateElement(movement.elementId, {
          size: movement.size,
        } as any);
      } else if (movement.action === "update" && movement.patch) {
        board.updateElement(movement.elementId, movement.patch as any);
      }
    }
  }, [recentMovements, userId]);

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
  const allSections = Object.values(state.elements).filter(
    (el): el is SectionData => el.type === "section"
  );

  // ── Containment ─────────────────────────────────────────────────────
  useContainment({
    elements: state.elements,
    onResizeSection: (sectionId, size) => {
      board.updateElement(sectionId, { size } as any);
    },
  });

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

      if (state.activeTool === "section") {
        const pos = screenToCanvas(e.clientX, e.clientY);
        const sectionId = board.addSection({ x: pos.x - 240, y: pos.y - 160 });
        if (hasMapId && mapId) {
          try {
            logActivity({
              mapId: mapId as Id<"affinityMaps">,
              action: "section_created",
              targetId: sectionId,
              targetName: "Section",
            });
          } catch (err) {
            console.error("Failed to log activity:", err);
          }
        }
        board.setTool("select");
      }
    },
    [state.activeTool, state.pan, board, screenToCanvas, isSpacePressed]
  );

  const handleCanvasPointerMove = useCallback(
    (e: React.PointerEvent) => {
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
    [board, isLassoing, screenToCanvas, hasMapId, updatePresence, state.selectedIds]
  );

  const handleCanvasPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (isLassoing && lassoStart && lassoEnd) {
        const minX = Math.min(lassoStart.x, lassoEnd.x);
        const maxX = Math.max(lassoStart.x, lassoEnd.x);
        const minY = Math.min(lassoStart.y, lassoEnd.y);
        const maxY = Math.max(lassoStart.y, lassoEnd.y);
        
        allStickies.forEach((sticky) => {
          const sRight = sticky.position.x + 200;
          const sBottom = sticky.position.y + 200;
          
          const intersects = !(sRight < minX || sticky.position.x > maxX || sBottom < minY || sticky.position.y > maxY);
          
          if (intersects) {
            board.selectElement(sticky.id, true);
          }
        });

        allSections.forEach((section) => {
          const sRight = section.position.x + section.size.width;
          const sBottom = section.position.y + section.size.height;
          
          const intersects = !(sRight < minX || section.position.x > maxX || sBottom < minY || section.position.y > maxY);
          
          if (intersects) {
            board.selectElement(section.id, true);
          }
        });
      }
      
      setLassoStart(null);
      setLassoEnd(null);
      isPanning.current = false;
    },
    [isLassoing, lassoStart, lassoEnd, allStickies, allSections, board]
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

      // Arrow keys for moving selected elements
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
        
        const selectedStickies = state.selectedIds
          .map((id) => state.elements[id])
          .filter((el): el is StickyNoteData => el?.type === "sticky");
        
        const patches = selectedStickies.map((sticky) => ({
          id: sticky.id,
          patch: {
            position: {
              x: sticky.position.x + dx,
              y: sticky.position.y + dy,
            },
          },
        }));
        
        if (patches.length > 0) {
          board.updateMany(patches as any);
        }

        const selectedSections = state.selectedIds
          .map((id) => state.elements[id])
          .filter((el): el is SectionData => el?.type === "section");

        selectedSections.forEach((section) => {
          board.moveSectionWithChildren(section.id, dx, dy);
        });

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
                  } else if (element.type === "section") {
                    logActivity({
                      mapId: mapId as Id<"affinityMaps">,
                      action: "section_deleted",
                      targetId: id,
                      targetName: (element as SectionData).title || "section",
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

  const sorted   = Object.values(state.elements).sort((a, b) => a.zIndex - b.zIndex);
  const sections = sorted.filter((el): el is SectionData    => el.type === "section");
  const others   = sorted.filter((el) => el.type !== "section");
  const stickies = others.filter((el): el is StickyNoteData => el.type === "sticky");
  const dots = sorted.filter((el): el is DotData => el.type === "dot");

  // Group dots by section and check if user already voted
  const dotsBySection: Record<string, DotData[]> = {};
  const userHasVotedOn: Record<string, boolean> = {};
  for (const dot of dots) {
    if (dot.parentSectionId) {
      if (!dotsBySection[dot.parentSectionId]) {
        dotsBySection[dot.parentSectionId] = [];
      }
      dotsBySection[dot.parentSectionId].push(dot);
      if (dot.ownerId === state.currentUserId) {
        userHasVotedOn[dot.parentSectionId] = true;
      }
    }
  }

  // Which section is the dragging sticky hovering over?
  const hoveredSectionId = draggingStickyId
    ? (() => {
        const sticky = state.elements[draggingStickyId] as StickyNoteData | undefined;
        if (!sticky) return null;

        const stickySize = sticky.size ?? { width: 200, height: 200 };

        for (const section of sections) {
          const sectionRight = section.position.x + section.size.width;
          const sectionBottom = section.position.y + section.size.height;

          const stickyCenterX = sticky.position.x + stickySize.width / 2;
          const stickyCenterY = sticky.position.y + stickySize.height / 2;

          const isInside =
            stickyCenterX > section.position.x &&
            stickyCenterX < sectionRight &&
            stickyCenterY > section.position.y + 40 &&
            stickyCenterY < sectionBottom;

          if (isInside) {
            return section.id;
          }
        }
        return null;
      })()
    : null;

  const attachedSectionId = draggingStickyId
    ? (() => {
        const sticky = state.elements[draggingStickyId] as StickyNoteData | undefined;
        if (!sticky || !sticky.parentSectionId) return null;
        return sections.find((s) => s.id === sticky.parentSectionId)?.id ?? null;
      })()
    : null;

  // Calculate drag bounds for stickies in auto-resize sections
  const getStickyDragBounds = (sticky: StickyNoteData) => {
    if (!sticky.parentSectionId) return undefined;
    const parentSection = state.elements[sticky.parentSectionId] as SectionData | undefined;
    if (!parentSection || parentSection.type !== "section") return undefined;
    if (!parentSection.autoResize) return undefined;
    const TITLE_BAR_H = 40;
    return {
      minX: parentSection.position.x,
      minY: parentSection.position.y + TITLE_BAR_H,
      maxX: parentSection.position.x + parentSection.size.width,
      maxY: parentSection.position.y + parentSection.size.height,
    };
  };

  const cursorStyle =
    state.activeTool === "hand"    ? "cursor-grab"
    : state.activeTool === "sticky"  ? "cursor-crosshair"
    : state.activeTool === "section" ? "cursor-crosshair"
    : isSpacePressed ? "cursor-grab"
    : "cursor-default";

  return (
    <div
      className="relative w-full h-full overflow-hidden bg-[#f5f5f0] select-none"
      style={{ fontFamily: "'DM Sans', system-ui, sans-serif", ...style }}
    >
      {/* ── Canvas ── */}
      <div
        ref={canvasRef}
        className={`absolute inset-0 ${cursorStyle}`}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={handleCanvasPointerUp}
      >
        <CanvasGrid zoom={state.zoom} pan={state.pan} />

        <div
          className="absolute origin-top-left lasso-area"
          style={{ transform: `translate(${state.pan.x}px, ${state.pan.y}px) scale(${state.zoom})` }}
        >
          {/* ── Remote cursors (inside transformed layer) ── */}
          {otherUsers
            ?.filter((u: any) => Date.now() - u.lastSeen < OFFLINE_THRESHOLD_MS)
            .map((userData: any) => (
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

          {/* ── Sections ── */}
          {sections.map((el) => (
            <Section
              key={el.id}
              section={el}
              dots={dotsBySection[el.id] || []}
              voteCount={(dotsBySection[el.id] || []).length}
              hasUserVoted={userHasVotedOn[el.id] ?? false}
              zoom={state.zoom}
              isSelected={state.selectedIds.includes(el.id)}
              isHovered={attachedSectionId === el.id}
              isVotingMode={isVotingActive}
              isLocked={getLockInfo(el.id).isLocked}
              lockedByName={getLockInfo(el.id).lockedByName}
              onSelect={handleSelectWithLock}
              onMoveWithChildren={(sectionId, dx, dy) => {
                board.moveSectionWithChildren(sectionId, dx, dy);
                const section = state.elements[sectionId] as any;
                if (section?.position) {
                  throttledBroadcast(sectionId, "section", "move", {
                    x: section.position.x + dx,
                    y: section.position.y + dy,
                  });
                }
              }}
              onMoveSelected={board.moveSelected}
              selectedIds={state.selectedIds}
              onUpdate={(id, patch) => {
                board.updateElement(id, patch as any);
                if (state.elements[id]) {
                  throttledBroadcast(id, "section", "update", patch.position, patch.size, patch);
                }
              }}
              onDelete={board.deleteElement}
              onArrangeSection={(sectionId) => board.autoArrange(sectionId)}
              renameTrigger={renameSectionId}
              onRemoveDot={(dotId) => {
                board.deleteElement(dotId);
                setUsedDots(u => Math.max(0, u - 1));
              }}
            />
          ))}

          {/* ── Sticky notes ── */}
          {stickies.map((el) => (
            <StickyNote
              key={el.id}
              note={el}
              zoom={state.zoom}
              isSelected={state.selectedIds.includes(el.id)}
              isLocked={getLockInfo(el.id).isLocked}
              lockedByName={getLockInfo(el.id).lockedByName}
              onSelect={handleSelectWithLock}
              onMove={(id, pos) => {
                board.moveSticky(id, pos);
                // Only broadcast if element still exists
                if (state.elements[id]) {
                  throttledBroadcast(id, "sticky", "move", pos);
                }
              }}
              onMoveSelected={board.moveSelected}
              selectedIds={state.selectedIds}
              isVotingMode={isVotingActive}
              onUpdate={(id, patch) => {
                board.updateElement(id, patch as any);
                // Only broadcast if element still exists
                if (state.elements[id]) {
                  throttledBroadcast(id, "sticky", "update", patch.position, patch.size, patch);
                }
              }}
              onDelete={board.deleteElement}
              onDuplicate={board.duplicateElement}
              onBringToFront={board.bringToFront}
              onResize={(id, size) => {
                board.updateElement(id, { size } as any);
                if (state.elements[id]) {
                  throttledBroadcast(id, "sticky", "resize", undefined, size);
                }
              }}
              onDragStart={(id) => setDraggingStickyId(id)}
              onDragEnd={(id) => {
                if (hoveredSectionId) {
                  const sticky = state.elements[id] as StickyNoteData | undefined;
                  if (sticky) {
                    board.updateElement(id, { parentSectionId: hoveredSectionId } as any);
                  }
                }
                setDraggingStickyId(null);
              }}
              dragBounds={getStickyDragBounds(el)}
            />
          ))}
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
        onAddSection={() => {
          const sectionId = board.addSection({ x: 100 / state.zoom, y: 100 / state.zoom });
          if (hasMapId && mapId) {
            try {
              logActivity({
                mapId: mapId as Id<"affinityMaps">,
                action: "section_created",
                targetId: sectionId,
                targetName: "Section",
              });
            } catch (err) {
              console.error("Failed to log activity:", err);
            }
          }
        }}
        onGroupSelected={() => board.groupSelectedIntoSection()}
        selectedCount={state.selectedIds.length}
        votingConfig={votingConfig}
        onVotingConfigChange={setVotingConfig}
        isVotingActive={isVotingActive}
        onStartVoting={() => {
          // Clear previous vote dots before starting new vote
          dots.forEach((dot) => board.deleteElement(dot.id));
          setUsedDots(0);
          setIsVotingActive(true);
        }}
        onEndVoting={() => setIsVotingActive(false)}
      />

      {/* Voting Dock */}
      <VotingDock
        isActive={isVotingActive}
        dotsPerUser={votingConfig.dotsPerUser}
        usedDots={usedDots}
        userColor="#22c55e"
        disabledSections={userHasVotedOn}
        onReset={() => setUsedDots(0)}
        onDropDot={(sectionId) => {
          if (userHasVotedOn[sectionId]) return;
          const section = state.elements[sectionId] as SectionData;
          if (section) {
            const TITLE_BAR_H = 40;
            const PADDING = 20;
            const dotSize = 28;
            const maxX = section.size.width - PADDING - dotSize;
            const maxY = section.size.height - TITLE_BAR_H - PADDING - dotSize;
            const dotX = section.position.x + PADDING + Math.random() * maxX;
            const dotY = section.position.y + TITLE_BAR_H + PADDING + Math.random() * maxY;
            board.addDot({ x: dotX, y: dotY }, sectionId, "#22c55e");
            setUsedDots(u => u + 1);
          }
        }}
        onRemoveDot={(sectionId) => {
          const sectionDots = dots.filter(d => d.parentSectionId === sectionId && d.ownerId === state.currentUserId);
          if (sectionDots.length > 0) {
            board.deleteElement(sectionDots[0].id);
            setUsedDots(u => Math.max(0, u - 1));
          }
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
    </div>
  );
}
