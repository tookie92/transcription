"use client";

import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import DraggableGroup from "./DraggableGroup";
import { GripVertical, Move, Plus, Redo2, Undo2 } from "lucide-react";
import { motion, } from "framer-motion";
import { Id } from "@/convex/_generated/dataModel";
import ConnectionsLayer from "./ConnectionLayer";
import { useAffinityToasts } from "@/hooks/useAffinityToasts";
import { toast } from "sonner";
import { GroupConnection } from "@/types";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";



interface AffinityGroup {
  id: string;
  title: string;
  color: string;
  position: { x: number; y: number };
  insightIds: Id<"insights">[];
}

interface Insight {
  id: string; // ← Laisser en string pour l'UI
  type: 'pain-point' | 'quote' | 'insight' | 'follow-up' | 'custom';
  text: string;
  timestamp: number;
}

interface AffinityCanvasProps {
  groups: AffinityGroup[];
  insights: Insight[];
  onGroupMove: (groupId: string, position: { x: number; y: number }) => void;
  onGroupCreate: (position: { x: number; y: number }) => void;
  onInsightDrop: (insightId: string, groupId: string) => void;
  onInsightRemoveFromGroup?: (insightId: string, groupId: string) => void;
  onGroupDelete?: (groupId: string) => void;
  onManualInsightCreate: (text: string, type: Insight['type']) => void;
  onGroupTitleUpdate?: (groupId: string, title: string) => void;
  onGroupsReplace?: (groups: AffinityGroup[]) => void;

    connections?: GroupConnection[];
  onConnectionCreate?: (sourceId: string, targetId: string, type: GroupConnection['type']) => void;
  onConnectionDelete?: (connectionId: Id<"groupConnections">) => void;
  onConnectionUpdate?: (connectionId: Id<"groupConnections">, updates: Partial<GroupConnection>) => void;
}

export default function AffinityCanvas({ 
  groups, 
  insights, 
  onGroupMove, 
  onGroupCreate,
  onInsightDrop,
  onInsightRemoveFromGroup,
  onGroupDelete,
  onManualInsightCreate,
  onGroupTitleUpdate,
  onGroupsReplace,
  connections = [], // 🆕 Valeur par défaut
  onConnectionCreate,
  onConnectionDelete,
  onConnectionUpdate
}: AffinityCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);
  const [draggedInsight, setDraggedInsight] = useState<string | null>(null);
  const [dragOverGroup, setDragOverGroup] = useState<string | null>(null);
  
  const [newInsightText, setNewInsightText] = useState("");
  const [newInsightType, setNewInsightType] = useState<Insight['type']>('insight');
  const [showAddInsight, setShowAddInsight] = useState(false);
  const [draggedInsightId, setDraggedInsightId] = useState<string | null>(null);

  const availableInsights = useMemo(() => {
  const usedInsightIds = new Set(groups.flatMap(group => group.insightIds));
  return insights.filter(insight => !usedInsightIds.has(insight.id as Id<"insights">));
}, [groups, insights]);


 // 🆕 INITIALISER LES TOASTS
  const {
    notifyConnectionCreated,
    notifyConnectionCreationStarted,
    notifyConnectionCreationCancelled,
    notifyConnectionDeleted,
    notifyConnectionError,
  } = useAffinityToasts();


  

 

  // 🗑️ MODIFIER LA SUPPRESSION DE CONNECTION
  

  // 🖱️ MODIFIER LE CLIC SUR UNE CONNECTION
 // 🖱️ MODIFIER LE CLIC SUR UNE CONNECTION POUR INCLURE L'OPTION DELETE





  // end toasts
const [selectedConnection, setSelectedConnection] = useState<GroupConnection | null>(null);

// 🖱️ MODIFIER LA SUPPRESSION DE CONNECTION POUR UTILISER LE BON HANDLER
const handleConnectionDelete = useCallback((connectionId: Id<"groupConnections">) => {
  const connection = connections.find(c => c.id === connectionId);
  
  // 🎯 OUVRE UN MODAL DE CONFIRMATION AVEC TOAST
  const shouldDelete = window.confirm(
    `Delete connection "${connection?.label || connection?.type}"?\n\n` +
    `From: ${groups.find(g => g.id === connection?.sourceGroupId)?.title}\n` +
    `To: ${groups.find(g => g.id === connection?.targetGroupId)?.title}`
  );
  
  if (shouldDelete) {
    onConnectionDelete?.(connectionId);
    notifyConnectionDeleted(connection?.label);
  }
}, [connections, groups, onConnectionDelete, notifyConnectionDeleted]);


// 🖱️ MODIFIER LE CLIC SUR UNE CONNECTION POUR OUVRIR LE DIALOG
const handleConnectionClick = useCallback((connection: GroupConnection) => {
  console.log("🔗 Connection clicked:", connection);
  setSelectedConnection(connection);
}, []);

// 🆕 HANDLER POUR FERMER LE DIALOG
const handleCloseConnectionDialog = useCallback(() => {
  setSelectedConnection(null);
}, []);

// 🆕 HANDLER POUR SUPPRIMER DEPUIS LE DIALOG
const handleDeleteFromDialog = useCallback(() => {
  if (selectedConnection) {
    handleConnectionDelete(selectedConnection.id);
    setSelectedConnection(null);
  }
}, [selectedConnection, handleConnectionDelete]);

