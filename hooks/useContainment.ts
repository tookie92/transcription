"use client";

import { useEffect, useRef } from "react";
import type { FigJamElement, SectionData, StickyNoteData, Size } from "@/types/figjam";

/** Padding around children when auto-sizing */
const PADDING = 40;
/** Title bar height */
const TITLE_BAR_H = 40;
/** Min section dimensions */
const MIN_WIDTH = 240;
const MIN_HEIGHT = 160;
/** Sticky dimensions */
const STICKY_W = 200;
const STICKY_H = 180;
/** Threshold before sticky is considered "outside" section */
const EXTRACTION_THRESHOLD = 20;

/**
 * A sticky is "inside" a section when ANY part of it overlaps the section bounds.
 * With EXTRACTION_THRESHOLD: only fully outside (by threshold) = detached.
 * This gives a more forgiving feel - sticky stays attached until it's clearly outside.
 */
export function isInsideSection(
  sticky: StickyNoteData,
  section: SectionData
): boolean {
  // Check if sticky's bounding box (minus threshold) overlaps section
  const stickyRight = sticky.position.x + STICKY_W;
  const stickyBottom = sticky.position.y + STICKY_H;
  const sectionRight = section.position.x + section.size.width;
  const sectionBottom = section.position.y + section.size.height;

  // Any overlap counts - sticky stays attached
  const overlap =
    sticky.position.x < sectionRight &&
    stickyRight > section.position.x &&
    sticky.position.y < sectionBottom &&
    stickyBottom > section.position.y + TITLE_BAR_H; // section title bar doesn't count

  return overlap;
}

/**
 * Check if sticky is FULLY outside a section (past the threshold).
 * Used for auto-detachment when dragging out.
 */
export function isOutsideSection(
  sticky: StickyNoteData,
  section: SectionData
): boolean {
  const stickyRight = sticky.position.x + STICKY_W;
  const stickyBottom = sticky.position.y + STICKY_H;
  const sectionRight = section.position.x + section.size.width;
  const sectionBottom = section.position.y + section.size.height;

  // Fully outside on ALL sides (with threshold)
  const outsideLeft = stickyRight < section.position.x - EXTRACTION_THRESHOLD;
  const outsideRight = sticky.position.x > sectionRight + EXTRACTION_THRESHOLD;
  const outsideTop = stickyBottom < section.position.y - EXTRACTION_THRESHOLD;
  const outsideBottom = sticky.position.y > sectionBottom + EXTRACTION_THRESHOLD;

  return outsideLeft || outsideRight || outsideTop || outsideBottom;
}

/**
 * Compute the smallest section size that fits all children with PADDING.
 */
function computeFitSize(
  sectionPos: { x: number; y: number },
  children: StickyNoteData[]
): Size | null {
  if (children.length === 0) return null;

  let maxRight = -Infinity;
  let maxBottom = -Infinity;

  for (const child of children) {
    const relX = child.position.x - sectionPos.x;
    const relY = child.position.y - sectionPos.y;
    maxRight = Math.max(maxRight, relX + STICKY_W);
    maxBottom = Math.max(maxBottom, relY + STICKY_H);
  }

  return {
    width: Math.max(MIN_WIDTH, maxRight + PADDING),
    height: Math.max(MIN_HEIGHT, maxBottom + PADDING),
  };
}

interface UseContainmentOptions {
  elements: Record<string, FigJamElement>;
  /** Grow section to wrap overflowing children */
  onResizeSection: (sectionId: string, size: Size) => void;
}

/**
 * Auto-resize sections when stickies overflow their bounds.
 * 
 * NOTE: This hook does NOT track stickies as "belonging" to sections.
 * Stickies are always free-floating. This is intentionally visual-only,
 * matching FigJam's behavior.
 */
export function useContainment({
  elements,
  onResizeSection,
}: UseContainmentOptions) {
  const prevSizes = useRef<Record<string, Size>>({});

  useEffect(() => {
    const sections = Object.values(elements).filter(
      (el): el is SectionData => el.type === "section"
    );
    const stickies = Object.values(elements).filter(
      (el): el is StickyNoteData => el.type === "sticky"
    );

    for (const section of sections) {
      // Only auto-resize sections that have autoResize enabled (default: false for backwards compat)
      if (!section.autoResize) continue;

      // Only consider stickies that BELONG to this section (via parentSectionId)
      const inside = stickies.filter((s) => s.parentSectionId === section.id);
      const fitSize = computeFitSize(section.position, inside);

      if (!fitSize) continue;

      // Only grow, never shrink
      const growW = Math.max(section.size.width, fitSize.width);
      const growH = Math.max(section.size.height, fitSize.height);

      const prev = prevSizes.current[section.id];
      const sizeChanged =
        !prev ||
        Math.abs(prev.width - growW) > 0.5 ||
        Math.abs(prev.height - growH) > 0.5;

      const actuallyGrows =
        growW > section.size.width + 0.5 ||
        growH > section.size.height + 0.5;

      if (sizeChanged && actuallyGrows) {
        prevSizes.current[section.id] = { width: growW, height: growH };
        onResizeSection(section.id, { width: growW, height: growH });
      }
    }
  });
}
