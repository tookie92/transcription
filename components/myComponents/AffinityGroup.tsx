"use client";

import { motion, PanInfo } from "framer-motion";
import { Trash2, Vote, GripVertical, Edit, Copy, Edit3, Sparkles } from "lucide-react";
import { useState, useCallback, useMemo } from "react";
import { AffinityGroup as AffinityGroupType, Insight } from "@/types";
import { useMotionValue, useTransform } from "framer-motion";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { GroupNameAssistant } from "./GroupNameAssistant";

interface AffinityGroupProps {
  group: AffinityGroupType;
  insights: Insight[];
  scale: number;
  isDragOver: boolean;
  workspaceMode: 'grouping' | 'voting';
  projectContext?: string; // 🎯
  onMove: (groupId: string, position: { x: number; y: number }) => void;
  onDelete?: (groupId: string) => void;
  onTitleUpdate?: (groupId: string, title: string) => void;
  onRemoveInsight?: (insightId: string, groupId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onDragStateChange?: (dragging: boolean) => void;
  onSelect: (groupId: string, e: React.MouseEvent) => void;
  isSelected: boolean;
  
}

export default function AffinityGroup({
  group,
  insights,
  scale,
  isSelected,
  isDragOver,
  workspaceMode,
  onMove,
  onDelete,
  onTitleUpdate,
  onRemoveInsight,
  onSelect,
  onDragOver,
  onDragLeave,
  onDrop,
  projectContext,
  onDragStart,
  onDragEnd,
  onDragStateChange,
}: AffinityGroupProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempTitle, setTempTitle] = useState(group.title);
  const [isDragging, setIsDragging] = useState(false);

  const x = useMotionValue(group.position.x);
  const y = useMotionValue(group.position.y);

  const rotateX = useTransform(y, [-100, 0, 100], [1, 0, -1]);
  const rotateY = useTransform(x, [-100, 0, 100], [-1, 0, 1]);

  // 🎯 CALCULER LES INSIGHTS DU GROUPE
  const groupInsights = useMemo(() => 
    insights.filter(insight => group.insightIds.includes(insight.id)),
    [insights, group.insightIds]
  );
// 🎯 CORRECTION : Utiliser groupInsights.length directement
const hasInsights = groupInsights.length > 0;


  const handleDragStart = useCallback(() => {
    setIsDragging(true);
    onDragStateChange?.(true);
  }, [onDragStateChange]);

    const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(group.id, e);
  }, [group.id, onSelect]);


  const handleDragEnd = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false);
    onDragStateChange?.(false);
    
    const finalX = group.position.x + info.offset.x / scale;
    const finalY = group.position.y + info.offset.y / scale;
    
    onMove(group.id, { x: finalX, y: finalY });
  }, [group.position.x, group.position.y, group.id, scale, onMove, onDragStateChange]);

  // 🎯 SAUVEGARDE DU TITRE
  const handleTitleSave = () => {
    if (tempTitle.trim() && tempTitle !== group.title) {
      onTitleUpdate?.(group.id, tempTitle.trim());
    }
    setIsEditing(false);
  };

  // 🎯 CLICK SUR LE TITRE POUR ÉDITER
  const handleTitleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTempTitle(group.title);
    setIsEditing(true);
  };

    // 🎯 GESTION DES TOUCHES
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSave();
    } else if (e.key === 'Escape') {
      setTempTitle(group.title);
      setIsEditing(false);
    }
  };

  // 🆕 HANDLERS CONTEXT MENU
  const handleRename = useCallback(() => {
    setTempTitle(group.title);
    setIsEditing(true);
  }, [group.title]);

  const handleDuplicate = useCallback(() => {
    // Logique de duplication (à implémenter si besoin)
    console.log("Duplicate group:", group.id);
  }, [group.id]);

  const handleDelete = useCallback(() => {
    onDelete?.(group.id);
  }, [group.id, onDelete]);

  const inputStyle = {
  color: group.color,
  border: `1px solid ${group.color}40`,
  backgroundColor: 'white'
};


  return (
    <ContextMenu>
      <ContextMenuTrigger>
      <motion.div
        drag
        dragMomentum={false}
        dragElastic={0}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onClick={handleClick}
        style={{ 
          x, 
          y,
          rotateX: isDragging ? rotateX : 0,
          rotateY: isDragging ? rotateY : 0,
          borderColor: isDragOver ? "#3B82F6" : (isSelected ? "#F59E0B" : group.color),
        }}
        // 🆕 PARAMÈTRES OPTIMISÉS POUR MOINS DE BOUNCE
        animate={{
          x: group.position.x,
          y: group.position.y
        }}
        transition={{
          type: "spring",
          stiffness: 500,     // 🆕 PLUS RIGIDE = MOINS DE BOUNCE
          damping: 40,        // 🆕 PLUS D'AMORTISSEMENT
          mass: 0.5,          // 🆕 PLUS LÉGER
          restDelta: 0.5,     // 🆕 ARRÊT PLUS RAPIDE
          restSpeed: 10       // 🆕 VITESSE MINIMALE POUR ARRÊTER
        }}
        whileHover={{ scale: 1.02 }}
        whileDrag={{ 
          scale: 1.05,
          boxShadow: "0 20px 40px -12px rgba(0, 0, 0, 0.25)",
          zIndex: 50,
        }}
        className="absolute bg-white rounded-xl shadow-lg border-2 min-w-80 max-w-96 cursor-grab active:cursor-grabbing"
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          {/* HEADER DRAGGABLE */}
          <div 
            className="flex items-center gap-2 px-3 py-2 border-b cursor-grab active:cursor-grabbing relative"
            style={{ 
              backgroundColor: `${group.color}15`,
              borderColor: group.color 
            }}
          >
            {/* INDICATEUR DE SÉLECTION */}
            {isSelected && (
              <div className="absolute -left-2 -top-2 w-3 h-3 bg-orange-500 rounded-full border-2 border-white shadow-sm" />
            )}

            <GripVertical size={16} style={{ color: group.color }} className="shrink-0" />

              {/* TITRE - ÉDITION MANUELLE OU AFFICHAGE */}
                    {isEditing ? (
                      <input
                        type="text"
                        value={tempTitle}
                        onChange={(e) => setTempTitle(e.target.value)}
                        onBlur={handleTitleSave}
                        onKeyDown={handleKeyDown}
                        className="flex-1 font-semibold text-sm bg-white border outline-none px-2 py-1 rounded transition-all"
                        style={inputStyle}
                        autoFocus
                      />
                    ) : (
                      <h3 
                        className="flex-1 font-semibold text-sm cursor-text select-text hover:bg-gray-50 px-2 py-1 rounded transition-colors"
                        style={{ color: group.color }}
                        onClick={handleTitleClick}
                        title="Click to edit title"
                      >
                        {group.title}
                      </h3>
                    )}


            <div className="flex items-center gap-2">
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                {groupInsights.length}
              </span>
    
              {/* 🎯 BOUTON IA SEULEMENT SI LE GROUPE A DES INSIGHTS */}
              {hasInsights && (
                <GroupNameAssistant
                  group={group}
                  insights={insights}
                  currentTitle={group.title}
                  onTitleUpdate={(newTitle) => onTitleUpdate?.(group.id, newTitle)}
                  projectContext={projectContext}
                />
              )}
    
                  {workspaceMode === 'voting' && (
                    <button className="p-1 text-gray-400 hover:text-purple-500 transition-colors">
                      <Vote size={14} />
                    </button>
                  )}
                  
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete?.(group.id);
                }}
                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                title="Delete group"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          {/* INSIGHTS CONTENT */}
         <div 
  className={`p-3 space-y-2 max-h-60 overflow-y-auto transition-colors ${
    isDragOver ? 'bg-blue-50' : 'bg-white'
  }`}
  onWheel={(e) => {
    // 🎯 EMPÊCHER LA PROPAGATION DU SCROLL AU CANVAS
    e.stopPropagation();
  }}
  onTouchMove={(e) => {
    // 🎯 POUR MOBILE AUSSI
    e.stopPropagation();
  }}
