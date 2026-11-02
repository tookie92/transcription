// lib/keyboardShortcuts.ts — wall (FigJam) shortcuts

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
  action: string;
}

export const CANVAS_SHORTCUTS: KeyboardShortcut[] = [
  { key: "l", description: "Lasso", action: "lasso" },
  { key: "h", description: "Pan tool", action: "pan" },
  { key: "c", description: "Draw a packet frame", action: "frame" },
  { key: "f", description: "Draw a packet frame", action: "frame" },
  { key: "v", description: "Workshop vote", action: "vote" },
  { key: "a", ctrl: true, description: "Select all packets", action: "selectAll" },
  { key: "a", ctrl: true, shift: true, description: "Select all slips", action: "selectAllStickies" },
  { key: "Delete", description: "Delete / release selected", action: "deleteSelected" },
  { key: "Backspace", description: "Delete / release selected", action: "deleteSelected" },
  { key: "/", description: "Find across sittings", action: "find" },
  { key: "Escape", description: "Close peek / clear selection", action: "escape" },
  { key: "ArrowUp", description: "Nudge selected up", action: "arrowMove" },
  { key: "ArrowDown", description: "Nudge selected down", action: "arrowMove" },
  { key: "ArrowLeft", description: "Nudge selected left", action: "arrowMove" },
  { key: "ArrowRight", description: "Nudge selected right", action: "arrowMove" },
  { key: "z", ctrl: true, description: "Undo", action: "undo" },
  { key: "y", ctrl: true, description: "Redo", action: "redo" },
  { key: "z", ctrl: true, shift: true, description: "Redo", action: "redo" },
  { key: "s", ctrl: true, description: "Save now", action: "save" },
  { key: "d", ctrl: true, description: "Duplicate", action: "duplicate" },
  { key: "g", ctrl: true, description: "Group selected", action: "group" },
  { key: "+", ctrl: true, description: "Zoom in", action: "zoomIn" },
  { key: "=", ctrl: true, description: "Zoom in", action: "zoomIn" },
  { key: "-", ctrl: true, description: "Zoom out", action: "zoomOut" },
  { key: "0", ctrl: true, description: "Reset zoom", action: "resetZoom" },
];

export function matchShortcut(e: KeyboardEvent, shortcut: KeyboardShortcut): boolean {
  const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();
  const ctrlMatch = shortcut.ctrl ? (e.ctrlKey || e.metaKey) : !e.ctrlKey && !e.metaKey;
  const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
  const altMatch = shortcut.alt ? e.altKey : !e.altKey;

  return keyMatch && ctrlMatch && shiftMatch && altMatch;
}

export function findMatchingShortcut(e: KeyboardEvent): KeyboardShortcut | undefined {
  return CANVAS_SHORTCUTS.find((shortcut) => matchShortcut(e, shortcut));
}
