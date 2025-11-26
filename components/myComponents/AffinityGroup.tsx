"use client";

import { motion, PanInfo } from "framer-motion";
import { Trash2, Vote, GripVertical, Edit, Copy, Edit3, Sparkles, VolumeX } from "lucide-react";
import React, { useState, useCallback, useMemo } from "react";
import { AffinityGroup as AffinityGroupType, Comment, DotVotingSession, Insight } from "@/types";
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
import { hashCode } from "@/utils/hashCodes";
import { useAuth, useUser } from "@clerk/nextjs";
import { CommentPanel } from "./CommentPanel";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useSilentSorting } from "@/hooks/useSilentSorting";

interface AffinityGroupProps {
  group: AffinityGroupType;
  insights: Insight[];
  scale: number;
  isDragOver: boolean;
  workspaceMode: 'grouping' | 'voting';
  projectContext?: string;
  
  // 🎯 CORRECTION: RENDRE LES PROPS OBLIGATOIRES OU DONNER DES VALEURS PAR DÉFAUT
  onMove: (groupId: string, position: { x: number; y: number }) => void;
  onDelete?: (groupId: string) => void;
  onTitleUpdate?: (groupId: string, title: string) => void;
  onRemoveInsight?: (insightId: string, groupId: string) => void;
  onSelect: (groupId: string, e: React.MouseEvent) => void;
  isSelected: boolean;
  isHighlighted?: boolean;
  
  // 🎯 DRAG & DROP - RENDRE OBLIGATOIRES AVEC FONCTIONS VIDES PAR DÉFAUT
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  
  onInsightDragStart?: (insightId: string, groupId: string) => void;
  onInsightDrop?: (insightId: string, targetGroupId: string) => void;
  sharedSelections?: Record<string, string[]>;
  currentUserId?: string;
    onOpenComments?: ( groupId: string, position: { x: number; y: number }, groupTitle: string) => void;
  mapId: string;
  commentCounts?: Record<string, number>;
  comments?: Comment[];
  
  // 🎯 NOUVELLES PROPS POUR LA PRÉSENTATION
  isPresentationMode?: boolean;
  isFocusedInPresentation?: boolean;
  presentationScale?: number;

   isPlacingDot?: boolean; // 🆕 AJOUTER CETTE PROP

     // 🎯 NOUVELLES PROPS POUR LE VOTE SIMPLE
  activeSessionId?: string;
  activeSession?:DotVotingSession
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
  onDrop, // 🎯 MAINTENANT OBLIGATOIRE
  onInsightDragStart,
  onInsightDrop,
  workspaceMode,
  projectContext,
  sharedSelections,
  currentUserId,
  onOpenComments,
  mapId,
  commentCounts,
  comments,
  
  // 🎯 NOUVELLES PROPS
  isPresentationMode = false,
  isFocusedInPresentation = false,
  presentationScale = 1,
    // 🎯 NOUVELLES PROPS
  isPlacingDot = false,
  activeSessionId,
  activeSession,
}: AffinityGroupProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempTitle, setTempTitle] = useState(group.title);
  // 🆕 AJOUTER APRÈS LES AUTRES useStates DANS AffinityCanvas.tsx
const [applyingAction, setApplyingAction] = useState<string | null>(null);
const [highlightedGroups, setHighlightedGroups] = useState<Set<string>>(new Set());
// const [showComments, setShowComments] = useState(false);

const [showComments, setShowComments] = useState<{
  groupId: string;
  screenRect: DOMRect;
  groupTitle: string;
} | null>(null);
const { user } = useUser();


const isNew = comments?.some(
  (c) => Date.now() - c.createdAt < 5 * 60 * 1000 // ✅ 5 minutes
);


const unreadCount = useQuery(api.comments.getUnreadCount, {
  groupId: group.id,
  userId: currentUserId!,
  mapId: mapId as Id<"affinityMaps">,
});