// 🆕 HANDLER POUR ÉDITER DEPUIS LE DIALOG
const handleEditFromDialog = useCallback(() => {
  if (selectedConnection) {
    // TODO: Ouvrir le modal d'édition des connections
    console.log("Edit connection:", selectedConnection.id);
    // On pourrait ouvrir un autre dialog d'édition ici
    handleCloseConnectionDialog();
  }
}, [selectedConnection, handleCloseConnectionDialog]);


 // 🆕 STATE POUR LA POSITION DE LA SOURIS (pour la connection temporaire)
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
const [editingTitle, setEditingTitle] = useState("");

// 🆕 HANDLERS POUR LE CONTEXT MENU
const handleRenameRequest = useCallback((groupId: string) => {
  const group = groups.find(g => g.id === groupId);
  if (group) {
    setEditingGroupId(groupId);
    setEditingTitle(group.title);
  }
}, [groups]);

const handleTitleEditSave = useCallback(() => {
  if (editingGroupId && editingTitle.trim()) {
    onGroupTitleUpdate?.(editingGroupId, editingTitle.trim());
  }
  setEditingGroupId(null);
  setEditingTitle("");
}, [editingGroupId, editingTitle, onGroupTitleUpdate]);

const handleTitleEditCancel = useCallback(() => {
  setEditingGroupId(null);
  setEditingTitle("");
}, []);

// 🆕 HANDLER POUR LA CRÉATION DE CONNECTION DEPUIS LE MENU
const handleCreateConnectionFromGroup = useCallback((groupId: string) => {
  setConnectionMode('related'); // Mode par défaut
  setConnectionStart(groupId);
  console.log(`🔗 Connection started from context menu: ${groupId}`);
}, []);




  


  // 🆕 STATES POUR LE MODE CONNECTION
  const [connectionMode, setConnectionMode] = useState<GroupConnection['type'] | null>(null);
  const [connectionStart, setConnectionStart] = useState<string | null>(null);



   // 🖱️ MODIFIER LE HANDLER DE CRÉATION POUR ÊTRE PLUS INTELLIGENT
 // Simplifier le handler de création
const handleGroupConnectionStart = useCallback((groupId: string) => {
  if (connectionMode && connectionStart && connectionStart !== groupId) {
    // Créer la connection directement
    onConnectionCreate?.(connectionStart, groupId, connectionMode);
    setConnectionStart(null);
    setConnectionMode(null);
  } else if (connectionMode && !connectionStart) {
    // Premier clic : mémoriser le groupe de départ
    setConnectionStart(groupId);
    toast.info(`Click another group to connect with ${groups.find(g => g.id === groupId)?.title}`);
  }
}, [connectionMode, connectionStart, groups, onConnectionCreate]);

  // 🖱️ HANDLER POUR DÉMARRER UNE CONNECTION
  // const handleGroupConnectionStart = useCallback((groupId: string) => {
  //   if (connectionMode && !connectionStart) {
  //     // 🎯 Premier clic : mémorise le groupe de départ
  //     setConnectionStart(groupId);
  //     console.log(`🔗 Connection started from group: ${groupId}`);
  //   } else if (connectionMode && connectionStart && connectionStart !== groupId) {
  //     // 🎯 Deuxième clic : crée la connection
  //     console.log(`🔗 Creating connection: ${connectionStart} → ${groupId} (${connectionMode})`);
  //     onConnectionCreate?.(connectionStart, groupId, connectionMode);
  //     setConnectionStart(null);
  //     setConnectionMode(null);
  //   }
  // }, [connectionMode, connectionStart, onConnectionCreate]);

// ==================== UNDO/REDO STATES ====================

// 📚 Historique des états de groupes (pour undo/redo)
const [history, setHistory] = useState<{ groups: AffinityGroup[]; timestamp: number }[]>([]);

// 🎯 Index actuel dans l'historique
const [historyIndex, setHistoryIndex] = useState(-1);

// 🔄 Track les modifications pour éviter les sauvegardes inutiles
const [lastActionTime, setLastActionTime] = useState(0);



// ==================== HISTORY MANAGEMENT ====================

// 💾 Sauvegarde l'état actuel dans l'historique
const saveToHistory = useCallback((newGroups: AffinityGroup[], action: string = "modification") => {
  const now = Date.now();
  
  // 🎪 Évite les sauvegardes trop rapprochées (pendant le drag par exemple)
  if (now - lastActionTime < 500 && action === "drag") {
    return;
  }

  setLastActionTime(now);

  // 🎯 Crée une copie profonde des groupes
  const groupsSnapshot = JSON.parse(JSON.stringify(newGroups));
  
  setHistory(prev => {
    // 🗑️ Supprime les états "futurs" si on a fait undo puis une nouvelle action
    const newHistory = prev.slice(0, historyIndex + 1);
    
    // 💾 Ajoute le nouvel état
    newHistory.push({ 
      groups: groupsSnapshot, 
      timestamp: now 
    });
    
    // 📏 Limite l'historique à 50 états maximum (évite la surcharge mémoire)
    if (newHistory.length > 50) {
      newHistory.shift(); // Supprime le plus ancien
    }
    
    return newHistory;
  });
  
  setHistoryIndex(prev => Math.min(prev + 1, 49)); // Met à jour l'index
}, [historyIndex, lastActionTime]);

// ==================== UNDO/REDO ACTIONS ====================
// 🔄 MODIFIER LES FONCTIONS UNDO/REDO
const undo = useCallback(() => {
  if (historyIndex > 0) {
    const newIndex = historyIndex - 1;
    const previousState = history[newIndex];
    
    if (previousState && onGroupsReplace) {
      console.log("🔄 UNDO - Restoring", previousState.groups.length, "groups");
      onGroupsReplace(previousState.groups);
    }
    setHistoryIndex(newIndex);
  }
}, [historyIndex, history, onGroupsReplace]);