>
            {groupInsights.map(insight => (
              <div
                key={insight.id}
                className="p-2 bg-gray-50 rounded border border-gray-100 text-sm text-gray-700"
              >
                <div className="flex items-start justify-between">
                  <span className={`text-xs px-1.5 py-0.5 rounded mr-2 ${
                    insight.type === 'pain-point' ? 'bg-red-100 text-red-700' :
                    insight.type === 'quote' ? 'bg-blue-100 text-blue-700' :
                    insight.type === 'insight' ? 'bg-purple-100 text-purple-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {insight.type.charAt(0).toUpperCase()}
                  </span>
                  <span className="flex-1 text-sm">{insight.text}</span>
                  
                  {workspaceMode === 'grouping' && onRemoveInsight && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveInsight(insight.id, group.id);
                      }}
                      className="ml-2 text-gray-400 hover:text-red-500 transition-colors shrink-0"
                      title="Remove from group"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {groupInsights.length === 0 && (
              <div className={`text-center py-4 text-sm ${
                isDragOver ? 'text-blue-600 font-medium' : 'text-gray-400'
              }`}>
                {workspaceMode === 'grouping' 
                  ? (isDragOver ? '✨ Drop insights here!' : 'Drag insights here to group them')
                  : 'No insights in this group'
                }
              </div>
            )}
          </div>
        </motion.div>
      </ContextMenuTrigger>

      {/* 🆕 CONTEXT MENU SHADCN */}
      <ContextMenuContent className="w-64">
        <div className="px-2 py-1.5 text-sm font-semibold text-gray-900 border-b">
            {group.title}
          </div>
          
          <ContextMenuItem 
            onClick={handleTitleClick}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Edit3 size={14} />
            Rename Group
          </ContextMenuItem>
          
          {/* 🎯 OPTION IA SEULEMENT SI DES INSIGHTS */}
          {hasInsights && (
            <ContextMenuItem 
              onClick={() => {
                // Ouvrir le popover IA
                // On peut utiliser une ref pour déclencher l'ouverture
              }}
              className="flex items-center gap-2 cursor-pointer"
            >
              <Sparkles size={14} />
              AI Name Suggestions
            </ContextMenuItem>
          )}
          
          <ContextMenuItem 
            onClick={handleDuplicate}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Copy size={14} />
            Duplicate Group
          </ContextMenuItem>
          
          <ContextMenuSeparator />
          
          <ContextMenuItem 
            onClick={handleDelete}
            className="flex items-center gap-2 cursor-pointer text-red-600 focus:text-red-600"
          >
            <Trash2 size={14} />
            Delete Group
          </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}