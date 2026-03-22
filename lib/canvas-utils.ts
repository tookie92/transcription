"use client";

import { AffinityGroup, Insight } from "@/types";

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

export const STICKY_WIDTH = 160;
export const STICKY_HEIGHT = 140;
export const CLUSTER_MIN_WIDTH = 200;
export const CLUSTER_MIN_HEIGHT = 150;
export const CLUSTER_PADDING = 40;
export const CLUSTER_HEADER_HEIGHT = 40;

export interface InsightWithPosition extends Insight {
  position: { x: number; y: number };
  groupId: string | null;
}

export function getClusterForInsight(
  insightId: string,
  groups: AffinityGroup[]
): AffinityGroup | null {
  return groups.find((g) => g.insightIds.includes(insightId)) || null;
}

export function getRelativePosition(
  insightId: string,
  groups: AffinityGroup[]
): { x: number; y: number } | null {
  const group = getClusterForInsight(insightId, groups);
  if (!group) return null;

  const insightIndex = group.insightIds.indexOf(insightId);
  const col = insightIndex % 2;
  const row = Math.floor(insightIndex / 2);
  const spacingX = STICKY_WIDTH + 20;
  const spacingY = STICKY_HEIGHT + 20;

  return {
    x: CLUSTER_PADDING + col * spacingX,
    y: CLUSTER_HEADER_HEIGHT + CLUSTER_PADDING + row * spacingY,
  };
}

export function getAbsolutePosition(
  insight: Insight,
  stickyPositions: Record<string, { x: number; y: number }>,
  groups: AffinityGroup[],
  fallbackIndex: number = 0
): { x: number; y: number } {
  // FIRST: Check if there's a stored position - this is the user's actual position
  if (stickyPositions[insight.id]) {
    return stickyPositions[insight.id];
  }

  // SECOND: If in a cluster, calculate position based on index
  const cluster = getClusterForInsight(insight.id, groups);
  if (cluster) {
    const relativePos = getRelativePosition(insight.id, groups);
    if (relativePos) {
      return {
        x: cluster.position.x + relativePos.x,
        y: cluster.position.y + relativePos.y,
      };
    }
  }

  // THIRD: Fallback for ungrouped insights with no stored position
  return {
    x: 200 + (fallbackIndex % 4) * (STICKY_WIDTH + 20),
    y: 400 + Math.floor(fallbackIndex / 4) * (STICKY_HEIGHT + 20),
  };
}

export function computeClusterSize(
  insights: Insight[],
  clusterId: string,
  groups: AffinityGroup[]
): { width: number; height: number } {
  const cluster = groups.find((g) => g.id === clusterId);
  if (!cluster) return { width: CLUSTER_MIN_WIDTH, height: CLUSTER_MIN_HEIGHT };

  const clusterInsights = insights.filter((i) => cluster.insightIds.includes(i.id));
  if (clusterInsights.length === 0) {
    return { width: CLUSTER_MIN_WIDTH, height: CLUSTER_MIN_HEIGHT };
  }

  let maxX = 0;
  let maxY = 0;

  clusterInsights.forEach((insight, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    maxX = Math.max(maxX, CLUSTER_PADDING + col * (STICKY_WIDTH + 20) + STICKY_WIDTH);
    maxY = Math.max(maxY, CLUSTER_HEADER_HEIGHT + CLUSTER_PADDING + row * (STICKY_HEIGHT + 20) + STICKY_HEIGHT);
  });

  return {
    width: Math.max(CLUSTER_MIN_WIDTH, maxX + CLUSTER_PADDING),
    height: Math.max(CLUSTER_MIN_HEIGHT, maxY + CLUSTER_PADDING),
  };
}

export function isInsideCluster(
  position: { x: number; y: number },
  cluster: AffinityGroup,
  padding: number = 50
): boolean {
  const clusterWidth = cluster.size?.width || CLUSTER_MIN_WIDTH;
  const clusterHeight = cluster.size?.height || CLUSTER_MIN_HEIGHT;

  return (
    position.x >= cluster.position.x - padding &&
    position.x <= cluster.position.x + clusterWidth + padding &&
    position.y >= cluster.position.y - padding &&
    position.y <= cluster.position.y + clusterHeight + padding
  );
}

export function getClusterAtPosition(
  position: { x: number; y: number },
  groups: AffinityGroup[]
): AffinityGroup | null {
  for (const group of groups) {
    if (isInsideCluster(position, group)) {
      return group;
    }
  }
  return null;
}