const redo = useCallback(() => {
  if (historyIndex < history.length - 1) {
    const newIndex = historyIndex + 1;
    const nextState = history[newIndex];
    
    if (nextState && onGroupsReplace) {
      console.log("🔄 REDO - Restoring", nextState.groups.length, "groups");
      onGroupsReplace(nextState.groups);
    }
    setHistoryIndex(newIndex);
  }
}, [historyIndex, history.length, history, onGroupsReplace]);




// ==================== MULTISELECTION STATES ====================

// 📦 Groupes actuellement sélectionnés (Ctrl+Clic)
const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
const [isMovingWithArrows, setIsMovingWithArrows] = useState(false);


// 🎯 Groupe "anchor" pour les sélections avec Shift+Clic
const [selectionAnchor, setSelectionAnchor] = useState<string | null>(null);

// 🖱️ Track si on est en train de faire une sélection rectangulaire
const [isSelecting, setIsSelecting] = useState(false);
const [selectionBox, setSelectionBox] = useState<{ start: { x: number; y: number }; end: { x: number; y: number } } | null>(null);

// ==================== ESC KEY ====================

// 🚫 ESC : Annule la sélection
const handleEscapeKey = useCallback((e: KeyboardEvent) => {
  if (e.key === 'Escape' && selectedGroups.size > 0) {
    e.preventDefault();
    setSelectedGroups(new Set()); // Vide complètement la sélection
    setSelectionAnchor(null);
  }
}, [selectedGroups]);

// ==================== ARROW KEYS ====================

// 🎯 FLÈCHES : Déplace les groupes sélectionnés
const handleArrowKeys = useCallback((e: KeyboardEvent) => {
  // Vérifie qu'on a des groupes sélectionnés et qu'on est pas en train de taper dans un input
  const isTypingInInput = e.target instanceof HTMLInputElement || 
                         e.target instanceof HTMLTextAreaElement;
  
  if (selectedGroups.size === 0 || isTypingInInput) return;

  // 📏 Distance de déplacement (pixels)
  const moveDistance = e.shiftKey ? 20 : 5; // 🎪 SHIFT + flèche = déplacement plus grand
  
  let deltaX = 0;
  let deltaY = 0;

  switch (e.key) {
    case 'ArrowUp':
      deltaY = -moveDistance;
      break;
    case 'ArrowDown':
      deltaY = moveDistance;
      break;
    case 'ArrowLeft':
      deltaX = -moveDistance;
      break;
    case 'ArrowRight':
      deltaX = moveDistance;
      break;
    default:
      return; // Pas une flèche, on sort
  }

  e.preventDefault(); // 🚫 Empêche le scroll de la page

  // 🎪 Animation feedback
  setIsMovingWithArrows(true);
  setTimeout(() => setIsMovingWithArrows(false), 150);

  // 🚀 Déplace tous les groupes sélectionnés
  selectedGroups.forEach(groupId => {
    const group = groups.find(g => g.id === groupId);
    if (group) {
      onGroupMove(groupId, {
        x: group.position.x + deltaX,
        y: group.position.y + deltaY
      });
    }
  });
}, [selectedGroups, groups, onGroupMove]);



// ============== Theme Groups ==============

 // 🖱️ HANDLER POUR TRACKER LA SOURIS DURANT LA CRÉATION
 
  const handleCanvasMouseMoveForConnection = useCallback((e: React.MouseEvent) => {
    if (connectionMode && connectionStart) {
      const rect = canvasRef.current!.getBoundingClientRect();
      const x = (e.clientX - rect.left - position.x) / scale;
      const y = (e.clientY - rect.top - position.y) / scale;
      setMousePosition({ x, y });
    }
  }, [connectionMode, connectionStart, position.x, position.y, scale]);

  



// ==================== SELECTION HANDLERS ====================

// 🖱️ Quand on clique sur un groupe
const handleGroupClick = useCallback((groupId: string, e: React.MouseEvent) => {
  e.stopPropagation();
  
  // 🎪 SHIFT + CLIC : Sélection range (comme fichiers dans l'explorateur)
  if (e.shiftKey && selectionAnchor) {
    const groupIds = groups.map(g => g.id);
    const anchorIndex = groupIds.indexOf(selectionAnchor);
    const targetIndex = groupIds.indexOf(groupId);
    
    if (anchorIndex !== -1 && targetIndex !== -1) {
      const start = Math.min(anchorIndex, targetIndex);
      const end = Math.max(anchorIndex, targetIndex);
      const newSelection = new Set(groupIds.slice(start, end + 1));
      setSelectedGroups(newSelection);
      return;
    }
  }
  
  // 🎪 CTRL/CMD + CLIC : Ajouter/retirer de la sélection
  if (e.ctrlKey || e.metaKey) {
    setSelectedGroups(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(groupId)) {
        newSelection.delete(groupId); // Dé-sélectionne si déjà sélectionné
      } else {
        newSelection.add(groupId); // Ajoute à la sélection
      }
      return newSelection;
    });
    setSelectionAnchor(groupId);
  } 
  // 🎪 CLIC SIMPLE : Sélectionne uniquement ce groupe
  else {
    setSelectedGroups(new Set([groupId]));
    setSelectionAnchor(groupId);
  }
}, [groups, selectionAnchor]);

