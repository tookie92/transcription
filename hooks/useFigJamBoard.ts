"use client";

import { useCallback, useReducer, useRef, useState } from "react";
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
import { PACKET_EMPTY } from "@/lib/packetLayout";

// ─── Helpers ────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 10);
const now = () => Date.now();

const DEFAULT_USER_ID = "local-user";
const MAX_VOTES = 10;
const MAX_HISTORY = 50;

// ─── Reducer ────────────────────────────────────────────────────────────────

type Action =
  | { type: "ADD_ELEMENT"; element: FigJamElement }
  | { type: "UPDATE_ELEMENT"; id: string; patch: Partial<FigJamElement>; skipHistory?: boolean }
  | { type: "UPDATE_ELEMENT_NO_HISTORY"; id: string; patch: Partial<FigJamElement> }
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
  | { type: "HYDRATE"; state: BoardState }
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

function stampDoc(
  elements: Record<string, FigJamElement>,
  at: number
): Record<string, FigJamElement> {
  const next: Record<string, FigJamElement> = {};
  for (const [id, el] of Object.entries(elements)) {
    next[id] = { ...el, updatedAt: at };
  }
  return next;
}

function reducer(state: BoardState, action: Action): BoardState {
  switch (action.type) {
    case "ADD_ELEMENT": {
      // debugLog("[REDUCER] ADD_ELEMENT called, element type:", action.element.type, "id:", action.element.id);
      const elements = { ...state.elements, [action.element.id]: action.element };
      return { ...state, elements, selectedIds: [action.element.id] };
    }

    case "UPDATE_ELEMENT": {
      const el = state.elements[action.id];
      if (!el) return state;
      
      // Build new element by spreading the patch
      // If patch has editingBy: undefined or editingByName: undefined, delete them
      const patch = action.patch as Record<string, unknown>;
      const newEl = { ...el, updatedAt: now() };
      
      // Copy non-undefined properties from patch
      for (const key of Object.keys(patch)) {
        if (patch[key] !== undefined) {
          (newEl as Record<string, unknown>)[key] = patch[key];
        } else {
          // Delete the property if it exists and is being set to undefined
          delete (newEl as Record<string, unknown>)[key];
        }
      }
      
      return { ...state, elements: { ...state.elements, [action.id]: newEl as FigJamElement } };
    }

    case "UPDATE_ELEMENT_NO_HISTORY": {
      // Same as UPDATE_ELEMENT but without adding to history
      // This is for meta operations like locking, voting, etc.
      const el = state.elements[action.id];
      if (!el) return state;
      
      const patch = action.patch as Record<string, unknown>;
      const newEl = { ...el, updatedAt: now() };
      
      for (const key of Object.keys(patch)) {
        if (patch[key] !== undefined) {
          (newEl as Record<string, unknown>)[key] = patch[key];
        } else {
          delete (newEl as Record<string, unknown>)[key];
        }
      }
      
      return { ...state, elements: { ...state.elements, [action.id]: newEl as FigJamElement } };
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
      // Stickies cannot be selected - only clusters/labels
      const el = state.elements[action.id];
      if (el?.type === "sticky") {
        return state; // Prevent selecting stickies
      }
      
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
      if (state.pan.x === action.pan.x && state.pan.y === action.pan.y) {
        return state;
      }
      return { ...state, pan: action.pan };

    case "SET_ZOOM": {
      const zoom = Math.min(4, Math.max(0.1, action.zoom));
      if (state.zoom === zoom) return state;
      return { ...state, zoom };
    }

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
      const nonStickySelectedIds = state.selectedIds.filter(id => {
        const el = action.elements[id];
        return el && el.type !== "sticky";
      });
      return { ...state, elements: action.elements, selectedIds: nonStickySelectedIds };

    case "HYDRATE":
      return action.state;

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

  // Document stack (Figma-style): history[index] is the current wall.
  const historyRef = useRef<Record<string, FigJamElement>[]>([]);
  const indexRef = useRef(0);
  const readyRef = useRef(false);
  const pauseRef = useRef(0);
  const isUndoingRedoingRef = useRef(false);
  const isDraggingRef = useRef(false);
  const [historyVersion, setHistoryVersion] = useState(0);

  const bumpHistory = useCallback(() => {
    setHistoryVersion((version) => version + 1);
  }, []);

  const applyState = useCallback((next: BoardState) => {
    stateRef.current = next;
    baseDispatch({ type: "HYDRATE", state: next });
  }, []);

  const applyAction = useCallback((action: Action): BoardState => {
    const next = reducer(stateRef.current, action);
    applyState(next);
    return next;
  }, [applyState]);

  const commitDoc = useCallback((elements: Record<string, FigJamElement>) => {
    if (!readyRef.current || pauseRef.current > 0 || isUndoingRedoingRef.current) return;
    const clipped = historyRef.current.slice(0, indexRef.current + 1);
    const current = clipped[clipped.length - 1];
    if (current && JSON.stringify(current) === JSON.stringify(elements)) return;
    clipped.push(cloneElements(elements));
    if (clipped.length > MAX_HISTORY) clipped.shift();
    historyRef.current = clipped;
    indexRef.current = clipped.length - 1;
    bumpHistory();
  }, [bumpHistory]);

  const beginHistoryBatch = useCallback(() => {
    pauseRef.current += 1;
  }, []);

  const endHistoryBatch = useCallback((record = true) => {
    pauseRef.current = Math.max(0, pauseRef.current - 1);
    if (pauseRef.current === 0 && record) {
      commitDoc(stateRef.current.elements);
    }
  }, [commitDoc]);

  const UNDOABLE_ACTIONS = new Set([
    "ADD_ELEMENT", "UPDATE_ELEMENT", "UPDATE_MANY", "DELETE_ELEMENT",
    "MOVE_SECTION_WITH_CHILDREN", "RESET_VOTES"
  ]);

  const DRAG_ACTIONS = new Set(["MOVE_STICKY", "MOVE_SELECTED"]);

  const markLoaded = useCallback(() => {
    if (readyRef.current) return;
    readyRef.current = true;
    historyRef.current = [cloneElements(stateRef.current.elements)];
    indexRef.current = 0;
    bumpHistory();
  }, [bumpHistory]);

  const startDrag = useCallback(() => {
    if (!readyRef.current || isUndoingRedoingRef.current || isDraggingRef.current) return;
    isDraggingRef.current = true;
    pauseRef.current += 1;
  }, []);

  const endDrag = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    pauseRef.current = Math.max(0, pauseRef.current - 1);
    if (pauseRef.current === 0) {
      commitDoc(stateRef.current.elements);
    }
  }, [commitDoc]);

  const dispatch = useCallback((action: Action) => {
    if (DRAG_ACTIONS.has(action.type)) {
      if (!isDraggingRef.current) startDrag();
      applyAction(action);
      return;
    }

    applyAction(action);

    if (
      UNDOABLE_ACTIONS.has(action.type) &&
      readyRef.current &&
      pauseRef.current === 0 &&
      !isUndoingRedoingRef.current
    ) {
      commitDoc(stateRef.current.elements);
    }
  }, [applyAction, startDrag, commitDoc]);

  const restoreDoc = useCallback((elements: Record<string, FigJamElement>) => {
    isUndoingRedoingRef.current = true;
    const stamped = stampDoc(elements, Date.now());
    const cleaned: Record<string, FigJamElement> = {};
    for (const [id, el] of Object.entries(stamped)) {
      if (el.type === "sticky") {
        const sticky = el as StickyNoteData;
        if (sticky.editingBy === stateRef.current.currentUserId) {
          const { editingBy: _editingBy, editingByName: _editingByName, ...rest } = sticky as StickyNoteData & {
            editingBy?: string;
            editingByName?: string;
          };
          cleaned[id] = rest as FigJamElement;
        } else {
          cleaned[id] = el;
        }
      } else {
        cleaned[id] = el;
      }
    }
    applyAction({ type: "LOAD_ELEMENTS", elements: cleaned });
    isUndoingRedoingRef.current = false;
    bumpHistory();
    return cleaned;
  }, [applyAction, bumpHistory]);

  const undo = useCallback((): Record<string, FigJamElement> | null => {
    if (indexRef.current <= 0) return null;
    const nextIndex = indexRef.current - 1;
    const doc = historyRef.current[nextIndex];
    if (!doc) return null;
    indexRef.current = nextIndex;
    return restoreDoc(doc);
  }, [restoreDoc]);

  const redo = useCallback((): Record<string, FigJamElement> | null => {
    if (indexRef.current >= historyRef.current.length - 1) return null;
    indexRef.current += 1;
    const doc = historyRef.current[indexRef.current];
    if (!doc) return null;
    return restoreDoc(doc);
  }, [restoreDoc]);

  const canUndo = historyVersion >= 0 && indexRef.current > 0;
  const canRedo = historyVersion >= 0 && indexRef.current < historyRef.current.length - 1;

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
        text: "",
        color: "#B8B4FF",
        fontSize: 13,
        width: size?.width ?? PACKET_EMPTY.width,
        height: size?.height ?? PACKET_EMPTY.height,
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

  // For meta operations that shouldn't be in history (lock, votes, etc.)
  const updateElementNoHistory = useCallback(
    (id: string, patch: Partial<FigJamElement>) => {
      dispatch({ type: "UPDATE_ELEMENT_NO_HISTORY", id, patch });
    },
    []
  );

  const deleteElement = useCallback((id: string) => {
    dispatch({ type: "DELETE_ELEMENT", id });
  }, []);

  const duplicateElement = useCallback(
    (id: string): string | null => {
      const el = state.elements[id];
      if (!el) return null;
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
      return newId;
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

      const spacing = 20;
      const STICKY_W = 200;
      const STICKY_H = 200;
      const SECTION_PADDING = 30;
      const TITLE_BAR_H = 40;
      const COLS = Math.max(1, Math.min(selectedStickies.length, 4));

      const rows = Math.ceil(selectedStickies.length / COLS);
      const sectionWidth = SECTION_PADDING * 2 + COLS * STICKY_W + (COLS - 1) * spacing;
      const sectionHeight = TITLE_BAR_H + SECTION_PADDING * 2 + rows * STICKY_H + (rows - 1) * spacing;

      let minX = Infinity, minY = Infinity;
      for (const sticky of selectedStickies) {
        minX = Math.min(minX, sticky.position.x);
        minY = Math.min(minY, sticky.position.y);
      }
      const sectionPos = {
        x: minX - SECTION_PADDING,
        y: minY - SECTION_PADDING - TITLE_BAR_H,
      };

      const sectionId = uid();
      const section: FigJamElement = {
        id: sectionId,
        type: "section",
        position: sectionPos,
        size: { width: sectionWidth, height: sectionHeight },
        title,
        color: "#e8f4fd",
        autoResize: true,
        votes: 0,
        votedBy: [],
        zIndex: 0,
        createdAt: now(),
        updatedAt: now(),
      };

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

      beginHistoryBatch();
      dispatch({ type: "ADD_ELEMENT", element: section });
      dispatch({ type: "UPDATE_MANY", patches });
      dispatch({ type: "CLEAR_SELECTION" });
      dispatch({ type: "SELECT", id: sectionId, multi: false });
      endHistoryBatch();

      return sectionId;
    },
    [state.selectedIds, state.elements, beginHistoryBatch, endHistoryBatch]
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
    updateElementNoHistory,
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
    beginHistoryBatch,
    endHistoryBatch,
  };
}
