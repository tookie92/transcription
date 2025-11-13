"use client";

import { motion, PanInfo } from "framer-motion";
import { Trash2, Vote, GripVertical, Edit, Copy, Edit3, Sparkles } from "lucide-react";
import React, { useState, useCallback, useMemo } from "react";
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
import { toast } from "sonner";

interface AffinityGroupProps {
  group: AffinityGroupType;
  insights: Insight[];
  scale: number;
  isDragOver: boolean;
  workspaceMode: 'grouping' | 'voting';
  projectContext?: string;
  onMove: (groupId: string, position: { x: number; y: number }) => void;
  onDelete?: (groupId: string) => void;
  onTitleUpdate?: (groupId: string, title: string) => void;
  onRemoveInsight?: (insightId: string, groupId: string) => void;
  onSelect: (groupId: string, e: React.MouseEvent) => void;
  isSelected: boolean;
  isHighlighted?: boolean;
  
  // 🆕 PROPS DE DRAG & DROP
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void; // ✅ CETTE PROP DOIT EXISTER
  onInsightDragStart?: (insightId: string, groupId: string) => void;
  onInsightDrop?: (insightId: string, targetGroupId: string) => void;
}

export default function AffinityGroup({
    group,
  insights,
  scale,
  isSelected,
  isDragOver,
  isHighlighted,
  onMove,
  onDelete,
  onTitleUpdate,
  onRemoveInsight,
  onSelect,
  onDragOver,
  onDragLeave,
  onDrop, // ✅ MAINTENANT DISPONIBLE
  onInsightDragStart,
  onInsightDrop,
  workspaceMode,
  projectContext,
}: AffinityGroupProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempTitle, setTempTitle] = useState(group.title);
  // 🆕 AJOUTER APRÈS LES AUTRES useStates DANS AffinityCanvas.tsx
const [applyingAction, setApplyingAction] = useState<string | null>(null);
const [highlightedGroups, setHighlightedGroups] = useState<Set<string>>(new Set());


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
  // onDragStateChange?.(true); // ✅ Optionnel - pas besoin de dépendance
}, []); // 🆕 Tableau de dépendances vide

    const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(group.id, e);
  }, [group.id, onSelect]);


const handleDragEnd = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
  setIsDragging(false);
  // onDragStateChange?.(false); // ✅ Optionnel - pas besoin de dépendance
  
  const finalX = group.position.x + info.offset.x / scale;
  const finalY = group.position.y + info.offset.y / scale;
  
  onMove(group.id, { x: finalX, y: finalY });
}, [group.position.x, group.position.y, group.id, scale, onMove]); 

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

    // Handler pour le drop sur le groupe entier
  const handleGroupDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const insightId = e.dataTransfer.getData('text/plain');
    console.log('🎯 Group drop received:', insightId);
    
    // Appeler le handler parent
    onDrop(e);
  };

//=========== Drag & Drop ===========
// Dans AffinityGroup.tsx - AJOUTER CES HANDLERS :

// 🆕 Handler quand on commence à drag un insight
// 🆕 Handler amélioré pour le drag d'insight
const handleInsightDragStart = (e: React.DragEvent, insightId: string) => {
  e.stopPropagation();
  console.log('🧩 Starting to drag insight:', insightId, 'from group:', group.id);
  
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', insightId);
  e.dataTransfer.setData('application/group-id', group.id);
  e.dataTransfer.setData('application/insight-drag', 'true'); // 🆕 Identifier que c'est un insight qu'on drag
  
  // Notifier le parent
  onInsightDragStart?.(insightId, group.id);
  
  // Style visuel
  const element = e.currentTarget as HTMLElement;
  element.style.opacity = '0.4';
  
  // 🆕 IMPORTANT: Empêcher la propagation pour éviter le drag du groupe
  e.stopPropagation();
};