// 🖱️ Quand on clique sur le canvas vide : efface la sélection
// 🖱️ MODIFIER handleCanvasClick POUR ANNULER LES CONNECTIONS
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      setSelectedGroups(new Set());
      setSelectionAnchor(null);
      
      // 🚫 Annule la création de connection si on clique sur le canvas
      if (connectionStart) {
        console.log("❌ Connection cancelled");
        setConnectionStart(null);
        setConnectionMode(null);
      }
    }
  }, [connectionStart]);

// 🎪 SELECTION RECTANGULAIRE (drag pour sélectionner plusieurs groupes)
const handleCanvasMouseDownForSelection = useCallback((e: React.MouseEvent) => {
  if (e.button === 0 && e.target === canvasRef.current && !e.ctrlKey && !e.metaKey) {
    const rect = canvasRef.current!.getBoundingClientRect();
    const startX = (e.clientX - rect.left - position.x) / scale;
    const startY = (e.clientY - rect.top - position.y) / scale;
    
    setIsSelecting(true);
    setSelectionBox({ start: { x: startX, y: startY }, end: { x: startX, y: startY } });
  }
}, [position.x, position.y, scale]);

const handleCanvasMouseMoveForSelection = useCallback((e: React.MouseEvent) => {
  if (isSelecting && selectionBox) {
    const rect = canvasRef.current!.getBoundingClientRect();
    const endX = (e.clientX - rect.left - position.x) / scale;
    const endY = (e.clientY - rect.top - position.y) / scale;
    
    setSelectionBox(prev => prev ? { ...prev, end: { x: endX, y: endY } } : null);
    
    // 🎯 Sélectionne les groupes dans la boîte de sélection
    const selected = groups.filter(group => {
      const groupX = group.position.x;
      const groupY = group.position.y;
      const minX = Math.min(selectionBox.start.x, endX);
      const maxX = Math.max(selectionBox.start.x, endX);
      const minY = Math.min(selectionBox.start.y, endY);
      const maxY = Math.max(selectionBox.start.y, endY);
      
      return groupX >= minX && groupX <= maxX && groupY >= minY && groupY <= maxY;
    });
    
    setSelectedGroups(new Set(selected.map(g => g.id)));
  }
}, [isSelecting, selectionBox, groups, position.x, position.y, scale]);

const handleCanvasMouseUpForSelection = useCallback(() => {
  setIsSelecting(false);
  setSelectionBox(null);
}, []);

   // 🚫 MODIFIER L'ANNULATION DE CRÉATION
  const cancelConnectionCreation = useCallback(() => {
    if (connectionStart) {
      console.log("❌ Connection creation cancelled");
      setConnectionStart(null);
      setConnectionMode(null);
      setMousePosition(null);
      notifyConnectionCreationCancelled();
    }
  }, [connectionStart, notifyConnectionCreationCancelled]);


  

// ==================== MULTIPLE GROUP DRAG ====================

// 🔄 MODIFIER handleGroupMove pour sauvegarder
// Dans handleGroupMove, s'assurer qu'il n'y a pas de division par scale
const handleGroupMove = useCallback((groupId: string, newPosition: { x: number; y: number }) => {
  const draggedGroup = groups.find(g => g.id === groupId);
  if (!draggedGroup) return;

  const deltaX = newPosition.x - draggedGroup.position.x;
  const deltaY = newPosition.y - draggedGroup.position.y;

  // Drag multiple
  if (selectedGroups.has(groupId) && selectedGroups.size > 1) {
    const updates: Array<{ groupId: string; position: { x: number; y: number } }> = [];
    
    selectedGroups.forEach(selectedGroupId => {
      const group = groups.find(g => g.id === selectedGroupId);
      if (group && selectedGroupId !== groupId) {
        updates.push({
          groupId: selectedGroupId,
          position: {
            x: group.position.x + deltaX,
            y: group.position.y + deltaY
          }
        });
      }
    });
    
    // Appliquer tous les mouvements
    updates.forEach(update => {
      onGroupMove(update.groupId, update.position);
    });
  }
  
  // Déplacer le groupe principal
  onGroupMove(groupId, newPosition);
  
  // Sauvegarder dans l'historique
  setTimeout(() => {
    saveToHistory(groups, "drag");
  }, 100);
}, [groups, selectedGroups, onGroupMove, saveToHistory]);

// 🔄 MODIFIER handleGroupCreate pour sauvegarder
const handleGroupCreate = useCallback((position: { x: number; y: number }) => {
  onGroupCreate(position);
  
  // 💾 SAUVEGARDE après un court délai
  setTimeout(() => {
    saveToHistory(groups, "create_group");
  }, 100);
}, [onGroupCreate, groups, saveToHistory]);

// 🔄 MODIFIER handleDeleteGroup pour sauvegarder
const handleDeleteGroup = useCallback((groupId: string) => {
  // 💾 SAUVEGARDE AVANT la suppression
  saveToHistory(groups, "delete_group");
  
  onGroupDelete?.(groupId);
}, [onGroupDelete, groups, saveToHistory]);

