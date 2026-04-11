"use client";

import { useCallback, useReducer, useRef } from "react";
import type {
  BoardState,
  FigJamElement,
  Position,
  Size,
  SectionData,
  StickyNoteData,
  StickyColor,
  ToolType,
  UseFigJamBoardReturn,
  DotData,
  ClusterLabelData,
} from "../types/figjam";
import { isInsideSection, isOutsideSection } from "./useContainment";

// ─── Helpers ────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 10);
const now = () => Date.now();

const DEFAULT_USER_ID = "local-user";
const MAX_VOTES = 10;
const MAX_HISTORY = 50;

// ─── Reducer ────────────────────────────────────────────────────────────────

type Action =
  | { type: "ADD_ELEMENT"; element: FigJamElement }
  | { type: "UPDATE_ELEMENT"; id: string; patch: Partial<FigJamElement> }
  | { type: "UPDATE_MANY"; patches: { id: string; patch: Partial<FigJamElement> }[] }
  | { type: "DELETE_ELEMENT"; id: string }
  | { type: "SELECT"; id: string; multi: boolean }
  | { type: "CLEAR_SELECTION" }
  | { type: "SET_TOOL"; tool: ToolType }
  | { type: "SET_PAN"; pan: Position }
  | { type: "SET_ZOOM"; zoom: number }
  | { type: "BRING_FRONT"; id: string }
  | { type: "SEND_BACK"; id: string }
  | { type: "CAST_VOTE"; id: string; userId: string }
  | { type: "REMOVE_VOTE"; id: string; userId: string }
  | { type: "RESET_VOTES" }
  | { type: "SET_VOTING_MODE"; active: boolean }
  | { type: "REVEAL_VOTES" }
  | { type: "SET_VOTES_REVEALED"; revealed: boolean }
  | { type: "MOVE_SECTION_WITH_CHILDREN"; sectionId: string; dx: number; dy: number }
  | { type: "MOVE_STICKY"; stickyId: string; position: Position }
  | { type: "MOVE_SELECTED"; ids: string[]; dx: number; dy: number }
  | { type: "LOAD_ELEMENTS"; elements: Record<string, FigJamElement> }
  | { type: "UNDO" }
  | { type: "REDO" };

// HistoryEntry kept for reference but using BoardState directly now
// interface HistoryEntry {
//   elements: Record<string, FigJamElement>;
//   votesUsed: number;
//   wasJustAdded?: string;
// }

function maxZIndex(elements: Record<string, FigJamElement>): number {
  const vals = Object.values(elements).map((e) => e.zIndex);
  return vals.length ? Math.max(...vals) : 0;
}

function cloneElements(elements: Record<string, FigJamElement>): Record<string, FigJamElement> {
  return JSON.parse(JSON.stringify(elements));
}