// 🆕 Handler quand on drag over un insight
const handleInsightDragOver = (e: React.DragEvent) => {
  e.stopPropagation();
  e.preventDefault();
  
  // Only allow drop if it's an insight from another group
  const sourceGroupId = e.dataTransfer.getData('application/group-id');
  if (sourceGroupId && sourceGroupId !== group.id) {
    e.dataTransfer.dropEffect = 'move';
    
    // Feedback visuel
    const element = e.currentTarget as HTMLElement;
    element.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
    element.style.borderColor = '#3B82F6';
  }
};

// 🆕 Handler quand on quitte le drag
const handleInsightDragLeave = (e: React.DragEvent) => {
  e.stopPropagation();
  
  // Reset du style
  const element = e.currentTarget as HTMLElement;
  element.style.backgroundColor = '';
  element.style.borderColor = '';
};

// 🆕 Handler quand on drop un insight
const handleInsightDrop = (e: React.DragEvent, targetGroupId: string) => {
  e.stopPropagation();
  e.preventDefault();
  
  const insightId = e.dataTransfer.getData('text/plain');
  const sourceGroupId = e.dataTransfer.getData('application/group-id');
  
  console.log('🎯 Dropping insight:', {
    insightId,
    fromGroup: sourceGroupId,
    toGroup: targetGroupId
  });
  
  // Reset du style
  const element = e.currentTarget as HTMLElement;
  element.style.backgroundColor = '';
  element.style.borderColor = '';
  
  // Only process if it's from a different group
  if (sourceGroupId && sourceGroupId !== targetGroupId && insightId) {
    onInsightDrop?.(insightId, targetGroupId);
  }
};

// 🆕 Handler de fin de drag
const handleInsightDragEnd = (e: React.DragEvent) => {
  e.stopPropagation();
  
  // Reset du style
  const element = e.currentTarget as HTMLElement;
  element.style.opacity = '1';
  element.style.backgroundColor = '';
  element.style.borderColor = '';
};



//
  const inputStyle = {
  color: group.color,
  border: `1px solid ${group.color}40`,
  backgroundColor: 'white'
};

