"use client";

export interface SnapOptions {
  enabled: boolean;
  gridSize: number;
}

export function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

export function snapPoint(
  point: { x: number; y: number },
  options: SnapOptions
): { x: number; y: number } {
  if (!options.enabled) return point;
  return {
    x: snapToGrid(point.x, options.gridSize),
    y: snapToGrid(point.y, options.gridSize),
  };
}

export function snapBounds(
  bounds: { x: number; y: number; width: number; height: number },
  options: SnapOptions
): { x: number; y: number; width: number; height: number } {
  if (!options.enabled) return bounds;
  return {
    x: snapToGrid(bounds.x, options.gridSize),
    y: snapToGrid(bounds.y, options.gridSize),
    width: snapToGrid(bounds.width, options.gridSize),
    height: snapToGrid(bounds.height, options.gridSize),
  };
}

export const DEFAULT_SNAP_OPTIONS: SnapOptions = {
  enabled: false,
  gridSize: 20,
};

export const GRID_SIZES = [
  { label: "10px", value: 10 },
  { label: "20px", value: 20 },
  { label: "40px", value: 40 },
  { label: "80px", value: 80 },
];
