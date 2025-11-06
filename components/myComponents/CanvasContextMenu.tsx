// components/CanvasContextMenu.tsx - VERSION SIMPLIFIÉE
"use client";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Plus, Sparkles } from "lucide-react";

interface CanvasContextMenuProps {
  children: React.ReactNode;
  onNewGroup: () => void;
  onAutoCluster: () => void;
}

export function CanvasContextMenu({
  children,
  onNewGroup,
  onAutoCluster,
}: CanvasContextMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {/* UN SEUL enfant direct */}
        <div className="w-full h-full">
          {children}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-64">
        <ContextMenuItem 
          onClick={onNewGroup}
          className="flex items-center gap-2 cursor-pointer"
        >
          <Plus size={16} />
          Create New Group
        </ContextMenuItem>
        
        <ContextMenuSeparator />
        
        <ContextMenuItem 
          onClick={onAutoCluster}
          className="flex items-center gap-2 cursor-pointer"
        >
          <Sparkles size={16} />
          Auto-Cluster Insights
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}