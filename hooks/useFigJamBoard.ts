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
} from "../types/figjam";
import { isInsideSection, isOutsideSection } from "./useContainment";

// ─── Helpers ────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 10);
const now = () => Date.now();

const DEFAULT_USER_ID = "local-user";
const MAX_VOTES = 5;
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
  | { type: "MOVE_SECTION_WITH_CHILDREN"; sectionId: string; dx: number; dy: number }
  | { type: "MOVE_STICKY"; stickyId: string; position: Position }
  | { type: "LOAD_ELEMENTS"; elements: Record<string, FigJamElement> }
  | { type: "UNDO" }
  | { type: "REDO" };

interface HistoryEntry {
  elements: Record<string, FigJamElement>;
  votesUsed: number;
}

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

      // Move section
      elements[action.sectionId] = {
        ...section,
        position: {
          x: section.position.x + action.dx,
          y: section.position.y + action.dy,
        },
        updatedAt: now(),
      };

      // Move only stickies that are ATTACHED to this section (by parentSectionId)
      const stickies = Object.values(elements).filter(
        (el): el is StickyNoteData => el.type === "sticky"
      );
      for (const sticky of stickies) {
        if (sticky.parentSectionId === action.sectionId) {
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

      return { ...state, elements };
    }

    case "MOVE_STICKY": {
      const sticky = state.elements[action.stickyId] as StickyNoteData | undefined;
      if (!sticky || sticky.type !== "sticky") return state;

      const elements = { ...state.elements };

      // Find which section (if any) this sticky is now inside
      const sections = Object.values(elements).filter(
        (el): el is SectionData => el.type === "section"
      );

      let newParentSectionId: string | null = null;

      // If sticky was attached, check if it's now fully outside (with threshold)
      if (sticky.parentSectionId) {
        const originalSection = elements[sticky.parentSectionId] as SectionData | undefined;
        if (originalSection && originalSection.type === "section") {
          const tempSticky = { ...sticky, position: action.position };
          // Still inside or partially overlapping? Keep attachment
          if (isInsideSection(tempSticky, originalSection)) {
            newParentSectionId = sticky.parentSectionId;
          }
          // Check if fully outside (with threshold) - detach
          else if (isOutsideSection(tempSticky, originalSection)) {
            newParentSectionId = null;
          }
          // In the gray zone - keep attached (so it can slide back in)
          else {
            newParentSectionId = sticky.parentSectionId;
          }
        }
      }

      // If not attached to original, check if entering a new section
      if (newParentSectionId === null) {
        for (const section of sections) {
          const tempSticky = { ...sticky, position: action.position };
          if (isInsideSection(tempSticky, section)) {
            newParentSectionId = section.id;
            break;
          }
        }
      }

      // Update sticky with new position and attachment status
      elements[action.stickyId] = {
        ...sticky,
        position: action.position,
        parentSectionId: newParentSectionId,
        updatedAt: now(),
      };

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
      if (!el || el.type !== "sticky") return state;
      if (el.votedBy.includes(action.userId)) return state;
      if (state.votesUsed >= state.maxVotesPerUser) return state;
      const updated = {
        ...el,
        votes: el.votes + 1,
        votedBy: [...el.votedBy, action.userId],
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
      if (!el || el.type !== "sticky") return state;
      if (!el.votedBy.includes(action.userId)) return state;
      const updated = {
        ...el,
        votes: Math.max(0, el.votes - 1),
        votedBy: el.votedBy.filter((uid: string) => uid !== action.userId),
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
        if (el.type === "sticky") {
          elements[key] = { ...el, votes: 0, votedBy: [], updatedAt: now() };
        }
      }
      return { ...state, elements, votesUsed: 0 };
    }

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
  };
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useFigJamBoard(): UseFigJamBoardReturn {
  const [state, baseDispatch] = useReducer(reducer, undefined, initialState);
  const historyRef = useRef<HistoryEntry[]>([]);
  const isUndoingRedoing = useRef(false);

  const pushToHistory = useCallback(() => {
    historyRef.current = [
      ...historyRef.current.slice(-MAX_HISTORY + 1),
      { elements: cloneElements(state.elements), votesUsed: state.votesUsed },
    ];
  }, [state.elements, state.votesUsed]);

  const dispatch = useCallback((action: Action) => {
    const modifiableActions = [
      "ADD_ELEMENT", "UPDATE_ELEMENT", "UPDATE_MANY", "DELETE_ELEMENT",
      "MOVE_SECTION_WITH_CHILDREN", "MOVE_STICKY", "RESET_VOTES"
    ];

    if (modifiableActions.includes(action.type) && !isUndoingRedoing.current) {
      pushToHistory();
    }

    baseDispatch(action);
  }, [pushToHistory]);

  const undo = useCallback(() => {
    if (historyRef.current.length === 0) return;
    const previous = historyRef.current[historyRef.current.length - 1];
    historyRef.current = historyRef.current.slice(0, -1);

    isUndoingRedoing.current = true;
    baseDispatch({ type: "LOAD_ELEMENTS", elements: previous.elements });
    isUndoingRedoing.current = false;
  }, []);

  const redo = useCallback(() => {
    // Redo not implemented - would need a separate "future" stack
  }, []);

  const canUndo = historyRef.current.length > 0;
  const canRedo = false;

  // ── Element creation ──────────────────────────────────────────────────────

  const addStickyNote = useCallback(
    (pos: Position, color: StickyColor = "yellow"): string => {
      const id = uid();
      const element: FigJamElement = {
        id,
        type: "sticky",
        position: pos,
        color,
        content: "",
        author: DEFAULT_USER_ID,
        votes: 0,
        votedBy: [],
        parentSectionId: null, // free-floating by default
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
        zIndex: 0, // sections live behind
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

  return {
    state,
    addStickyNote,
    addSection,
    updateElement,
    updateMany,
    deleteElement,
    duplicateElement,
    selectElement,
    clearSelection,
    castVote,
    removeVote,
    resetVotes,
    loadElements,
    setZoom,
    setPan,
    setTool,
    bringToFront,
    sendToBack,
    moveSectionWithChildren,
    moveSticky,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
