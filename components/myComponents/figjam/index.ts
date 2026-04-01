// ─── FigJam Components — Public API ─────────────────────────────────────────
// Import everything from one place:
//   import { FigJamBoard, StickyNote, ClusterLabel } from "@/components/figjam"

export { FigJamBoard } from "./FigJamBoard";
export { StickyNote, STICKY_COLORS } from "./StickyNote";
export { ClusterLabel } from "./ClusterLabel";
export { InsightsSidebar } from "./InsightsSidebar";
export { FigJamToolbar } from "./FigJamToolbar";
export { MiniMap } from "./MiniMap";
export { SideToolbar } from "./SideToolbar";
export { WorkshopTemplateSelector, WORKSHOP_TEMPLATES } from "./WorkshopTemplateSelector";
export type { WorkshopTemplate } from "./WorkshopTemplateSelector";

// Re-export hook and types for custom boards
export { useFigJamBoard } from "@/hooks/useFigJamBoard";
export { useDraggable } from "@/hooks/useDraggable";
export { useVoting } from "@/hooks/useVoting";
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
