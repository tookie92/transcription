"use client";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Edit, Trash2 } from "lucide-react";

interface GroupContextMenuProps {
  groupId: string;
  groupTitle: string;
  children: React.ReactNode;
  onRename: (groupId: string) => void;
  onDelete: (groupId: string) => void;
}

export function GroupContextMenu({
  groupId,
  groupTitle,
  children,
  onRename,
  onDelete,
}: GroupContextMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-64">
        {/* Informations du groupe */}
        <div className="px-2 py-1.5 text-sm font-semibold text-gray-900 border-b">
          {groupTitle}
        </div>
        
        {/* Actions principales */}
        <ContextMenuItem 
          onClick={() => onRename(groupId)}
          className="flex items-center gap-2 cursor-pointer"
        >
          <Edit size={14} />
          Renommer le groupe
        </ContextMenuItem>
        
        <ContextMenuSeparator />
        
        {/* Actions dangereuses */}
        <ContextMenuItem 
          onClick={() => onDelete(groupId)}
          className="flex items-center gap-2 cursor-pointer text-red-600 focus:text-red-600"
        >
          <Trash2 size={14} />
          Supprimer le groupe
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}