// ─── FigJam Components — Public API ─────────────────────────────────────────
// Import everything from one place:
//   import { FigJamBoard, StickyNote, ClusterLabel, DotVotingControls } from "@/components/figjam"

export { FigJamBoard } from "./FigJamBoard";
export { StickyNote, STICKY_COLORS } from "./StickyNote";
export { ClusterLabel, LABEL_COLORS } from "./ClusterLabel";
export { FigJamToolbar } from "./FigJamToolbar";
export {
  DotVotingControls,
  VotingLeaderboard,
  VotingModeBanner,
} from "./DotVoting";

// Re-export hook and types for custom boards
export { useFigJamBoard } from "@/hooks/useFigJamBoard";
export { useDraggable } from "@/hooks/useDraggable";
export type {
  FigJamElement,
  StickyNoteData,
  SectionData,
  TextData,
  ClusterLabelData,
  BoardState,
  ToolType,
  StickyColor,
  Position,
  Size,
  CanvasTransform,
  UseFigJamBoardReturn,
} from "@/types/figjam";
