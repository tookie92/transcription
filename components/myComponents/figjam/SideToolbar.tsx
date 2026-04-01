"use client";

import React, { memo } from "react";
import { cn } from "@/lib/utils";

export type ToolType = "select" | "cluster" | "sticky" | "hand";

const TOOLS: { id: ToolType; label: string; icon: React.ReactNode }[] = [
  {
    id: "select",
    label: "Select",
    icon: (
      <svg fill="currentColor" width="18" height="18" viewBox="0 0 24 24">
        <path d="M4 0l16 12-7 2-4 8L4 0z" />
      </svg>
    ),
  },
  {
    id: "cluster",
    label: "Add Cluster",
    icon: (
      <svg fill="none" stroke="currentColor" width="18" height="18" viewBox="0 0 24 24" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="3" strokeDasharray="4 2" />
        <path d="M12 8v8M8 12h8" />
      </svg>
    ),
  },
  {
    id: "sticky",
    label: "Add Sticky",
    icon: (
      <svg fill="none" stroke="currentColor" width="18" height="18" viewBox="0 0 24 24" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
    ),
  },
  {
    id: "hand",
    label: "Pan (Space)",
    icon: (
      <svg fill="none" stroke="currentColor" width="18" height="18" viewBox="0 0 24 24" strokeWidth="2">
        <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
        <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
      </svg>
    ),
  },
];

interface SideToolbarProps {
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  className?: string;
}

export const SideToolbar = memo(function SideToolbar({
  activeTool,
  onToolChange,
  className,
}: SideToolbarProps) {
  return (
    <div
      className={cn(
        "absolute left-4 top-1/2 -translate-y-1/2",
        "bg-white dark:bg-card rounded-2xl",
        "shadow-[0_4px_20px_rgba(0,0,0,0.12),0_1px_4px_rgba(0,0,0,0.06)]",
        "border border-[#e8e8e8] dark:border-border",
        "p-1.5",
        "flex flex-col gap-1",
        "z-[100]",
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {TOOLS.map((tool) => (
        <button
          key={tool.id}
          onClick={(e) => {
            e.stopPropagation();
            onToolChange(tool.id);
          }}
          className={cn(
            "w-10 h-10 rounded-xl",
            "flex items-center justify-center",
            "transition-all duration-150",
            activeTool === tool.id
              ? "bg-[#1d1d1b] dark:bg-primary text-white dark:text-primary-foreground"
              : "text-[#555] dark:text-muted-foreground hover:bg-[#f0f0f0] dark:hover:bg-accent hover:text-[#1d1d1b] dark:hover:text-foreground"
          )}
          title={tool.label}
        >
          {tool.icon}
        </button>
      ))}
    </div>
  );
});