// 🎯 Trouve qui a sélectionné ce groupe (autre que moi)
const sharedUser = Object.entries(sharedSelections || {}).find(
  ([userId, groupIds]) =>
    userId !== currentUserId && (groupIds as string[]).includes(group.id)
);

  const [isDragging, setIsDragging] = useState(false);

  const x = useMotionValue(group.position.x);
  const y = useMotionValue(group.position.y);

  const rotateX = useTransform(y, [-100, 0, 100], [1, 0, -1]);
  const rotateY = useTransform(x, [-100, 0, 100], [-1, 0, 1]);

    // 🎯 QUERIES POUR LES DOTS DU GROUPE
  const groupDots = useQuery(api.dotVoting.getDotsByTarget, 
    activeSessionId ? {
      sessionId: activeSessionId as Id<"dotVotingSessions">,
      targetType: 'group',
      targetId: group.id
    } : "skip"
  );

    // 🎯 MUTATION POUR PLACER UN DOT
  const placeDot = useMutation(api.dotVoting.placeDot);

  // 🎯 CALCULER LES INSIGHTS DU GROUPE
  const groupInsights = useMemo(() => 
    insights.filter(insight => group.insightIds.includes(insight.id)),
    [insights, group.insightIds]
  );
// 🎯 CORRECTION : Utiliser groupInsights.length directement
const hasInsights = groupInsights.length > 0;

// Sorting
  const { isSilentSortingActive, currentPhase } = useSilentSorting(mapId);
  
  // 🎯 RESTREINDRE LES INTERACTIONS PENDANT LE SILENT SORTING
  const canInteract = !isSilentSortingActive || currentPhase === 'discussion';



// ==================== handle events ====================


// 🎯 FONCTIONS PAR DÉFAUT POUR LES PROPS OPTIONNELLES
  const handleDelete = useCallback((groupId: string) => {
    onDelete?.(groupId); // 🎯 APPEL SEULEMENT SI LA FONCTION EXISTE
  }, [onDelete]);

  const handleTitleUpdate = useCallback((groupId: string, title: string) => {
    onTitleUpdate?.(groupId, title);
  }, [onTitleUpdate]);

  const handleRemoveInsight = useCallback((insightId: string, groupId: string) => {
    onRemoveInsight?.(insightId, groupId);
  }, [onRemoveInsight]);

const handleInsightDragStart = useCallback((e: React.DragEvent, insightId: string) => {
  if (isPresentationMode) return;
  
  e.stopPropagation();
  console.log('🧩 Starting to drag insight:', insightId, 'from group:', group.id);
  
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', insightId);
  e.dataTransfer.setData('application/group-id', group.id);
  e.dataTransfer.setData('application/insight-drag', 'true');
  
  onInsightDragStart?.(insightId, group.id);
  
  const element = e.currentTarget as HTMLElement;
  element.style.opacity = '0.4';
  e.stopPropagation();
}, [group.id, isPresentationMode, onInsightDragStart]);

const handleInsightDrop = useCallback((e: React.DragEvent, targetGroupId: string) => {
  if (isPresentationMode) return;
  
  e.stopPropagation();
  e.preventDefault();
  
  const insightId = e.dataTransfer.getData('text/plain');
  const sourceGroupId = e.dataTransfer.getData('application/group-id');
  
  console.log('🎯 Dropping insight:', {
    insightId,
    fromGroup: sourceGroupId,
    toGroup: targetGroupId
  });
  
  const element = e.currentTarget as HTMLElement;
  element.style.backgroundColor = '';
  element.style.borderColor = '';
  
  const isValidDrop = !sourceGroupId || sourceGroupId !== targetGroupId;
  
  if (isValidDrop && insightId) {
    onInsightDrop?.(insightId, targetGroupId);
  }
}, [isPresentationMode, onInsightDrop]);



// 🆕 MODIFIER handleOpenComments POUR INCLURE LE TITRE
const handleOpenComments = useCallback((
  groupId: string, 
  position: { x: number; y: number }, 
  groupTitle: string
) => {
  const rect = new DOMRect(position.x, position.y, 0, 0);
  setShowComments({ 
    groupId, 
    screenRect: rect,
    groupTitle // 🆕 TITRE REÇU DIRECTEMENT
  });
}, []);
// 🎯 AJOUTER CES ÉTATS LOCAUX EN HAUT DU COMPOSANT
const [localDots, setLocalDots] = useState<Array<{id: string, x: number, y: number, color: string}>>([]);

