// lib/keyboardShortcuts.ts

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
  { key: 'n', description: 'Create new group', action: 'newGroup' },
  { key: 'a', ctrl: true, description: 'Select all groups', action: 'selectAll' },
  { key: 'Delete', description: 'Delete selected groups', action: 'deleteSelected' },
  { key: 'Backspace', description: 'Delete selected groups', action: 'deleteSelected' },
  { key: 'Escape', description: 'Clear selection / Close panel', action: 'escape' },
  { key: 'ArrowUp', description: 'Move selected groups up', action: 'arrowMove' },
  { key: 'ArrowDown', description: 'Move selected groups down', action: 'arrowMove' },
  { key: 'ArrowLeft', description: 'Move selected groups left', action: 'arrowMove' },
  { key: 'ArrowRight', description: 'Move selected groups right', action: 'arrowMove' },
  { key: 'z', ctrl: true, description: 'Undo', action: 'undo' },
  { key: 'y', ctrl: true, description: 'Redo', action: 'redo' },
  { key: 'z', ctrl: true, shift: true, description: 'Redo', action: 'redo' },
  { key: 'v', description: 'Toggle voting panel', action: 'toggleVotingPanel' },
  { key: 'a', description: 'Toggle analytics panel', action: 'toggleAnalyticsPanel' },
  { key: 'p', description: 'Toggle persona panel', action: 'togglePersonaPanel' },
  { key: 't', description: 'Toggle theme discovery panel', action: 'toggleThemeDiscoveryPanel' },
  { key: 'e', ctrl: true, description: 'Toggle export panel', action: 'toggleExportPanel' },
  { key: '+', ctrl: true, description: 'Zoom in', action: 'zoomIn' },
  { key: '=', ctrl: true, description: 'Zoom in', action: 'zoomIn' },
  { key: '-', ctrl: true, description: 'Zoom out', action: 'zoomOut' },
  { key: '0', ctrl: true, description: 'Reset zoom', action: 'resetZoom' },
  { key: 'c', description: 'Center view', action: 'centerZoom' },
];

export function matchShortcut(e: KeyboardEvent, shortcut: KeyboardShortcut): boolean {
  const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();
  const ctrlMatch = shortcut.ctrl ? (e.ctrlKey || e.metaKey) : !e.ctrlKey && !e.metaKey;
  const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
  const altMatch = shortcut.alt ? e.altKey : !e.altKey;
  
  return keyMatch && ctrlMatch && shiftMatch && altMatch;
}

export function findMatchingShortcut(e: KeyboardEvent): KeyboardShortcut | undefined {
  return CANVAS_SHORTCUTS.find(shortcut => matchShortcut(e, shortcut));
}
