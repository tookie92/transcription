// ─── FigJam Types ──────────────────────────────────────────────────────────

export type ToolType =
  | "select"
  | "hand"
  | "sticky"
  | "section"
  | "label"
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
  | "white"
  | "pain-point"
  | "quote"
  | "insight"
  | "follow-up";

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
  authorName?: string;
  source?: string;
  insightId?: string; // ID of the original insight this sticky was imported from
  votes: number;
  votedBy: string[]; // user IDs who voted
  /** ID of the section this sticky is attached to. null = free-floating. */
  parentSectionId: string | null;
  /** Position relative to parent section. Only used if parentSectionId is set. */
  relativePosition?: Position;
  /** Size of the sticky note - allows user to resize */
  size: Size;
  /** ID of the cluster this sticky belongs to (explicit assignment via hit-test) */
  clusterId?: string | null;
}

export interface SectionData extends BaseElement {
  type: "section";
  title: string;
  size: Size;
  color: string;
  autoResize: boolean;
  votes: number;
  votedBy: string[];
}

export interface ClusterLabelData extends BaseElement {
  type: "label";
  text: string;
  color: string;
  fontSize: number;
  width: number;
  height: number;
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

export type FigJamElement = StickyNoteData | SectionData | TextData | DotData | ClusterLabelData;

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
  addStickyNote: (pos: Position, color?: StickyColor, size?: Size, authorName?: string) => string;
  addSection: (pos: Position, size?: Size) => string;
  addClusterLabel: (pos: Position, size?: { width: number; height: number }) => string;
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
  /** Mark that initial loading is complete - starts tracking history for undo/redo */
  markLoaded: () => void;
  /** Call when drag starts to prepare snapshot for history */
  startDrag: () => void;
  /** Call when drag ends to save to history */
  endDrag: () => void;
  // Multi-selection actions
  groupSelectedIntoSection: (title?: string) => string | null;
  autoArrange: (sectionId?: string) => void;
}