// ==================== handle fin ==================== 



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
  if (isPresentationMode) return; // 🚫 DÉSACTIVÉ EN PRÉSENTATION
  setTempTitle(group.title);
  setIsEditing(true);
}, [group.title, isPresentationMode]);

const handleDuplicate = useCallback(() => {
  if (isPresentationMode) return; // 🚫 DÉSACTIVÉ EN PRÉSENTATION
  // Logique de duplication (à implémenter si besoin)
  console.log("Duplicate group:", group.id);
  toast.info("Duplicate functionality coming soon");
}, [group.id, isPresentationMode]);


  // const handleDelete = useCallback(() => {
  //   onDelete?.(group.id);
  // }, [group.id, onDelete]);

    // Handler pour le drop sur le groupe entier
  const handleGroupDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const insightId = e.dataTransfer.getData('text/plain');
    console.log('🎯 Group drop received:', insightId);
    
    // Appeler le handler parent
    onDrop(e);
  };

// ====================== Gestionnaires conditionnels ======================

 /**
   * 🎯 GESTIONNAIRE DE MOUVEMENT - DÉSACTIVÉ EN PRÉSENTATION
   */
  const handleMove = useCallback((groupId: string, position: { x: number; y: number }) => {
    if (isPresentationMode) return; // 🚫 DÉSACTIVÉ EN PRÉSENTATION
    onMove(groupId, position);
  }, [onMove, isPresentationMode]);

  /**
   * 🎯 GESTIONNAIRE DE DROP - DÉSACTIVÉ EN PRÉSENTATION
   */
  const handleDrop = useCallback((e: React.DragEvent) => {
    if (isPresentationMode) return; // 🚫 DÉSACTIVÉ EN PRÉSENTATION
    onDrop(e);
  }, [onDrop, isPresentationMode]);

  /**
   * 🎯 GESTIONNAIRE DE DRAG OVER - DÉSACTIVÉ EN PRÉSENTATION
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (isPresentationMode) return; // 🚫 DÉSACTIVÉ EN PRÉSENTATION
    onDragOver(e);
  }, [onDragOver, isPresentationMode]);

  /**
   * 🎯 GESTIONNAIRE DE DRAG LEAVE - DÉSACTIVÉ EN PRÉSENTATION
   */
  const handleDragLeave = useCallback(() => {
    if (isPresentationMode) return; // 🚫 DÉSACTIVÉ EN PRÉSENTATION
    onDragLeave();
  }, [onDragLeave, isPresentationMode]);


//=========== Drag & Drop ===========
// Dans AffinityGroup.tsx - AJOUTER CES HANDLERS :

// 🆕 Handler quand on commence à drag un insight
// 🆕 Handler amélioré pour le drag d'insight
// const handleInsightDragStart = (e: React.DragEvent, insightId: string) => {
//   e.stopPropagation();
//   console.log('🧩 Starting to drag insight:', insightId, 'from group:', group.id);
  
//   e.dataTransfer.effectAllowed = 'move';
//   e.dataTransfer.setData('text/plain', insightId);
//   e.dataTransfer.setData('application/group-id', group.id);
//   e.dataTransfer.setData('application/insight-drag', 'true'); // 🆕 Identifier que c'est un insight qu'on drag
  
//   // Notifier le parent
//   onInsightDragStart?.(insightId, group.id);
  
//   // Style visuel
//   const element = e.currentTarget as HTMLElement;
//   element.style.opacity = '0.4';
  
//   // 🆕 IMPORTANT: Empêcher la propagation pour éviter le drag du groupe
//   e.stopPropagation();
// };

// 🆕 Handler quand on drag over un insight
const handleInsightDragOver = useCallback((e: React.DragEvent) => {
  if (isPresentationMode) return;
  
  e.stopPropagation();
  e.preventDefault();
  
  const sourceGroupId = e.dataTransfer.getData('application/group-id');
  if (sourceGroupId && sourceGroupId !== group.id) {
    e.dataTransfer.dropEffect = 'move';
    
    const element = e.currentTarget as HTMLElement;
    element.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
    element.style.borderColor = '#3B82F6';
  }
}, [group.id, isPresentationMode]);

