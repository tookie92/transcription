"use client";

import React from "react";
import { Trash2, Edit3, Copy, Sparkles } from "lucide-react";
import {
  ContextMenuContent,
  ContextMenuItem,
} from "@/components/ui/context-menu";
import { AffinityGroup as AffinityGroupType } from "@/types";

interface GroupContextMenuProps {
  group: AffinityGroupType;
  hasInsights: boolean;
  isPresentationMode: boolean;
  handleRename: () => void;
  handleDuplicate: () => void;
  handleDelete: (groupId: string) => void;
}

export function GroupContextMenu({
  group,
  hasInsights,
  isPresentationMode,
  handleRename,
  handleDuplicate,
  handleDelete,
}: GroupContextMenuProps) {
  if (isPresentationMode) return null;

  return (
    <ContextMenuContent className="w-72 rounded-2xl shadow-2xl border-0 overflow-hidden">
      <div
        className="px-4 py-3 text-sm font-bold text-white border-b"
        style={{
          background: `linear-gradient(135deg, ${group.color}, ${group.color}CC)`,
        }}
      >
        {group.title}
      </div>

      <div className="p-2 bg-card/95 backdrop-blur-sm">
        <ContextMenuItem
          onClick={(e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            handleRename();
          }}
          className="flex items-center gap-3 cursor-pointer p-3 rounded-xl hover:bg-accent transition-all mb-1"
        >
          <div className="p-2 rounded-lg bg-primary/10">
            <Edit3 size={16} className="text-primary" />
          </div>
          <span className="font-medium">Rename Group</span>
        </ContextMenuItem>

        {hasInsights && (
          <ContextMenuItem className="flex items-center gap-3 cursor-pointer p-3 rounded-xl hover:bg-accent transition-all mb-1">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <Sparkles size={16} className="text-purple-600 dark:text-purple-400" />
            </div>
            <span className="font-medium">AI Name Suggestions</span>
          </ContextMenuItem>
        )}

        <ContextMenuItem
          onClick={(e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            handleDuplicate();
          }}
          className="flex items-center gap-3 cursor-pointer p-3 rounded-xl hover:bg-accent transition-all mb-1"
        >
          <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
            <Copy size={16} className="text-green-600 dark:text-green-400" />
          </div>
          <span className="font-medium">Duplicate Group</span>
        </ContextMenuItem>

        <div className="border-t my-2"></div>

        <ContextMenuItem
          onClick={(e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            handleDelete(group.id);
          }}
          className="flex items-center gap-3 cursor-pointer p-3 rounded-xl hover:bg-destructive/10 transition-all text-destructive"
        >
          <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
            <Trash2 size={16} className="text-destructive" />
          </div>
          <span className="font-medium">Delete Group</span>
        </ContextMenuItem>
      </div>
    </ContextMenuContent>
  );
}
