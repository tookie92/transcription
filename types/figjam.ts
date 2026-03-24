// ─── FigJam Types ──────────────────────────────────────────────────────────

export type ToolType =
  | "select"
  | "hand"
  | "sticky"
  | "section"
  | "text"
  | "connector"
  | "shape"
  | "stamp"
  | "vote";

export type StickyColor =
  | "yellow"
  | "pink"
  | "green"
  | "blue"
  | "purple"
  | "orange"
  | "white";

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface BaseElement {
  id: string;
  position: Position;
  zIndex: number;
  createdAt: number;
  updatedAt: number;
}

export interface StickyNoteData extends BaseElement {
  type: "sticky";
  content: string;
  color: StickyColor;
  author?: string;
  votes: number;
  votedBy: string[]; // user IDs who voted
  /** ID of the section this sticky is attached to. null = free-floating. */
  parentSectionId: string | null;
  /** Size of the sticky note - allows user to resize */
  size: Size;
}

export interface SectionData extends BaseElement {
  type: "section";
  title: string;
  size: Size;
  color: string; // hex or tailwind bg class
  /** Auto-resize to fit content when enabled */
  autoResize: boolean;
  /** Number of votes on this section/cluster */
  votes: number;
  /** User IDs who voted */
  votedBy: string[];
}

export interface TextData extends BaseElement {
  type: "text";
  content: string;
  fontSize: number;
  fontWeight: "normal" | "medium" | "bold";
  color: string;
}

export interface DotData extends BaseElement {
  type: "dot";
  parentSectionId: string | null;
  ownerId: string;
  color: string;
}

export type FigJamElement = StickyNoteData | SectionData | TextData | DotData;

export interface BoardState {
  elements: Record<string, FigJamElement>;
  selectedIds: string[];
  activeTool: ToolType;
  pan: Position;
  zoom: number;
  currentUserId: string;
  maxVotesPerUser: number;
  votesUsed: number;
  votingModeActive: boolean;
  votesRevealed: boolean;
}

export interface DragState {
  isDragging: boolean;
  startPos: Position;
  elementId: string | null;
  elementStartPos: Position;
}

export interface CanvasTransform {
  pan: Position;
  zoom: number;
}

// ─── Hook return types ──────────────────────────────────────────────────────

export interface UseFigJamBoardReturn {
  state: BoardState;
  // Element actions
  addStickyNote: (pos: Position, color?: StickyColor) => string;
  addSection: (pos: Position, size?: Size) => string;
  addDot: (pos: Position, parentSectionId: string | null, color: string) => string;
  updateElement: (id: string, patch: Partial<FigJamElement>) => void;
  updateMany: (patches: { id: string; patch: Partial<FigJamElement> }[]) => void;
  deleteElement: (id: string) => void;
  duplicateElement: (id: string) => void;
  // Selection
  selectElement: (id: string, multi?: boolean) => void;
  clearSelection: () => void;
  // Voting
  castVote: (elementId: string) => void;
  removeVote: (elementId: string) => void;
  resetVotes: () => void;
  revealVotes: () => void;
  // Canvas
  setZoom: (zoom: number) => void;
  setPan: (pan: Position) => void;
  setTool: (tool: ToolType) => void;
  // Ordering
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  // Section containment
  moveSectionWithChildren: (sectionId: string, dx: number, dy: number) => void;
  /** Move a sticky and auto-attach/detach from sections based on position */
  moveSticky: (stickyId: string, position: Position) => void;
  /** Move multiple selected elements together */
  moveSelected: (ids: string[], dx: number, dy: number) => void;
  // Persistence
  loadElements: (elements: Record<string, FigJamElement>) => void;
  // Undo/Redo
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  // Multi-selection actions
  groupSelectedIntoSection: (title?: string) => string | null;
  autoArrange: (sectionId?: string) => void;
}