// ici
 // 🖱️ MODIFIER LE HANDLER DE MOUVEMENT SOURIS PRINCIPAL
  // const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
  //   // Pan existant
  //   if (isPanning && e.buttons === 1) {
  //     setPosition(prev => ({
  //       x: prev.x + e.movementX,
  //       y: prev.y + e.movementY
  //     }));
  //   }
    
  //   // 🆕 Tracking souris pour les connections
  //   handleCanvasMouseMoveForConnection(e);
    
  //   // Sélection rectangulaire existante
  //   handleCanvasMouseMoveForSelection(e);
  // }, [isPanning, handleCanvasMouseMoveForConnection, handleCanvasMouseMoveForSelection]);

  // 🖱️ MODIFIER LE HANDLER DE CLIC CANVAS
  // const handleCanvasClick = useCallback((e: React.MouseEvent) => {
  //   if (e.target === canvasRef.current) {
  //     setSelectedGroups(new Set());
  //     setSelectionAnchor(null);
      
  //     // 🚫 Annule la création de connection si on clique sur le canvas vide
  //     cancelConnectionCreation();
  //   }
  // }, [cancelConnectionCreation]);

// ==================== SELECTION ACTIONS ====================

// 🗑️ Supprimer tous les groupes sélectionnés
const deleteSelectedGroups = useCallback(() => {
  selectedGroups.forEach(groupId => onGroupDelete?.(groupId));
  setSelectedGroups(new Set()); // Vide la sélection après suppression
}, [selectedGroups, onGroupDelete]);




// ==================== KEYBOARD SHORTCUTS ====================



useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // 🚫 ESC : Annule la sélection
    handleEscapeKey(e);
    
    // 🎯 FLÈCHES : Déplace la sélection
    handleArrowKeys(e);
    
    // 🗑️ SUPPR/DELETE : Supprime les groupes sélectionnés
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedGroups.size > 0) {
      e.preventDefault();
      deleteSelectedGroups();
    }

    const isTypingInInput = e.target instanceof HTMLInputElement || 
                           e.target instanceof HTMLTextAreaElement;
    
    if (isTypingInInput) return;

     // ↩️ UNDO : Ctrl+Z
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
      return;
    }
    
    // ↪️ REDO : Ctrl+Shift+Z ou Ctrl+Y
    if (((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) || 
        ((e.ctrlKey || e.metaKey) && e.key === 'y')) {
      e.preventDefault();
      redo();
      return;
    }
    
    // ⎈ CTRL+A : Sélectionne tous les groupes
    if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
      e.preventDefault();
      setSelectedGroups(new Set(groups.map(g => g.id)));
    }
    
    // ⎈ CTRL+D : Désélectionne tout
    if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
      e.preventDefault();
      setSelectedGroups(new Set());
    }

     // 🚫 ESC : Annule aussi la création de connection
      if (e.key === 'Escape' && connectionStart) {
        e.preventDefault();
        cancelConnectionCreation();
      }

        // 🎯 ENTER pour sauvegarder l'édition
    if (editingGroupId && e.key === 'Enter') {
      e.preventDefault();
      handleTitleEditSave();
    }
    
    // 🎯 ESC pour annuler l'édition
    if (editingGroupId && e.key === 'Escape') {
      e.preventDefault();
      handleTitleEditCancel();
    }
  };

  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, [selectedGroups, groups, deleteSelectedGroups, handleEscapeKey, handleArrowKeys]);

// 💾 SAUVEGARDE QUAND LES GROUPES CHANGENT (sauf pendant undo/redo)
useEffect(() => {
  if (history.length > 0 && historyIndex >= 0) {
    const currentState = history[historyIndex];
    // Vérifie si les groupes ont vraiment changé
    if (currentState && JSON.stringify(currentState.groups) !== JSON.stringify(groups)) {
      saveToHistory(groups, "groups_change");
    }
  }
}, [groups, history, historyIndex, saveToHistory]);

// 💾 INITIALISE L'HISTORIQUE quand les groupes changent
useEffect(() => {
  if (groups.length > 0 && history.length === 0) {
    console.log("💾 Initializing history with", groups.length, "groups");
    saveToHistory(groups, "initial");
    setHistoryIndex(0);
  }
}, [groups, history.length, saveToHistory]);

// 💾 SAUVEGARDE AUTOMATIQUE quand les groupes changent significativement
useEffect(() => {
  if (history.length > 0 && historyIndex >= 0) {
    const currentState = history[historyIndex];
    // Vérifie si les groupes ont vraiment changé (évite les sauvegardes en boucle)
    if (currentState && JSON.stringify(currentState.groups) !== JSON.stringify(groups)) {
      console.log("💾 Auto-saving history - groups changed");
      saveToHistory(groups, "auto_save");
    }
  }
}, [groups, history, historyIndex, saveToHistory]);


// ==================== end Neuen Sta ====================

  // ==================== ZOOM & PAN ====================
  const handleWheel = useCallback((e: WheelEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.group-insights-container')) {
      return;
    }
    
    e.preventDefault();
    const delta = -e.deltaY * 0.001;
    setScale(prev => Math.max(0.1, Math.min(3, prev + delta)));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && e.target === canvasRef.current) {
      setIsPanning(true);
    }
  };

  // Nouveau state ConnectionsLayer
  

  //Fin State ConnectionsLayer

 // 2. LE HANDLER EST UTILISÉ DANS handleCanvasMouseMove :
  // 🖱️ MODIFIER LE HANDLER DE MOUVEMENT POUR BIEN TRACKER
