"use client";

import React from "react";
import { Keyboard } from "lucide-react";

interface Shortcut {
  keys: string[];
  description: string;
  category?: string;
}

const SHORTCUTS: Shortcut[] = [
  // Canvas Navigation
  { keys: ["Space", "Drag"], description: "Pan canvas", category: "Navigation" },
  { keys: ["Ctrl", "Scroll"], description: "Zoom in/out", category: "Navigation" },
  { keys: ["Ctrl", "+"], description: "Zoom in", category: "Navigation" },
  { keys: ["Ctrl", "-"], description: "Zoom out", category: "Navigation" },
  { keys: ["Ctrl", "0"], description: "Reset zoom", category: "Navigation" },
  { keys: ["Ctrl", "1"], description: "Fit to content", category: "Navigation" },
  
  // Selection
  { keys: ["Click"], description: "Select cluster", category: "Selection" },
  { keys: ["Shift", "Click"], description: "Add to selection", category: "Selection" },
  { keys: ["Ctrl", "A"], description: "Select all", category: "Selection" },
  { keys: ["Esc"], description: "Clear selection", category: "Selection" },
  { keys: ["V"], description: "Lasso selection", category: "Selection" },
  
  // Cluster Actions
  { keys: ["N"], description: "New cluster at cursor", category: "Clusters" },
  { keys: ["Drag"], description: "Draw to create", category: "Clusters" },
  { keys: ["Double-click"], description: "Create cluster", category: "Clusters" },
  { keys: ["Double-click", "Title"], description: "Edit title", category: "Clusters" },
  { keys: ["Delete"], description: "Delete selected", category: "Clusters" },
  { keys: ["Ctrl", "D"], description: "Duplicate selected", category: "Clusters" },
  { keys: ["Ctrl", "G"], description: "Merge selected", category: "Clusters" },
  
  // Movement
  { keys: ["Arrow Keys"], description: "Move selected", category: "Movement" },
  { keys: ["Shift", "Arrows"], description: "Move fast (20px)", category: "Movement" },
  
  // History
  { keys: ["Ctrl", "Z"], description: "Undo", category: "History" },
  { keys: ["Ctrl", "Shift", "Z"], description: "Redo", category: "History" },
];

const CATEGORIES = [...new Set(SHORTCUTS.map((s) => s.category))];

export function KeyboardShortcuts() {
  return (
    <div className="bg-card border border-border rounded-lg">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <Keyboard className="w-4 h-4" />
        <span className="text-sm font-medium">Keyboard Shortcuts</span>
      </div>
      
      <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
        {CATEGORIES.map((category) => (
          <div key={category} className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {category}
            </h4>
            <div className="space-y-1">
              {SHORTCUTS.filter((s) => s.category === category).map((shortcut, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-sm py-1"
                >
                  <span className="text-muted-foreground">{shortcut.description}</span>
                  <div className="flex gap-1">
                    {shortcut.keys.map((key, j) => (
                      <React.Fragment key={j}>
                        <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-medium min-w-[20px] text-center">
                          {key}
                        </kbd>
                        {j < shortcut.keys.length - 1 && (
                          <span className="text-muted-foreground">+</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ShortcutCheatSheet() {
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <kbd className="px-3 py-2 bg-card border border-border rounded-lg shadow-lg text-sm text-muted-foreground hover:bg-muted/50 cursor-pointer transition-colors">
        Press <kbd className="px-1 bg-muted rounded">?</kbd> for shortcuts
      </kbd>
    </div>
  );
}