// 🆕 Handler quand on quitte le drag
const handleInsightDragLeave = useCallback((e: React.DragEvent) => {
  if (isPresentationMode) return;
  
  e.stopPropagation();
  
  const element = e.currentTarget as HTMLElement;
  element.style.backgroundColor = '';
  element.style.borderColor = '';
}, [isPresentationMode]);

// 🆕 Handler quand on drop un insight
// const handleInsightDrop = (e: React.DragEvent, targetGroupId: string) => {
//   e.stopPropagation();
//   e.preventDefault();
  
//   const insightId = e.dataTransfer.getData('text/plain');
//   const sourceGroupId = e.dataTransfer.getData('application/group-id');
  
//   console.log('🎯 Dropping insight:', {
//     insightId,
//     fromGroup: sourceGroupId,
//     toGroup: targetGroupId
//   });
  
//   // Reset du style
//   const element = e.currentTarget as HTMLElement;
//   element.style.backgroundColor = '';
//   element.style.borderColor = '';
  
//   // Only process if it's from a different group
//   if (sourceGroupId && sourceGroupId !== targetGroupId && insightId) {
//     onInsightDrop?.(insightId, targetGroupId);
//   }
// };

// 🆕 Handler de fin de drag
const handleInsightDragEnd = useCallback((e: React.DragEvent) => {
  if (isPresentationMode) return;
  
  e.stopPropagation();
  
  const element = e.currentTarget as HTMLElement;
  element.style.opacity = '1';
  element.style.backgroundColor = '';
  element.style.borderColor = '';
}, [isPresentationMode]);




//
  const inputStyle = {
  color: group.color,
  border: `1px solid ${group.color}40`,
  backgroundColor: 'white'
};




// 🎯 Est-ce que quelqu’un d’autre a sélectionné ce groupe ?
const isSelectedByOther = Object.entries(sharedSelections || {}).some(
  ([userId, groupIds]) =>
    userId !== currentUserId && (groupIds as string[]).includes(group.id)
);

// console.log("🧪 sharedSelections :", sharedSelections);
// console.log("🧪 currentUserId :", currentUserId)



const myMentions = useQuery(api.comments.getMentionsForUser, {
  mapId : mapId as Id<"affinityMaps">,
  userName: user?.fullName || user?.firstName || "",
});

const amIMentioned = myMentions?.includes(group.id);

// ==================== EFFETS VISUELS POUR LA PRÉSENTATION ====================
  
  /**
   * 🎯 CALCUL DU STYLE SPÉCIAL PENDANT LA PRÉSENTATION
   * Quand isFocusedInPresentation = true, on applique des effets visuels
   * pour mettre ce groupe en avant devant tous les autres
   */
  const getPresentationStyles = () => {
    if (!isPresentationMode) return {};
    
    return {
      // 🎯 EFFET DE ZOOM SUR LE GROUPE FOCUS
      transform: `scale(${isFocusedInPresentation ? presentationScale : 1})`,
      
      // 🎯 ANIMATION DOUCE POUR LES TRANSITIONS
      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      
      // 🎯 SURBRILLANCE AVEC OMBRE PORTÉE
      boxShadow: isFocusedInPresentation 
        ? '0 25px 50px -12px rgba(59, 130, 246, 0.5), 0 0 0 4px rgba(59, 130, 246, 0.3)' 
        : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      
      // 🎯 COUCHE Z-INDEX POUR QUE LE GROUPE FOCUS SOIT AU-DESSUS
      zIndex: isFocusedInPresentation ? 1000 : 20,
      
      // 🎯 OPACITÉ RÉDUITE POUR LES GROUPES NON FOCUS
      opacity: isFocusedInPresentation ? 1 : 0.4,
    };
  };

  /**
   * 🎯 COULEUR DE BORDURE SPÉCIALE PENDANT LA PRÉSENTATION
   * On utilise une bordure bleue plus épaisse pour le groupe focus
   */
  const getBorderColor = () => {
    // Si on est en mode présentation ET ce groupe est focus → bordure bleue
    if (isPresentationMode && isFocusedInPresentation) return "#3B82F6";
    
    // Sinon, on garde le comportement normal
    if (isDragOver) return "#3B82F6";
    if (isSelected) return "#F59E0B"; 
    if (isHighlighted) return "#10B981";
    return group.color;
  };

  /**
   * 🎯 GESTION DU DRAG - DÉSACTIVÉ EN MODE PRÉSENTATION
   * On empêche de déplacer les groupes pendant une présentation
   */
  const canDrag = !isSelectedByOther && !isPresentationMode;

  // ==================== GESTION DES INTERACTIONS ====================
  

  // 🎯 FONCTION POUR GÉNÉRER UNE COULEUR UNIQUE PAR UTILISATEUR