function reducer(state: BoardState, action: Action): BoardState {
  switch (action.type) {
    case "ADD_ELEMENT": {
      console.log("[REDUCER] ADD_ELEMENT called, element type:", action.element.type, "id:", action.element.id);
      const elements = { ...state.elements, [action.element.id]: action.element };
      return { ...state, elements, selectedIds: [action.element.id] };
    }

    case "UPDATE_ELEMENT": {
      const el = state.elements[action.id];
      if (!el) return state;
      const updated = { ...el, ...action.patch, updatedAt: now() } as FigJamElement;
      return { ...state, elements: { ...state.elements, [action.id]: updated } };
    }

    case "DELETE_ELEMENT": {
      const elements = { ...state.elements };
      const deletedElement = elements[action.id];
      
      // If deleting a section, detach all stickies attached to it
      if (deletedElement?.type === "section") {
        const stickies = Object.values(elements).filter(
          (el): el is StickyNoteData => el.type === "sticky"
        );
        for (const sticky of stickies) {
          if (sticky.parentSectionId === action.id) {
            elements[sticky.id] = { ...sticky, parentSectionId: null };
          }
        }
      }
      
      delete elements[action.id];
      return {
        ...state,
        elements,
        selectedIds: state.selectedIds.filter((id) => id !== action.id),
      };
    }

    case "SELECT": {
      if (action.multi) {
        const already = state.selectedIds.includes(action.id);
        return {
          ...state,
          selectedIds: already
            ? state.selectedIds.filter((id) => id !== action.id)
            : [...state.selectedIds, action.id],
        };
      }
      return { ...state, selectedIds: [action.id] };
    }

    case "CLEAR_SELECTION":
      return { ...state, selectedIds: [] };

    case "SET_TOOL":
      return { ...state, activeTool: action.tool, selectedIds: [] };

    case "SET_PAN":
      return { ...state, pan: action.pan };

    case "SET_ZOOM":
      return { ...state, zoom: Math.min(4, Math.max(0.1, action.zoom)) };

    case "UPDATE_MANY": {
      const elements = { ...state.elements };
      for (const { id, patch } of action.patches) {
        if (elements[id]) {
          elements[id] = { ...elements[id], ...patch, updatedAt: now() } as FigJamElement;
        }
      }
      return { ...state, elements };
    }

    case "MOVE_SECTION_WITH_CHILDREN": {
      const section = state.elements[action.sectionId] as SectionData | undefined;
      if (!section || section.type !== "section") return state;

      const elements = { ...state.elements };

      // Move section - sticky positions are relative, so they don't need to be updated
      elements[action.sectionId] = {
        ...section,
        position: {
          x: section.position.x + action.dx,
          y: section.position.y + action.dy,
        },
        updatedAt: now(),
      };

      // Note: Stickies use relativePosition, so their display position
      // automatically follows the section. No need to update sticky positions.

      return { ...state, elements };
    }

    case "MOVE_STICKY": {
      const sticky = state.elements[action.stickyId] as StickyNoteData | undefined;
      if (!sticky || sticky.type !== "sticky") return state;

      const elements = { ...state.elements };
      const sections = Object.values(elements).filter(
        (el): el is SectionData => el.type === "section"
      );

      // action.position is always absolute
      const newAbsolutePosition = action.position;

      // Check if sticky is leaving its current section
      let newParentSectionId: string | null = sticky.parentSectionId;
      if (sticky.parentSectionId) {
        const parentSection = elements[sticky.parentSectionId] as SectionData;
        const tempSticky = { ...sticky, position: newAbsolutePosition };
        if (isOutsideSection(tempSticky, parentSection)) {
          newParentSectionId = null;
        }
      }

      // Check if sticky is entering a new section
      if (!newParentSectionId) {
        for (const section of sections) {
          const tempSticky = { ...sticky, position: newAbsolutePosition };
          if (isInsideSection(tempSticky, section)) {
            newParentSectionId = section.id;
            break;
          }
        }
      }

      // Update sticky based on its new attachment status
      if (newParentSectionId) {
        // Sticky is in a section - calculate and store relative position
        const parentSection = elements[newParentSectionId] as SectionData;
        const relativePosition = {
          x: newAbsolutePosition.x - parentSection.position.x,
          y: newAbsolutePosition.y - parentSection.position.y,
        };

        elements[action.stickyId] = {
          ...sticky,
          position: newAbsolutePosition, // Keep absolute for backwards compat
          relativePosition,
          parentSectionId: newParentSectionId,
          updatedAt: now(),
        };
      } else {
        // Sticky is free-floating - use absolute position
        elements[action.stickyId] = {
          ...sticky,
          position: newAbsolutePosition,
          relativePosition: undefined,
          parentSectionId: null,
          updatedAt: now(),
        };
      }

      return { ...state, elements };
    }

    case "MOVE_SELECTED": {
      const elements = { ...state.elements };
      const sections = Object.values(elements).filter(
        (el): el is SectionData => el.type === "section"
      );

      const sectionsBeingMoved = new Set<string>();
      const stickiesBeingMoved = new Set<string>();
      
      for (const id of action.ids) {
        const el = elements[id];
        if (!el) continue;
        
        if (el.type === "section") {
          sectionsBeingMoved.add(id);
          const section = el as SectionData;
          elements[id] = {
            ...section,
            position: {
              x: section.position.x + action.dx,
              y: section.position.y + action.dy,
            },
            updatedAt: now(),
          };
        } else if (el.type === "sticky") {
          stickiesBeingMoved.add(id);
          const sticky = el as StickyNoteData;
          const newPos = {
            x: sticky.position.x + action.dx,
            y: sticky.position.y + action.dy,
          };
          const tempSticky = { ...sticky, position: newPos };

          let newParentSectionId: string | null = sticky.parentSectionId;

          if (sticky.parentSectionId) {
            const parentSection = elements[sticky.parentSectionId] as SectionData | undefined;
            if (parentSection && parentSection.type === "section") {
              if (isOutsideSection(tempSticky, parentSection)) {
                newParentSectionId = null;
              }
            }
          }

          if (!newParentSectionId) {
            for (const section of sections) {
              if (isInsideSection(tempSticky, section)) {
                newParentSectionId = section.id;
                break;
              }
            }
          }

          elements[id] = {
            ...sticky,
            position: newPos,
            parentSectionId: newParentSectionId,
            updatedAt: now(),
          };
        }
      }

      sectionsBeingMoved.forEach((sectionId) => {
        const stickies = Object.values(elements).filter(
          (el): el is StickyNoteData => el.type === "sticky"
        );
        for (const sticky of stickies) {
          if (sticky.parentSectionId === sectionId && !stickiesBeingMoved.has(sticky.id)) {
            elements[sticky.id] = {
              ...sticky,
              position: {
                x: sticky.position.x + action.dx,
                y: sticky.position.y + action.dy,
              },
              updatedAt: now(),
            };
          }
        }

        const dots = Object.values(elements).filter(
          (el): el is DotData => el.type === "dot"
        );
        for (const dot of dots) {
          if (dot.parentSectionId === sectionId) {
            elements[dot.id] = {
              ...dot,
              position: {
                x: dot.position.x + action.dx,
                y: dot.position.y + action.dy,
              },
              updatedAt: now(),
            };
          }
        }
      });

      return { ...state, elements };
    }

    case "BRING_FRONT": {
      const newZ = maxZIndex(state.elements) + 1;
      const el = state.elements[action.id];
      if (!el) return state;
      return {
        ...state,
        elements: { ...state.elements, [action.id]: { ...el, zIndex: newZ } },
      };
    }

    case "SEND_BACK": {
      const el = state.elements[action.id];
      if (!el) return state;
      return {
        ...state,
        elements: { ...state.elements, [action.id]: { ...el, zIndex: 0 } },
      };
    }

    case "CAST_VOTE": {
      const el = state.elements[action.id] as any;
      // Vote on sections only (not stickies)
      if (!el || el.type !== "section") return state;
      const votedBy = el.votedBy ?? [];
      if (votedBy.includes(action.userId)) return state;
      if (state.votesUsed >= state.maxVotesPerUser) return state;
      const updated = {
        ...el,
        votes: (el.votes ?? 0) + 1,
        votedBy: [...votedBy, action.userId],
        updatedAt: now(),
      };
      return {
        ...state,
        votesUsed: state.votesUsed + 1,
        elements: { ...state.elements, [action.id]: updated },
      };
    }

    case "REMOVE_VOTE": {
      const el = state.elements[action.id] as any;
      // Vote on sections only (not stickies)
      if (!el || el.type !== "section") return state;
      const votedBy = el.votedBy ?? [];
      if (!votedBy.includes(action.userId)) return state;
      const updated = {
        ...el,
        votes: Math.max(0, (el.votes ?? 0) - 1),
        votedBy: votedBy.filter((uid: string) => uid !== action.userId),
        updatedAt: now(),
      };
      return {
        ...state,
        votesUsed: Math.max(0, state.votesUsed - 1),
        elements: { ...state.elements, [action.id]: updated },
      };
    }

    case "RESET_VOTES": {
      const elements = { ...state.elements };
      for (const key of Object.keys(elements)) {
        const el = elements[key] as any;
        if (el.type === "section") {
          elements[key] = { ...el, votes: 0, votedBy: [], updatedAt: now() };
        }
      }
      return { ...state, elements, votesUsed: 0, votingModeActive: false, votesRevealed: false };
    }

    case "SET_VOTING_MODE":
      return { ...state, votingModeActive: action.active, votesRevealed: action.active ? state.votesRevealed : false };

    case "REVEAL_VOTES":
      return { ...state, votesRevealed: true };

    case "SET_VOTES_REVEALED":
      return { ...state, votesRevealed: action.revealed };

    case "LOAD_ELEMENTS":
      return { ...state, elements: action.elements };

    case "UNDO":
    case "REDO":
      return state;

    default:
      return state;
  }
}