// Dans handleCanvasMouseMove, vérifier le calcul
const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
  if (isPanning && e.buttons === 1) {
    setPosition(prev => ({
      x: prev.x + e.movementX,
      y: prev.y + e.movementY
    }));
  }
  
  // 🆕 CALCUL EXACT DES COORDONNÉES SOURIS
  if (connectionMode && connectionStart) {
    const rect = canvasRef.current!.getBoundingClientRect();
    // Coordonnées absolues dans le SVG
    const x = (e.clientX - rect.left);
    const y = (e.clientY - rect.top);
    setMousePosition({ x, y });
  }
  
  handleCanvasMouseMoveForSelection(e);
}, [isPanning, connectionMode, connectionStart, handleCanvasMouseMoveForSelection]);


    const handleCanvasMouseUp = () => {
      setIsPanning(false);
    };

  // ==================== DRAG INSIGHT ====================
  const handleInsightDragStart = (e: React.DragEvent, insightId: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', insightId);
    setDraggedInsight(insightId);
    setDraggedInsightId(insightId); 
  };

  const handleInsightDragEnd = () => {
    setDraggedInsight(null);
    setDragOverGroup(null);
    setDraggedInsightId(null); 
  };

  const handleGroupDragOver = (e: React.DragEvent, groupId: string) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setDragOverGroup(groupId);
  };

  const handleGroupDragLeave = (e: React.DragEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverGroup(null);
    }
  };

  const handleGroupDrop = (e: React.DragEvent, groupId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const insightId = e.dataTransfer.getData('text/plain');
    if (insightId) {
      onInsightDrop(insightId, groupId);
    }
    setDragOverGroup(null);
    setDraggedInsight(null);
  };

  // ==================== ACTIONS ====================
 const handleDeleteGroupCallback = useCallback((groupId: string) => {
  // 💾 SAUVEGARDE AVANT la suppression
  saveToHistory(groups, "delete_group");
  
  onGroupDelete?.(groupId);
}, [onGroupDelete, groups, saveToHistory]);

  const handleRemoveInsight = (insightId: string, groupId: string) => {
    onInsightRemoveFromGroup?.(insightId, groupId);
  };

  const handleAddManualInsight = () => {
    if (newInsightText.trim()) {
      onManualInsightCreate(newInsightText.trim(), newInsightType);
      setNewInsightText("");
      setShowAddInsight(false);
    }
  };

  const handleTitleBlur = (groupId: string, newTitle: string) => {
    if (newTitle.trim() && onGroupTitleUpdate) {
      onGroupTitleUpdate(groupId, newTitle.trim());
    }
  };

  return (
   <div className="h-full relative bg-gray-50 overflow-hidden">


      {/* 🆕 MODAL D'ÉDITION DE TITRE */}
      {editingGroupId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-96 shadow-2xl">
            <h3 className="text-lg font-semibold mb-4">Renommer le groupe</h3>
            
            <input
              type="text"
              value={editingTitle}
              onChange={(e) => setEditingTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTitleEditSave();
                if (e.key === 'Escape') handleTitleEditCancel();
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
              placeholder="Nom du groupe..."
              autoFocus
            />
            
            <div className="flex gap-2 justify-end">
              <button
                onClick={handleTitleEditCancel}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleTitleEditSave}
                disabled={!editingTitle.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Sauvegarder
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 🎪 INDICATEUR RACCOURCIS CLAVIER */}
      {selectedGroups.size > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg z-50 flex items-center gap-4"
        >
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">ESC</kbd>
            <span className="text-gray-300">Annuler</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">←↑↓→</kbd>
            <span className="text-gray-300">Déplacer</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">Shift</kbd>
            <span className="text-gray-300">+</span>
            <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">←↑↓→</kbd>
            <span className="text-gray-300">Grand déplacement</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">Suppr</kbd>
            <span className="text-gray-300">Supprimer</span>
          </div>
        </motion.div>
      )}
      {/* Toolbar */}
      <div className="absolute top-4 left-4 z-30 flex gap-2">
      {/* Connection Tools - Version simplifiée */}
<div className="bg-white rounded-lg shadow-lg border border-gray-200 p-2">
  <div className="text-xs text-gray-600 mb-1">Create Connection:</div>
  <div className="flex gap-1">
    {[
      { type: 'related' as const, icon: '🔗', label: 'Related' },
      { type: 'hierarchy' as const, icon: '📊', label: 'Hierarchy' },
      { type: 'dependency' as const, icon: '⚡', label: 'Dependency' },
      { type: 'contradiction' as const, icon: '⚠️', label: 'Contradiction' },
    ].map(({ type, icon, label }) => (
      <button
        key={type}
        onClick={() => {
          const newMode = connectionMode === type ? null : type;
          setConnectionMode(newMode);
          setConnectionStart(null);
          
          if (newMode) {
            toast.info(`Click two groups to create ${label} connection`);
          }
        }}
        className={`w-8 h-8 rounded flex items-center justify-center text-sm ${
          connectionMode === type 
            ? 'bg-blue-100 text-blue-700 border border-blue-300' 
            : 'hover:bg-gray-100 text-gray-700 border border-transparent'
        }`}
        title={`${label} Connection`}
      >
        {icon}
      </button>
    ))}
    
    {connectionStart && (
      <button
        onClick={() => {
          setConnectionStart(null);
          setConnectionMode(null);
          toast.info("Connection cancelled");
        }}
        className="w-8 h-8 rounded flex items-center justify-center bg-red-100 text-red-700 border border-red-300"
        title="Cancel"
      >
        ✕
      </button>
    )}
  </div>
  
  {connectionStart && (
    <div className="text-xs text-blue-600 mt-1">
      Now click another group to connect...
    </div>
  )}
</div>
        {/* 🎪 UNDO/REDO BUTTONS */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-1 flex gap-1">
          <button 
            onClick={undo}
            disabled={historyIndex <= 0}
            className="w-8 h-8 rounded hover:bg-gray-100 flex items-center justify-center text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={16} />
          </button>
          <button 
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            className="w-8 h-8 rounded hover:bg-gray-100 flex items-center justify-center text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 size={16} />
          </button>
        </div>
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-1 flex gap-1">
          <button 
            onClick={() => setScale(s => Math.min(3, s + 0.1))}
            className="w-8 h-8 rounded hover:bg-gray-100 flex items-center justify-center text-gray-700 font-semibold"
          >
            +
          </button>
          <button 
            onClick={() => setScale(s => Math.max(0.1, s - 0.1))}
            className="w-8 h-8 rounded hover:bg-gray-100 flex items-center justify-center text-gray-700 font-semibold"
          >
            −
          </button>
          <div className="w-12 h-8 flex items-center justify-center text-xs text-gray-600 border-l border-gray-200">
            {Math.round(scale * 100)}%
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="absolute top-4 right-96 z-30 bg-white rounded-lg shadow-lg border border-gray-200 px-4 py-2">
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-gray-600">Available:</span>
            <span className="font-semibold text-gray-900">{availableInsights.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <span className="text-gray-600">Groups:</span>
            <span className="font-semibold text-gray-900">{groups.length}</span>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="absolute inset-0"
         style={{ cursor: isPanning ? 'grabbing' : (isSelecting ? 'crosshair' : (connectionMode ? 'crosshair' : 'grab')) }}
        onMouseDown={(e) => {
          handleCanvasMouseDown(e); // Pan existant
          handleCanvasMouseDownForSelection(e); // Nouveau: sélection rectangulaire
          handleCanvasClick(e); // Nouveau: clic canvas
        }}
        onMouseMove={(e) => {
          handleCanvasMouseMove(e); // Pan existant  
          handleCanvasMouseMoveForSelection(e); // Nouveau: sélection rectangulaire
        }}
        onMouseUp={() => {
          handleCanvasMouseUp(); // Pan existant
          handleCanvasMouseUpForSelection(); // Nouveau: sélection rectangulaire
        }}
        onMouseLeave={() => {
          handleCanvasMouseUp(); // Pan existant
          handleCanvasMouseUpForSelection(); // Nouveau: sélection rectangulaire
        }}
        // onMouseDown={handleCanvasMouseDown}
        // onMouseMove={handleCanvasMouseMove}
        // onMouseUp={handleCanvasMouseUp}
        // onMouseLeave={handleCanvasMouseUp}
        onDoubleClick={(e) => {
          if (e.target === canvasRef.current || (e.target as HTMLElement).closest('.canvas-content')) {
            const rect = canvasRef.current!.getBoundingClientRect();
            const x = (e.clientX - rect.left - position.x) / scale;
            const y = (e.clientY - rect.top - position.y) / scale;
            onGroupCreate({ x, y });
          }
        }}
      >
        <div
          className="canvas-content absolute pointer-events-none"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: '0 0',
            width: '5000px',
            height: '5000px',
          }}
        >
          {/* Grid background */}
          <div 
            className="absolute inset-0"
            style={{
              backgroundImage: `
                linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)
              `,
              backgroundSize: '40px 40px',
            }}
          />

        


          {/* Groups avec Framer Motion */}
          {groups.map((group) => (
            <DraggableGroup
              onHover={setHoveredGroup}
             key={group.id}
            group={group}
            insights={insights}
            scale={scale}
            isHovered={hoveredGroup === group.id}
            isDragOver={dragOverGroup === group.id}
            isSelected={selectedGroups.has(group.id)}
            onSelect={(groupId, e) => {
                // 🎯 Gère les clics normaux ET les connections
                if (connectionMode) {
                  handleGroupConnectionStart(groupId);
                } else {
                  handleGroupClick(groupId, e);
                }
              }}
            onMove={handleGroupMove}
            onDelete={handleDeleteGroupCallback}
            onTitleUpdate={handleTitleBlur}
            onRemoveInsight={handleRemoveInsight}
            onDragOver={handleGroupDragOver}
            onDragLeave={handleGroupDragLeave}
            onDrop={handleGroupDrop}
            onInsightDragStart={handleInsightDragStart}
            onInsightDragEnd={handleInsightDragEnd}
            selectedGroupsCount={selectedGroups.size} 
              // 🆕 NOUVELLES PROPS
            onRenameRequest={handleRenameRequest}
            onCreateConnectionFromGroup={handleCreateConnectionFromGroup}
            />
          ))}
        </div>
      </div>

       {/* 🔗 LAYER DES CONNECTIONS AVEC MODE CRÉATION */}
        <ConnectionsLayer
          groups={groups}
          connections={connections}
          onConnectionClick={handleConnectionClick} // Seulement pour ouvrir le modal
        />

      {/* Insights Panel */}
      <div className="absolute right-4 top-4 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-20 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-linear-to-r from-blue-50 to-purple-50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Available Insights</h3>
            <span className="text-sm bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-medium">
              {availableInsights.length}
            </span>
          </div>
          
          <button
            onClick={() => setShowAddInsight(!showAddInsight)}
            className="w-full bg-linear-to-r from-blue-500 to-blue-600 text-white py-2.5 px-4 rounded-lg text-sm font-medium hover:from-blue-600 hover:to-blue-700 transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            <Plus size={16} />
            Add New Insight
          </button>

          {showAddInsight && (
            <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200 space-y-2">
              <select
                value={newInsightType}
                onChange={(e) => setNewInsightType(e.target.value as Insight['type'])}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="insight">💡 Insight</option>
                <option value="pain-point">😣 Pain Point</option>
                <option value="quote">💬 Quote</option>
                <option value="follow-up">📋 Follow-up</option>
              </select>
              <textarea
                value={newInsightText}
                onChange={(e) => setNewInsightText(e.target.value)}
                placeholder="Type your insight here..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAddManualInsight}
                  disabled={!newInsightText.trim()}
                  className="flex-1 bg-green-500 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setShowAddInsight(false);
                    setNewInsightText("");
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="p-3 max-h-[500px] overflow-y-auto space-y-2">
          {availableInsights.map(insight => (
             <motion.div
              key={insight.id}
              draggable
              onDragStart={(e) => handleInsightDragStart(e as unknown as React.DragEvent, insight.id)}
              onDragEnd={handleInsightDragEnd}
              whileHover={{ scale: 1.02, y: -2 }}
              animate={{
                scale: draggedInsightId === insight.id ? 0.95 : 1,
                opacity: draggedInsightId === insight.id ? 0.6 : 1,
                rotateZ: draggedInsightId === insight.id ? 5 : 0,
              }}
              className="bg-white border border-gray-200 rounded-lg p-3 cursor-move hover:shadow-md hover:border-blue-300 transition-all"
            >
              <div className="flex items-start justify-between mb-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  insight.type === 'pain-point' ? 'bg-red-100 text-red-700' :
                  insight.type === 'quote' ? 'bg-blue-100 text-blue-700' :
                  insight.type === 'insight' ? 'bg-purple-100 text-purple-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {insight.type}
                </span>
                <GripVertical size={14} className="text-gray-400" />
              </div>
              <p className="text-sm text-gray-700 leading-snug line-clamp-2">
                {insight.text}
              </p>
            </motion.div>
          ))}

          {availableInsights.length === 0 && (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">🎉</div>
              <p className="text-sm font-medium text-gray-600">All insights organized!</p>
              <p className="text-xs text-gray-400 mt-1">Great job on your affinity mapping</p>
            </div>
          )}
        </div>
      </div>

      {/* 🆕 DIALOG SHADCN POUR LES DÉTAILS DE CONNECTION */}
    <Dialog open={!!selectedConnection} onOpenChange={handleCloseConnectionDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${
              selectedConnection?.type === 'related' ? 'bg-purple-500' :
              selectedConnection?.type === 'hierarchy' ? 'bg-blue-500' :
              selectedConnection?.type === 'dependency' ? 'bg-green-500' :
              'bg-red-500'
            }`} />
            Connection Details
          </DialogTitle>
          <DialogDescription>
            View and manage connection between groups
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* TYPE DE CONNECTION */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Connection Type</span>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                selectedConnection?.type === 'related' ? 'bg-purple-500' :
                selectedConnection?.type === 'hierarchy' ? 'bg-blue-500' :
                selectedConnection?.type === 'dependency' ? 'bg-green-500' :
                'bg-red-500'
              }`} />
              <span className="text-sm capitalize px-2 py-1 rounded bg-gray-100">
                {selectedConnection?.type}
              </span>
            </div>
          </div>

          {/* GROUPES CONNECTÉS */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <span className="text-sm font-medium text-gray-600">From Group</span>
              <div className="p-3 border rounded-lg bg-gray-50">
                <div className="flex items-center gap-2 mb-1">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: groups.find(g => g.id === selectedConnection?.sourceGroupId)?.color }}
                  />
                  <span className="text-sm font-medium">
                    {groups.find(g => g.id === selectedConnection?.sourceGroupId)?.title}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {groups.find(g => g.id === selectedConnection?.sourceGroupId)?.insightIds.length} insights
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-sm font-medium text-gray-600">To Group</span>
              <div className="p-3 border rounded-lg bg-gray-50">
                <div className="flex items-center gap-2 mb-1">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: groups.find(g => g.id === selectedConnection?.targetGroupId)?.color }}
                  />
                  <span className="text-sm font-medium">
                    {groups.find(g => g.id === selectedConnection?.targetGroupId)?.title}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {groups.find(g => g.id === selectedConnection?.targetGroupId)?.insightIds.length} insights
                </span>
              </div>
            </div>
          </div>

          {/* LABEL (si présent) */}
          {selectedConnection?.label && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Custom Label</span>
              <span className="text-sm text-gray-700 bg-yellow-50 px-2 py-1 rounded border">
                {selectedConnection.label}
              </span>
            </div>
          )}

          {/* STRENGTH (si présent) */}
          {selectedConnection?.strength && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Connection Strength</span>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full ${
                      i < (selectedConnection?.strength || 0)
                        ? 'bg-yellow-500'
                        : 'bg-gray-200'
                    }`}
                  />
                ))}
                <span className="text-xs text-gray-500 ml-2">
                  {selectedConnection.strength}/5
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleCloseConnectionDialog}
            className="flex-1"
          >
            Close
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeleteFromDialog}
            className="flex-1"
          >
            Delete Connection
          </Button>
          <Button
            onClick={handleEditFromDialog}
            className="flex-1"
          >
            Edit Connection
          </Button>
        </div>
      </DialogContent>
    </Dialog>

      {draggedInsight && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed top-6 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg z-50 flex items-center gap-2"
        >
          <Move size={14} />
          Drag to organize insight
        </motion.div>
      )}
    </div>
  );
}

