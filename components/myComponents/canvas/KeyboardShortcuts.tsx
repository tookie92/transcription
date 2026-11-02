"use client";

import React from "react";
import { Keyboard } from "lucide-react";

interface Shortcut {
  keys: string[];
  description: string;
  category?: string;
}

const SHORTCUTS: Shortcut[] = [
  { keys: ["Space", "Drag"], description: "Pan the wall", category: "Navigation" },
  { keys: ["H"], description: "Pan tool", category: "Navigation" },
  { keys: ["L"], description: "Lasso", category: "Navigation" },
  { keys: ["C"], description: "Draw a packet frame", category: "Navigation" },
  { keys: ["Ctrl", "Scroll"], description: "Zoom", category: "Navigation" },
  { keys: ["Ctrl", "+"], description: "Zoom in", category: "Navigation" },
  { keys: ["Ctrl", "-"], description: "Zoom out", category: "Navigation" },
  { keys: ["Ctrl", "0"], description: "Reset zoom", category: "Navigation" },

  { keys: ["Click slip"], description: "Peek tape in place", category: "Slips" },
  { keys: ["Esc"], description: "Close peek / clear", category: "Slips" },

  { keys: ["Ctrl", "A"], description: "Select all packets", category: "Selection" },
  { keys: ["Ctrl", "Shift", "A"], description: "Select all slips", category: "Selection" },
  { keys: ["Delete"], description: "Release / remove selected", category: "Selection" },
  { keys: ["Ctrl", "D"], description: "Duplicate", category: "Selection" },
  { keys: ["Ctrl", "G"], description: "Group selected", category: "Selection" },

  { keys: ["Arrows"], description: "Nudge selected", category: "Movement" },
  { keys: ["Shift", "Arrows"], description: "Nudge farther", category: "Movement" },

  { keys: ["Ctrl", "Z"], description: "Undo", category: "History" },
  { keys: ["Ctrl", "Shift", "Z"], description: "Redo", category: "History" },
  { keys: ["Ctrl", "S"], description: "Save now", category: "History" },

  { keys: ["V"], description: "Workshop vote", category: "Workshop" },
];

const CATEGORIES = [...new Set(SHORTCUTS.map((s) => s.category))];

export function KeyboardShortcuts() {
  return (
    <div className="bg-card border border-border rounded-lg">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <Keyboard className="w-4 h-4" />
        <span className="text-sm font-medium">Keyboard Shortcuts</span>
      </div>
      
      <div className="p-4 space-y-4 max-h-96 overflow-auto">
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