// 🆕 AJOUTER CETTE FONCTION DANS LE COMPOSANT (avant le return)
const getBorderColor = () => {
  if (isDragOver) return "#3B82F6";
  if (isSelected) return "#F59E0B"; 
  if (isHighlighted) return "#10B981";
  return group.color;
};

  return (
    <ContextMenu>
      <ContextMenuTrigger>
     <motion.div
        drag
        dragMomentum={false}
        dragElastic={0}
        onDragStart={(e) => {
          const data = e as unknown as React.DragEvent;
          // 🆕 VÉRIFIER si on drag un insight ou le groupe
          const isInsightDrag = data.dataTransfer?.types.includes('application/insight-drag');
          if (!isInsightDrag) {
            handleDragStart();
          }
        }}
        onDragEnd={handleDragEnd}
        onClick={handleClick}
        // 🆕 AJOUTER onDrop SUR LE GROUPE ENTIER
        // onDrop={handleGroupDrop} // ✅ UTILISER LA PROP
         onDrop={(e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            // 🆕 NE RIEN FAIRE - la zone des insights gère déjà le drop
          }}
        style={{ 
          x, 
          y,
          rotateX: isDragging ? rotateX : 0,
          rotateY: isDragging ? rotateY : 0,
          borderColor: getBorderColor(),
          borderWidth: isHighlighted ? '3px' : '2px',
          boxShadow: isHighlighted ? '0 0 0 3px rgba(16, 185, 129, 0.3)' : 'none',
          pointerEvents: isDragging ? 'none' : 'auto'
        }}
        className="absolute bg-white rounded-xl shadow-lg border-2 min-w-80 max-w-96 cursor-grab active:cursor-grabbing z-20"
        onDragOver={(e: React.DragEvent) => {
          if (workspaceMode === 'grouping') {
            e.preventDefault();
            e.stopPropagation();
            
            const sourceGroupId = e.dataTransfer.getData('application/group-id');
            const isFromPanel = !sourceGroupId; // 🆕 Vérifier si ça vient du panel
            
            // 🆕 AUTORISER LE DROP SI:
            // - Ça vient d'un autre groupe OU
            // - Ça vient du panel (pas de sourceGroupId)
            if (isFromPanel || (sourceGroupId && sourceGroupId !== group.id)) {
              onDragOver(e);
            }
          }
        }}
        onDragLeave={() => {
          onDragLeave?.();
        }}
      >
          {/* HEADER DRAGGABLE */}
          <div 
            className="flex items-center gap-2 px-3 py-2 border-b cursor-grab active:cursor-grabbing relative"
            style={{ 
              backgroundColor: `${group.color}15`,
              borderColor: group.color 
            }}
              onMouseDown={(e) => {
                e.stopPropagation();
              }}
              // 🆕 EMPÊCHER LE DROP D'INSIGHTS SUR LE HEADER
              onDragOver={(e: React.DragEvent) => {
                e.preventDefault();
                e.stopPropagation();
                // 🆕 NE PAS APPELER onDragOver - empêcher le drop ici
              }}
              onDrop={(e: React.DragEvent) => {
                e.preventDefault();
                e.stopPropagation();
                // 🆕 NE RIEN FAIRE - empêcher le drop sur le header
                toast.info("Drop insights in the group content area below");
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
            className={`p-3 space-y-2 max-h-60 overflow-y-auto transition-all ${
              isDragOver ? 'bg-blue-50 border-2 border-blue-300 border-dashed' : 'bg-white'
            }`}
            onDragOver={(e: React.DragEvent) => {
              if (workspaceMode === 'grouping') {
                e.preventDefault();
                e.stopPropagation();
                
                const sourceGroupId = e.dataTransfer.getData('application/group-id');
                const isFromPanel = !sourceGroupId;
                
                if (isFromPanel || (sourceGroupId && sourceGroupId !== group.id)) {
                  onDragOver(e);
                }
              }
            }}
            onDragLeave={() => {
              onDragLeave?.();
            }}
            onDrop={(e: React.DragEvent) => {
              if (workspaceMode === 'grouping') {
                e.preventDefault();
                e.stopPropagation();
                
                const insightId = e.dataTransfer.getData('text/plain');
                const sourceGroupId = e.dataTransfer.getData('application/group-id');
                
                console.log('🎯 Dropping insight in group content:', {
                  insightId,
                  fromGroup: sourceGroupId || 'panel',
                  toGroup: group.id
                });
                
                const isValidDrop = !sourceGroupId || sourceGroupId !== group.id;
                
                if (isValidDrop && insightId) {
                  onInsightDrop?.(insightId, group.id);
                  const message = sourceGroupId 
                    ? `Insight moved to "${group.title}"`
                    : `Insight added to "${group.title}"`;
                  toast.success(message);
                }
                
                onDragLeave?.();
              }
            }}
          >
          {/* onWheel={(e) => {
            // 🎯 EMPÊCHER LA PROPAGATION DU SCROLL AU CANVAS
            e.stopPropagation();
          }}
          onTouchMove={(e) => {
            // 🎯 POUR MOBILE AUSSI
            e.stopPropagation();
          }} */}
          {groupInsights.map(insight => (
            <div
              key={insight.id}
              className="p-2 bg-gray-50 rounded border border-gray-100 text-sm text-gray-700 cursor-move transition-all hover:bg-gray-100"
              draggable={workspaceMode === 'grouping'}
              onDragStart={(e) => handleInsightDragStart(e, insight.id)}
              onDragOver={handleInsightDragOver}
              onDragLeave={handleInsightDragLeave}
              onDrop={(e) => handleInsightDrop(e, group.id)}
              onDragEnd={handleInsightDragEnd}
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
              ? (isDragOver 
                  ? '✨ Drop insights here!' 
                  : '↓ Drag insights here to group them')
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