const getUserColor = useCallback((userId: string) => {
  const colors = ["#EF4444", "#F59E0B", "#10B981", "#3B82F6", "#8B5CF6", "#EC4899"];
  const hash = userId.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  return colors[hash % colors.length];
}, []);
  /**
   * 🎯 CLICK SUR UN GROUPE - COMPORTEMENT DIFFÉRENT EN PRÉSENTATION
   * En mode normal: sélectionne le groupe
   * En mode présentation: navigation vers ce groupe
   */
 // 🎯 FONCTION SIMPLIFIÉE POUR AJOUTER UN DOT
// 🎯 FONCTION ULTRA-SIMPLE POUR AJOUTER UN DOT
const handleAddDot = useCallback(async (e: React.MouseEvent) => {
 console.log('🎯 [START] handleAddDot called', { isPlacingDot, activeSessionId, currentUserId });

  if (!isPlacingDot || !activeSessionId || !currentUserId) {
    console.log('❌ [STOP] Conditions not met', { isPlacingDot, activeSessionId, currentUserId });
    return;
  }
  e.stopPropagation();
  e.preventDefault();

  // 🎯 POSITION RELATIVE SIMPLE
  const rect = e.currentTarget.getBoundingClientRect();
  const position = {
    x: e.clientX - rect.left - 12,
    y: e.clientY - rect.top - 12
  };

  // 🎯 COULEUR FIXE POUR TEST (on simplifie)
  const userColor = getUserColor(currentUserId!); // Bleu fixe pour test

  console.log('🎯 Adding dot locally:', { position, groupId: group.id });

  // 🎯 1. AJOUTER LOCALEMENT IMMÉDIATEMENT
  const tempDotId = `local-${Date.now()}-${Math.random()}`;
  setLocalDots(prev => [...prev, {
    id: tempDotId,
    x: position.x,
    y: position.y,
    color: userColor
  }]);

  // 🎯 2. ENVOYER À LA BASE (sans attendre)
  try {
    const result = await placeDot({
      sessionId: activeSessionId as Id<"dotVotingSessions">,
      targetType: 'group',
      targetId: group.id,
      position,
    });
    
    if (result.success) {
      console.log('✅ Dot saved to database');
      // 🎯 REMPLACER LE DOT TEMPORAIRE PAR LE VRAI
      setLocalDots(prev => prev.filter(dot => dot.id !== tempDotId));
    } else {
      console.log('❌ Max dots reached');
      // Garder le dot local
    }
  } catch (error) {
    console.error('❌ Failed to save dot:', error);
    // Garder le dot local
  }
}, [isPlacingDot, activeSessionId, currentUserId, placeDot, group.id]);


 const handleClick = useCallback((e: React.MouseEvent) => {
    // 🎯 EN MODE VOTE, UTILISER handleAddDot
    if (isPlacingDot) {
      handleAddDot(e);
      return;
    }
    
    // COMPORTEMENT NORMAL
    if (isPresentationMode) {
      e.stopPropagation();
      return;
    }

    const isTaken = Object.entries(sharedSelections || {}).some(
      ([userId, groupIds]) =>
        userId !== currentUserId && (groupIds as string[]).includes(group.id)
    );
    
    if (isTaken) {
      return;
    }
    
    e.stopPropagation();
    onSelect(group.id, e);
  }, [isPlacingDot, isPresentationMode, sharedSelections, currentUserId, group.id, onSelect, handleAddDot]);

  /**
   * 🎯 DRAG START - DÉSACTIVÉ EN PRÉSENTATION
   */
  const handleDragStart = useCallback(() => {
    if (isPresentationMode) return; // 🚫 Pas de drag en présentation
    setIsDragging(true);
  }, [isPresentationMode]);

// console.log("🎨 Surbrillance render pour groupe :", group.id);



