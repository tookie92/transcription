export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export type StickyColor = 
  | "yellow" 
  | "pink" 
  | "green" 
  | "blue" 
  | "purple" 
  | "orange" 
  | "gray";

export interface StickyNote {
  id: string;
  type: "sticky";
  content: string;
  color: StickyColor;
  position: Position;
  relativePosition?: Position;
  clusterId: string | null;
  size: Size;
  createdAt: number;
}

export interface Cluster {
  id: string;
  type: "cluster";
  title: string;
  position: Position;
  size: Size;
  color: string;
}

export type AffinityElement = StickyNote | Cluster;

export interface AffinityCanvasState {
  elements: Record<string, AffinityElement>;
  selectedIds: string[];
  pan: Position;
  zoom: number;
}
