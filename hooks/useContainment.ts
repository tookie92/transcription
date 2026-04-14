"use client";

import type { Position, Size, SectionData, StickyNoteData } from "../types/figjam";

/**
 * Check if a sticky is inside a section
 */
export function isInsideSection(sticky: { position: Position; size?: Size }, section: SectionData): boolean {
  const stickyRight = sticky.position.x + (sticky.size?.width ?? 200);
  const stickyBottom = sticky.position.y + (sticky.size?.height ?? 180);
  const sectionRight = section.position.x + section.size.width;
  const sectionBottom = section.position.y + section.size.height;

  return (
    sticky.position.x >= section.position.x &&
    sticky.position.y >= section.position.y &&
    stickyRight <= sectionRight &&
    stickyBottom <= sectionBottom
  );
}

/**
 * Check if a sticky is outside a section
 */
export function isOutsideSection(sticky: { position: Position; size?: Size }, section: SectionData): boolean {
  const stickyRight = sticky.position.x + (sticky.size?.width ?? 200);
  const stickyBottom = sticky.position.y + (sticky.size?.height ?? 180);
  const sectionRight = section.position.x + section.size.width;
  const sectionBottom = section.position.y + section.size.height;

  return (
    stickyRight < section.position.x ||
    stickyBottom < section.position.y ||
    sticky.position.x > sectionRight ||
    sticky.position.y > sectionBottom
  );
}