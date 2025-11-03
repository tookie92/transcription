"use client";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Id } from "@/convex/_generated/dataModel";
import { Edit, Trash2, Link, Copy, ScanEye } from "lucide-react";

interface GroupContextMenuProps {
  groupId: string;
  groupTitle: string;
  children: React.ReactNode;
  onRename: (groupId: string) => void;
  onDelete: (groupId: Id<"groupConnections">) => void;
  onDuplicate?: (groupId: string) => void; // 🆕 PROP MANQUANTE
  onCreateConnection?: (groupId: string) => void; // 🆕 PROP MANQUANTE
  onAnalyze?: (groupId: string) => void;
}

export function GroupContextMenu({
  groupId,
  groupTitle,
  children,
  onRename,
  onDelete,
  onDuplicate, // 🆕 AJOUTER
  onCreateConnection, // 🆕 AJOUTER
  onAnalyze,
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
        
        {onDuplicate && ( // 🆕 CONDITION POUR AFFICHER
          <ContextMenuItem 
            onClick={() => onDuplicate(groupId)}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Copy size={14} />
            Dupliquer
          </ContextMenuItem>
        )}
        
        {onCreateConnection && ( // 🆕 CONDITION POUR AFFICHER
          <ContextMenuItem 
            onClick={() => onCreateConnection(groupId)}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Link size={14} />
            Créer une connection
          </ContextMenuItem>
        )}
        
        <ContextMenuSeparator />
        
        {/* Actions avancées */}
        {onAnalyze && (
          <ContextMenuItem 
            onClick={() => onAnalyze(groupId)}
            className="flex items-center gap-2 cursor-pointer"
          >
            <ScanEye size={14} />
            Analyser les insights
          </ContextMenuItem>
        )}
        
        <ContextMenuSeparator />
        
        {/* Actions dangereuses */}
        <ContextMenuItem 
          onClick={() => onDelete(groupId as Id<"groupConnections">)}
          className="flex items-center gap-2 cursor-pointer text-red-600 focus:text-red-600"
        >
          <Trash2 size={14} />
          Supprimer le groupe
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}