// ====================== RENDU ======================

  return (
    <ContextMenu>
      <ContextMenuTrigger>
     <motion.div
          data-group-id={group.id}
          drag={!isSelectedByOther && !isPresentationMode}
          dragMomentum={false}
          dragElastic={0}
          
          // 🎯 UTILISER LES GESTIONNAIRES CONDITIONNELS
          onDragStart={(e) => {
            if (isPresentationMode) return;
            const data = e as unknown as React.DragEvent;
            const isInsightDrag = data.dataTransfer?.types.includes('application/insight-drag');
            if (!isInsightDrag) {
              handleDragStart();
            }
          }}
          onDragEnd={isPresentationMode ? undefined : handleDragEnd}
          onClick={handleClick}
          
          // 🎯 GESTIONNAIRES DE DRAG CORRIGÉS
          onDragOver={handleDragOver} // 🎯 TOUJOURS DÉFINI MAINTENANT
          onDragLeave={handleDragLeave} // 🎯 TOUJOURS DÉFINI MAINTENANT
          onDrop={handleDrop} // 🎯 TOUJOURS DÉFINI MAINTENANT
          
          style={{ 
            ...getPresentationStyles(),
            x, 
            y,
            rotateX: isDragging ? rotateX : 0,
            rotateY: isDragging ? rotateY : 0,
            borderColor: getBorderColor(),
            borderWidth: (isPresentationMode && isFocusedInPresentation) ? '4px' : '2px',
            pointerEvents: isPresentationMode ? 'none' : 'auto'
          }}
          
      className={`absolute bg-white rounded-xl shadow-lg border-2 min-w-80 max-w-96 ${
          isPresentationMode 
            ? 'cursor-default' 
            : 'cursor-grab active:cursor-grabbing'
        } ${isPlacingDot ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}
         ${
        !canInteract ? 'opacity-80 cursor-not-allowed' : 'cursor-grab'
      }
        `} // 🆕 EFFET VISUEL
        >

        {/* {showComments && (
          <CommentPanel
            mapId={mapId}
            groupId={group.id}
            onClose={() => setShowComments(false)}
          />
        )} */}

          {!canInteract && isSilentSortingActive && (
        <div className="absolute inset-0 bg-white/50 rounded-xl flex items-center justify-center z-10">
          <div className="text-center p-4">
            <VolumeX className="w-8 h-8 mx-auto mb-2 text-gray-500" />
            <p className="text-sm text-gray-600">Silent sorting in progress</p>
            <p className="text-xs text-gray-500">No discussion allowed</p>
          </div>
        </div>
      )}
        {unreadCount && unreadCount > 0 ? (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white shadow-sm" />
        ) : null}

        {/* 🎯 Surbrillance partagée (autre utilisateur) */}
        {Object.entries(sharedSelections || {}).some(
          ([userId, groupIds]) =>
            userId !== currentUserId && (groupIds as string[]).includes(group.id)
        ) && (
          <div
            className="absolute inset-0 rounded-xl border-2 pointer-events-none"
            style={{
              borderColor: `hsl(${Math.abs(group.id.split("").reduce((a, b) => a + b.charCodeAt(0), 0)) % 360}, 70%, 60%)`,
            }}
          />
        )}
        {/* 🎯 Ma sélection perso (bleue) */}
        {isSelected && (
          <div className="absolute inset-0 rounded-xl border-2 border-blue-500 pointer-events-none" />
        )}

        {/* 🎯 Verrou visuel si pris */}
        {Object.entries(sharedSelections || {}).some(
          ([userId, groupIds]) =>
            userId !== currentUserId && (groupIds as string[]).includes(group.id)
        ) && (
          <div className="absolute top-2 right-2 text-xs bg-red-500 text-white px-2 py-1 rounded pointer-events-none">
            🔒
          </div>
        )}
       {isSelectedByOther && (
          <div className="absolute top-2 right-2 text-xs bg-red-500 text-white px-2 py-1 rounded-full font-semibold pointer-events-none z-10">
            🔒 Locked
          </div>
        )}

            {sharedUser && (
                <div
                 className="absolute inset-0 rounded-xl border-2 pointer-events-none"
                 style={{
                   borderColor: `hsl(${hashCode(sharedUser[0]) % 360}, 70%, 60%)`,
                   boxShadow: `0 0 0 3px hsl(${hashCode(sharedUser[0]) % 360}, 70%, 60%, 0.3)`,
                 }}
               />
               )}
          {/* HEADER DRAGGABLE */}
        <div 
            className="flex items-center gap-2 px-3 py-2 border-b cursor-grab active:cursor-grabbing relative"
            style={{ 
              backgroundColor: `${group.color}15`,
              borderColor: group.color,
              cursor: isPlacingDot ? 'crosshair' : 'grab'
            }}
            onMouseDown={(e) => {
              if (isPresentationMode) {
                e.preventDefault();
                return;
              }
              e.stopPropagation();
            }}
            onClick={handleAddDot}
          >
            

              
            {/* INDICATEUR PRÉSENTATION */}
            {isPresentationMode && isFocusedInPresentation && (
              <div className="absolute -top-2 -left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-semibold animate-pulse">
                🎯 Focus
              </div>
            )}
            {/* 🎯 INDICATEUR MODE VOTE */}
            {isPlacingDot && (
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center animate-pulse z-10">
                <span className="text-white text-xs">+</span>
              </div>
            )}

            <GripVertical 
              size={16} 
              style={{ 
                color: group.color,
                opacity: isPresentationMode ? 0.3 : 1,
                cursor: isPresentationMode ? 'default' : 'grab'
               }} 
              className="shrink-0"
              // 🎯 GRIP VISIBLE SEULEMENT HORS PRÉSENTATION

            />

              {/* TITRE - ÉDITION MANUELLE OU AFFICHAGE */}
  {/* TITRE */}
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
                readOnly={isPresentationMode}
              />
            ) : (
              <h3 
                className="flex-1 font-semibold text-sm cursor-text select-text hover:bg-gray-50 px-2 py-1 rounded transition-colors"
                style={{ color: group.color }}
                onClick={(e) => {
                  if (isPresentationMode || isPlacingDot) return;
                  handleTitleClick(e);
                }}
                title={isPresentationMode ? "" : "Click to edit title"}
              >
                {group.title}
                {isPlacingDot && " - Click to vote"}
              </h3>
            )}

            {/* BOUTONS D'ACTION */}
            <div className="flex items-center gap-2">
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                {groupInsights.length}
              </span>

              {/* BOUTON IA */}
              {hasInsights && !isPresentationMode && !isPlacingDot && (
                <GroupNameAssistant
                  group={group}
                  insights={insights}
                  currentTitle={group.title}
                  onTitleUpdate={(newTitle: string) => {
                    handleTitleUpdate(group.id, newTitle);
                  }}
                  projectContext={projectContext}
                />
              )}

              {/* BOUTON SUPPRIMER */}
              {!isPresentationMode && !isPlacingDot && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(group.id);
                  }}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  title="Delete group"
                >
                  <Trash2 size={14} />
                </button>
              )}

              {/* BOUTON COMMENTAIRES */}
              {!isPresentationMode && !isPlacingDot && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const rect = (e.currentTarget as HTMLElement)
                      .closest('[data-group-id]')!
                      .getBoundingClientRect();
                    
                    if (onOpenComments) {
                      onOpenComments(group.id, { x: rect.right, y: rect.top }, group.title);
                    }
                  }}
                  className="p-1 text-gray-400 hover:text-blue-500 transition-colors relative"
                  title="Add comment"
                >
                  💬
                  {amIMentioned && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
                  )}
                </button>
              )}
            </div>
          
          </div>

          {/* INSIGHTS CONTENT */}

          <div className={`p-3 space-y-2 max-h-60 overflow-y-auto ${
            isPresentationMode && isFocusedInPresentation 
              ? 'bg-blue-50 border-blue-200' 
              : 'bg-white'
          }`}
            // 🎯 GESTIONNAIRES DE DRAG POUR LE CONTENU
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
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
                draggable={workspaceMode === 'grouping' && !isSelectedByOther && !isPresentationMode && !isPlacingDot}
                onDragStart={(e) => {
                  if (isPresentationMode || isPlacingDot) return;
                  handleInsightDragStart(e, insight.id);
                }}
                onDragOver={handleInsightDragOver}
                onDragLeave={handleInsightDragLeave}
                onDrop={(e) => {
                  if (isPresentationMode || isPlacingDot) return;
                  handleInsightDrop(e, group.id);
                }}
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
                  
                  {workspaceMode === 'grouping' && onRemoveInsight && !isPresentationMode && !isPlacingDot && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveInsight(insight.id, group.id);
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
                {workspaceMode === 'grouping' && !isPlacingDot
                  ? (isDragOver 
                      ? '✨ Drop insights here!' 
                      : '↓ Drag insights here to group them')
                  : 'No insights in this group'
                }
                {isPlacingDot && 'Click to place your vote'}
              </div>
            )}
        </div>


         {/* 🎯 DOTS LOCAUX - TOUJOURS VISIBLES */}
        {localDots.map(dot => (
          <div
            key={dot.id}
            className="absolute w-8 h-8 rounded-full border-3 border-white shadow-lg flex items-center justify-center z-40 animate-bounce"
            style={{
              left: dot.x,
              top: dot.y,
              backgroundColor: dot.color,
            }}
            title="Your vote"
          >
            <span className="text-white text-xs font-bold">✓</span>
          </div>
        ))}


          {/* 🎯 DOTS DE VOTE - SIMPLES ET EFFICACES */}
        {groupDots && groupDots.map(dot => {
          // 🎯 LOGIQUE DE VISIBILITÉ CORRECTE
            const isMyDot = dot.userId === currentUserId;
              const isVisible = 
                isMyDot || 
                !activeSession?.isSilentMode ||
                activeSession?.votingPhase !== 'voting'; // "setup" sera traité comme "voting"

          console.log('🔍 Dot visibility:', {
            dotId: dot._id,
            isMyDot,
            isSilentMode: activeSession?.isSilentMode,
            votingPhase: activeSession?.votingPhase,
            isVisible
          });

          if (!isVisible) return null;

          return (
            <div
              key={dot._id}
              className="absolute w-8 h-8 rounded-full border-3 border-white shadow-lg flex items-center justify-center z-30 transition-transform hover:scale-110"
              style={{
                left: dot.position.x,
                top: dot.position.y,
                backgroundColor: dot.color || getUserColor(dot.userId),
              }}
              title={isMyDot ? "Your vote" : "Participant vote"}
            >
              {isMyDot && (
                <span className="text-white text-xs font-bold">✓</span>
              )}
            </div>
          );
        })}

        </motion.div>
      </ContextMenuTrigger>

      {/* 🆕 CONTEXT MENU SHADCN */}
{!isPresentationMode && (
  <ContextMenuContent className="w-64">
    <div className="px-2 py-1.5 text-sm font-semibold text-gray-900 border-b">
      {group.title}
    </div>
    
    {/* RENAME */}
    <ContextMenuItem 
      onClick={(e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        handleRename();
      }}
      className="flex items-center gap-2 cursor-pointer"
    >
      <Edit3 size={14} />
      Rename Group
    </ContextMenuItem>
    
    {/* AI SUGGESTIONS - SEULEMENT SI DES INSIGHTS */}
    {hasInsights && (
      <ContextMenuItem 
        onClick={(e: React.MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
          // Logique pour ouvrir le popover IA
          // (le composant GroupNameAssistant est déjà visible dans le header)
        }}
        className="flex items-center gap-2 cursor-pointer"
      >
        <Sparkles size={14} />
        AI Name Suggestions
      </ContextMenuItem>
    )}
    
    {/* DUPLICATE */}
    <ContextMenuItem 
      onClick={(e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        handleDuplicate();
      }}
      className="flex items-center gap-2 cursor-pointer"
    >
      <Copy size={14} />
      Duplicate Group
    </ContextMenuItem>
    
    <ContextMenuSeparator />
    
    {/* DELETE */}
    <ContextMenuItem 
      onClick={(e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        handleDelete(group.id);
      }}
      className="flex items-center gap-2 cursor-pointer text-red-600 focus:text-red-600"
    >
      <Trash2 size={14} />
      Delete Group
    </ContextMenuItem>
  </ContextMenuContent>
)}
    </ContextMenu>
  );
}