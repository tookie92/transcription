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

      <div className="p-2 bg-white/95 backdrop-blur-sm">
        <ContextMenuItem
          onClick={(e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            handleRename();
          }}
          className="flex items-center gap-3 cursor-pointer p-3 rounded-xl hover:bg-gray-50 transition-all mb-1"
        >
          <div className="p-2 rounded-lg bg-blue-50">
            <Edit3 size={16} className="text-blue-600" />
          </div>
          <span className="font-medium">Rename Group</span>
        </ContextMenuItem>

        {hasInsights && (
          <ContextMenuItem className="flex items-center gap-3 cursor-pointer p-3 rounded-xl hover:bg-gray-50 transition-all mb-1">
            <div className="p-2 rounded-lg bg-purple-50">
              <Sparkles size={16} className="text-purple-600" />
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
          className="flex items-center gap-3 cursor-pointer p-3 rounded-xl hover:bg-gray-50 transition-all mb-1"
        >
          <div className="p-2 rounded-lg bg-green-50">
            <Copy size={16} className="text-green-600" />
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
          className="flex items-center gap-3 cursor-pointer p-3 rounded-xl hover:bg-red-50 transition-all text-red-600"
        >
          <div className="p-2 rounded-lg bg-red-50">
            <Trash2 size={16} className="text-red-600" />
          </div>
          <span className="font-medium">Delete Group</span>
        </ContextMenuItem>
      </div>
    </ContextMenuContent>
  );
}