// ─── Initial State ───────────────────────────────────────────────────────────

function initialState(): BoardState {
  return {
    elements: {},
    selectedIds: [],
    activeTool: "select",
    pan: { x: 0, y: 0 },
    zoom: 1,
    currentUserId: DEFAULT_USER_ID,
    maxVotesPerUser: MAX_VOTES,
    votesUsed: 0,
    votingModeActive: false,
    votesRevealed: false,
  };
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useFigJamBoard(): UseFigJamBoardReturn {
  const [state, baseDispatch] = useReducer(reducer, undefined, initialState);
  
  // Ref to always have latest state (avoids closure issues)
  const stateRef = useRef(state);
  stateRef.current = state;
  
  // Complete state snapshots for history
  const historyRef = useRef<BoardState[]>([]);
  const futureRef = useRef<BoardState[]>([]);
  const isUndoingRedoingRef = useRef(false);
  const isLoadingRef = useRef(true);
  const isDraggingRef = useRef(false);
  const pendingDragSnapshotRef = useRef<BoardState | null>(null);

  // Actions that modify state and should be undoable
  const UNDOABLE_ACTIONS = new Set([
    "ADD_ELEMENT", "UPDATE_ELEMENT", "UPDATE_MANY", "DELETE_ELEMENT",
    "MOVE_SECTION_WITH_CHILDREN", "RESET_VOTES"
  ]);

  // Actions that use drag optimization (only save on drag end)
  const DRAG_ACTIONS = new Set(["MOVE_STICKY", "MOVE_SELECTED"]);

  // Mark loading as complete after first meaningful user action
  const markLoaded = useCallback(() => {
    isLoadingRef.current = false;
    console.log("[History] Board loaded, history tracking enabled. Elements:", Object.keys(stateRef.current.elements).length);
  }, []);

  // Call this when drag starts to prepare snapshot
  const startDrag = useCallback(() => {
    if (isLoadingRef.current || isUndoingRedoingRef.current) return;
    
    pendingDragSnapshotRef.current = {
      elements: cloneElements(stateRef.current.elements),
      selectedIds: [...stateRef.current.selectedIds],
      activeTool: stateRef.current.activeTool,
      pan: { ...stateRef.current.pan },
      zoom: stateRef.current.zoom,
      currentUserId: stateRef.current.currentUserId,
      maxVotesPerUser: stateRef.current.maxVotesPerUser,
      votesUsed: stateRef.current.votesUsed,
      votingModeActive: stateRef.current.votingModeActive,
      votesRevealed: stateRef.current.votesRevealed,
    };
    isDraggingRef.current = true;
  }, []);

  // Call this when drag ends to save to history
  const endDrag = useCallback(() => {
    if (!isDraggingRef.current) return;
    
    isDraggingRef.current = false;
    
    if (pendingDragSnapshotRef.current && !isLoadingRef.current && !isUndoingRedoingRef.current) {
      historyRef.current = [
        ...historyRef.current.slice(-MAX_HISTORY + 1),
        pendingDragSnapshotRef.current,
      ];
      futureRef.current = [];
    }
    pendingDragSnapshotRef.current = null;
  }, []);

  // Dispatch with history tracking - captures state BEFORE action
  const dispatch = useCallback((action: Action) => {
    // Handle drag actions specially - skip during drag, save on drag end
    if (DRAG_ACTIONS.has(action.type)) {
      if (!isDraggingRef.current) {
        // First drag action - save snapshot
        startDrag();
      }
      baseDispatch(action);
      return;
    }
    
    // Skip history for initial loading and undo/redo operations
    if (UNDOABLE_ACTIONS.has(action.type) && !isUndoingRedoingRef.current && !isLoadingRef.current) {
      const currentState = stateRef.current;
      const elementsBefore = Object.keys(currentState.elements).length;
      console.log(`[History] ${action.type}: ${elementsBefore} elements`);
      
      // Save complete state snapshot BEFORE action
      const stateSnapshot: BoardState = {
        elements: cloneElements(currentState.elements),
        selectedIds: [...currentState.selectedIds],
        activeTool: currentState.activeTool,
        pan: { ...currentState.pan },
        zoom: currentState.zoom,
        currentUserId: currentState.currentUserId,
        maxVotesPerUser: currentState.maxVotesPerUser,
        votesUsed: currentState.votesUsed,
        votingModeActive: currentState.votingModeActive,
        votesRevealed: currentState.votesRevealed,
      };
      
      historyRef.current = [
        ...historyRef.current.slice(-MAX_HISTORY + 1),
        stateSnapshot,
      ];
      futureRef.current = []; // Clear redo stack on new action
    }
    
    baseDispatch(action);
  }, [startDrag]);

  const undo = useCallback(() => {
    if (historyRef.current.length === 0) {
      console.log("[Undo] No history");
      return;
    }
    
    const previousState = historyRef.current[historyRef.current.length - 1];
    historyRef.current = historyRef.current.slice(0, -1);
    
    console.log(`[Undo] History size: ${historyRef.current.length}, will restore: ${Object.keys(previousState.elements).length}`);
    
    // Save current state to redo stack
    const currentState = stateRef.current;
    const currentSnapshot: BoardState = {
      elements: cloneElements(currentState.elements),
      selectedIds: [...currentState.selectedIds],
      activeTool: currentState.activeTool,
      pan: { ...currentState.pan },
      zoom: currentState.zoom,
      currentUserId: currentState.currentUserId,
      maxVotesPerUser: currentState.maxVotesPerUser,
      votesUsed: currentState.votesUsed,
      votingModeActive: currentState.votingModeActive,
      votesRevealed: currentState.votesRevealed,
    };
    futureRef.current = [...futureRef.current, currentSnapshot];
    
    isUndoingRedoingRef.current = true;
    baseDispatch({ type: "LOAD_ELEMENTS", elements: previousState.elements });
    isUndoingRedoingRef.current = false;
    
    console.log(`[Undo] Restored ${Object.keys(previousState.elements).length}, redo stack: ${futureRef.current.length}`);
  }, []);

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) {
      console.log("[Redo] Nothing to redo");
      return;
    }
    
    const nextState = futureRef.current[futureRef.current.length - 1];
    futureRef.current = futureRef.current.slice(0, -1);
    
    console.log(`[Redo] Will restore: ${Object.keys(nextState.elements).length}, history: ${historyRef.current.length}`);
    
    // Save current state to undo stack
    const currentState = stateRef.current;
    const currentSnapshot: BoardState = {
      elements: cloneElements(currentState.elements),
      selectedIds: [...currentState.selectedIds],
      activeTool: currentState.activeTool,
      pan: { ...currentState.pan },
      zoom: currentState.zoom,
      currentUserId: currentState.currentUserId,
      maxVotesPerUser: currentState.maxVotesPerUser,
      votesUsed: currentState.votesUsed,
      votingModeActive: currentState.votingModeActive,
      votesRevealed: currentState.votesRevealed,
    };
    historyRef.current = [...historyRef.current, currentSnapshot];
    
    isUndoingRedoingRef.current = true;
    baseDispatch({ type: "LOAD_ELEMENTS", elements: nextState.elements });
    isUndoingRedoingRef.current = false;
    
    console.log(`[Redo] Restored ${Object.keys(nextState.elements).length}, history: ${historyRef.current.length}`);
  }, []);

  const canUndo = historyRef.current.length > 0;
  const canRedo = futureRef.current.length > 0;

  // ── Element creation ──────────────────────────────────────────────────────

  const addStickyNote = useCallback(
    (pos: Position, color: StickyColor = "yellow", size: Size = { width: 200, height: 200 }, authorName?: string): string => {
      const id = uid();
      const element: FigJamElement = {
        id,
        type: "sticky",
        position: pos,
        color,
        content: "",
        author: DEFAULT_USER_ID,
        authorName: authorName || "Anonymous",
        source: color, // Use color as insight type (pain-point, quote, insight, follow-up)
        votes: 0,
        votedBy: [],
        parentSectionId: null,
        size,
        zIndex: maxZIndex(state.elements) + 1,
        createdAt: now(),
        updatedAt: now(),
      };
      dispatch({ type: "ADD_ELEMENT", element });
      return id;
    },
    [state.elements]
  );

  const addSection = useCallback(
    (pos: Position, size: Size = { width: 480, height: 320 }): string => {
      const id = uid();
      const element: FigJamElement = {
        id,
        type: "section",
        position: pos,
        size,
        title: "Section",
        color: "#e8f4fd",
        autoResize: false,
        votes: 0,
        votedBy: [],
        zIndex: 0,
        createdAt: now(),
        updatedAt: now(),
      };
      dispatch({ type: "ADD_ELEMENT", element });
      return id;
    },
    [state.elements]
  );

  const addClusterLabel = useCallback(
    (pos: Position, size?: { width: number; height: number }): string => {
      const id = uid();
      const element: ClusterLabelData = {
        id,
        type: "label",
        position: pos,
        text: "New Cluster",
        color: "#B8B4FF",
        fontSize: 13,
        width: size?.width ?? 500,
        height: size?.height ?? 300,
        zIndex: 1,
        createdAt: now(),
        updatedAt: now(),
      };
      dispatch({ type: "ADD_ELEMENT", element });
      return id;
    },
    [state.elements]
  );

  const addDot = useCallback(
    (pos: Position, parentSectionId: string | null, color: string): string => {
      const id = uid();
      const element: FigJamElement = {
        id,
        type: "dot",
        position: pos,
        parentSectionId,
        ownerId: DEFAULT_USER_ID,
        color,
        zIndex: 1000,
        createdAt: now(),
        updatedAt: now(),
      };
      dispatch({ type: "ADD_ELEMENT", element });
      return id;
    },
    [state.elements]
  );

  // ── Element operations ────────────────────────────────────────────────────

  const updateElement = useCallback(
    (id: string, patch: Partial<FigJamElement>) => {
      dispatch({ type: "UPDATE_ELEMENT", id, patch });
    },
    []
  );

  const deleteElement = useCallback((id: string) => {
    dispatch({ type: "DELETE_ELEMENT", id });
  }, []);

  const duplicateElement = useCallback(
    (id: string) => {
      const el = state.elements[id];
      if (!el) return;
      const newId = uid();
      const dup: FigJamElement = {
        ...el,
        id: newId,
        position: { x: el.position.x + 24, y: el.position.y + 24 },
        zIndex: maxZIndex(state.elements) + 1,
        createdAt: now(),
        updatedAt: now(),
      } as FigJamElement;
      dispatch({ type: "ADD_ELEMENT", element: dup });
    },
    [state.elements]
  );

  const updateMany = useCallback(
    (patches: { id: string; patch: Partial<FigJamElement> }[]) => {
      dispatch({ type: "UPDATE_MANY", patches });
    },
    []
  );

  const moveSectionWithChildren = useCallback(
    (sectionId: string, dx: number, dy: number) => {
      dispatch({ type: "MOVE_SECTION_WITH_CHILDREN", sectionId, dx, dy });
    },
    []
  );

  const moveSticky = useCallback((stickyId: string, position: Position) => {
    dispatch({ type: "MOVE_STICKY", stickyId, position });
  }, []);

  const moveSelected = useCallback((ids: string[], dx: number, dy: number) => {
    dispatch({ type: "MOVE_SELECTED", ids, dx, dy });
  }, []);

  // ── Selection ─────────────────────────────────────────────────────────────

  const selectElement = useCallback((id: string, multi = false) => {
    dispatch({ type: "SELECT", id, multi });
  }, []);

  const clearSelection = useCallback(() => {
    dispatch({ type: "CLEAR_SELECTION" });
  }, []);

  // ── Voting ────────────────────────────────────────────────────────────────

  const castVote = useCallback(
    (elementId: string) => {
      dispatch({ type: "CAST_VOTE", id: elementId, userId: state.currentUserId });
    },
    [state.currentUserId]
  );

  const removeVote = useCallback(
    (elementId: string) => {
      dispatch({ type: "REMOVE_VOTE", id: elementId, userId: state.currentUserId });
    },
    [state.currentUserId]
  );

  const resetVotes = useCallback(() => {
    dispatch({ type: "RESET_VOTES" });
  }, []);

  const revealVotes = useCallback(() => {
    dispatch({ type: "REVEAL_VOTES" });
  }, []);

  // ── Canvas ────────────────────────────────────────────────────────────────

  const setZoom = useCallback((zoom: number) => {
    dispatch({ type: "SET_ZOOM", zoom });
  }, []);

  const setPan = useCallback((pan: Position) => {
    dispatch({ type: "SET_PAN", pan });
  }, []);

  const setTool = useCallback((tool: ToolType) => {
    dispatch({ type: "SET_TOOL", tool });
  }, []);

  const bringToFront = useCallback((id: string) => {
    dispatch({ type: "BRING_FRONT", id });
  }, []);

  const sendToBack = useCallback((id: string) => {
    dispatch({ type: "SEND_BACK", id });
  }, []);

  // ── Load elements (e.g., from localStorage or DB) ────────────────────────
  const loadElements = useCallback((elements: Record<string, FigJamElement>) => {
    dispatch({ type: "LOAD_ELEMENTS", elements });
  }, []);

  // ── Group selected stickies into section ──────────────────────────────────

  const groupSelectedIntoSection = useCallback(
    (title = "New Group") => {
      if (state.selectedIds.length === 0) return null;

      const selectedStickies = state.selectedIds
        .map((id) => state.elements[id])
        .filter((el): el is StickyNoteData => el?.type === "sticky");

      if (selectedStickies.length === 0) return null;

      // Arrange stickies in a grid inside the section
      const spacing = 20;
      const STICKY_W = 200;
      const STICKY_H = 200;
      const SECTION_PADDING = 30;
      const TITLE_BAR_H = 40;
      const COLS = Math.max(1, Math.min(selectedStickies.length, 4));

      // Calculate section size based on grid
      const rows = Math.ceil(selectedStickies.length / COLS);
      const sectionWidth = SECTION_PADDING * 2 + COLS * STICKY_W + (COLS - 1) * spacing;
      const sectionHeight = TITLE_BAR_H + SECTION_PADDING * 2 + rows * STICKY_H + (rows - 1) * spacing;

      // Starting position for section (center the stickies)
      let minX = Infinity, minY = Infinity;
      for (const sticky of selectedStickies) {
        minX = Math.min(minX, sticky.position.x);
        minY = Math.min(minY, sticky.position.y);
      }
      const sectionPos = {
        x: minX - SECTION_PADDING,
        y: minY - SECTION_PADDING - TITLE_BAR_H,
      };

      // Create section with auto-resize ON
      const sectionId = uid();
      const section: FigJamElement = {
        id: sectionId,
        type: "section",
        position: sectionPos,
        size: { width: sectionWidth, height: sectionHeight },
        title,
        color: "#e8f4fd",
        autoResize: true, // Enable auto-resize by default
        votes: 0,
        votedBy: [],
        zIndex: 0,
        createdAt: now(),
        updatedAt: now(),
      };

      // Update stickies: attach to section AND arrange in grid
      const patches: { id: string; patch: Partial<FigJamElement> }[] = selectedStickies.map((sticky, i) => {
        const row = Math.floor(i / COLS);
        const col = i % COLS;
        return {
          id: sticky.id,
          patch: {
            parentSectionId: sectionId,
            position: {
              x: sectionPos.x + SECTION_PADDING + col * (STICKY_W + spacing),
              y: sectionPos.y + TITLE_BAR_H + SECTION_PADDING + row * (STICKY_H + spacing),
            },
          },
        };
      });

      // Dispatch all updates
      dispatch({ type: "ADD_ELEMENT", element: section });
      dispatch({ type: "UPDATE_MANY", patches });
      dispatch({ type: "CLEAR_SELECTION" });
      dispatch({ type: "SELECT", id: sectionId, multi: false });

      return sectionId;
    },
    [state.selectedIds, state.elements]
  );

  // ── Auto-arrange stickies ───────────────────────────────────────────────

  const autoArrange = useCallback(
    (sectionId?: string) => {
      let targetStickies = Object.values(state.elements).filter(
        (el): el is StickyNoteData => el.type === "sticky"
      );

      // If sectionId provided, only arrange stickies in that section
      if (sectionId) {
        targetStickies = targetStickies.filter((s) => s.parentSectionId === sectionId);
      }

      if (targetStickies.length === 0) return;

      const spacing = 30;
      const STICKY_W = 200;
      const STICKY_H = 200;
      const PADDING = 20;
      const COLS = Math.max(1, Math.floor((window.innerWidth * 0.8) / (STICKY_W + spacing)));

      const patches: { id: string; patch: Partial<FigJamElement> }[] = targetStickies.map((sticky, i) => {
        const row = Math.floor(i / COLS);
        const col = i % COLS;
        
        let baseX = 100;
        let baseY = 100;
        
        // If in a section, arrange relative to section position
        if (sectionId) {
          const section = state.elements[sectionId] as SectionData | undefined;
          if (section && section.type === "section") {
            baseX = section.position.x + PADDING;
            baseY = section.position.y + 60; // Below title bar
          }
        }

        return {
          id: sticky.id,
          patch: {
            position: {
              x: baseX + col * (STICKY_W + spacing),
              y: baseY + row * (STICKY_H + spacing),
            },
          },
        };
      });

      dispatch({ type: "UPDATE_MANY", patches });
    },
    [state.elements]
  );

  return {
    state,
    addStickyNote,
    addSection,
    addClusterLabel,
    updateElement,
    updateMany,
    deleteElement,
    duplicateElement,
    selectElement,
    clearSelection,
    castVote,
    removeVote,
    resetVotes,
    revealVotes,
    loadElements,
    setZoom,
    setPan,
    setTool,
    bringToFront,
    sendToBack,
    moveSectionWithChildren,
    moveSticky,
    moveSelected,
    undo,
    redo,
    canUndo,
    canRedo,
    markLoaded,
    startDrag,
    endDrag,
    groupSelectedIntoSection,
    autoArrange,
    addDot,
  };
}
