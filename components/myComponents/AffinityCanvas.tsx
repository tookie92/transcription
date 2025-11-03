"use client";

import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import DraggableGroup from "./DraggableGroup";
import { GripVertical, Move, Plus, Redo2, Undo2 } from "lucide-react";
import { motion } from "framer-motion";
import { Id } from "@/convex/_generated/dataModel";
import ConnectionsLayer from "./ConnectionLayer";
import { useAffinityToasts } from "@/hooks/useAffinityToasts";
import { toast } from "sonner";
import { GroupConnection } from "@/types";

// 🆕 IMPORTS SHADCN/UI
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

// 🆕 AJOUTER CES CONSTANTES POUR LES TYPES DE RELATIONS
export const CONNECTION_TYPES = [
  {
    value: 'related' as const,
    label: 'Related',
    icon: '🔗',
    description: 'These groups are related or connected',
    color: '#8B5CF6'
  },
  {
    value: 'hierarchy' as const,
    label: 'Hierarchy', 
    icon: '📊',
    description: 'Parent-child or ranking relationship',
    color: '#3B82F6'
  },
  {
    value: 'dependency' as const,
    label: 'Dependency',
    icon: '⚡', 
    description: 'One group depends on another',
    color: '#10B981'
  },
  {
    value: 'contradiction' as const,
    label: 'Contradiction',
    icon: '⚠️',
    description: 'These groups contradict or conflict',
    color: '#EF4444'
  }
] as const;

interface AffinityGroup {
  id: string;
  title: string;
  color: string;
  position: { x: number; y: number };
  insightIds: Id<"insights">[];
}

interface Insight {
  id: string;
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
  connections = [],
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

  // 🆕 STATE POUR LE MODAL DE CONNECTION
  const [selectedConnection, setSelectedConnection] = useState<GroupConnection | null>(null);

  // 🆕 STATES POUR LE MODE CONNECTION
  const [connectionMode, setConnectionMode] = useState<GroupConnection['type'] | null>(null);
  const [connectionStart, setConnectionStart] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [selectedConnectionType, setSelectedConnectionType] = useState<GroupConnection['type']>('related');

  // 📚 Historique des états de groupes (pour undo/redo)
  const [history, setHistory] = useState<{ groups: AffinityGroup[]; timestamp: number }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [lastActionTime, setLastActionTime] = useState(0);

  // 📦 Groupes actuellement sélectionnés (Ctrl+Clic, Shift+Clic, sélection rectangulaire)
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [isMovingWithArrows, setIsMovingWithArrows] = useState(false);
  const [selectionAnchor, setSelectionAnchor] = useState<string | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionBox, setSelectionBox] = useState<{ start: { x: number; y: number }; end: { x: number; y: number } } | null>(null);

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

  // ==================== HANDLERS CONNECTIONS ====================

  // 🆕 METTRE À JOUR LE BOUTON DE CONNECTION POUR UTILISER LE SELECT
const handleConnectionModeToggle = (type: GroupConnection['type']) => {
  const newMode = connectionMode === type ? null : type;
  setConnectionMode(newMode);
  setConnectionStart(null);
  setMousePosition(null);
  
  if (newMode) {
    toast.info(`Creating ${CONNECTION_TYPES.find(t => t.value === newMode)?.label} Connection`, {
      description: "Click on a group to start, then another to connect",
      duration: 3000
    });
  }
};

  // 🖱️ HANDLER POUR LA SUPPRESSION DE CONNECTION
  const handleConnectionDelete = useCallback((connectionId: Id<"groupConnections">) => {
    const connection = connections.find(c => c.id === connectionId);
    
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

  // 🖱️ HANDLER POUR LE CLIC SUR UNE CONNECTION
  const handleConnectionClick = useCallback((connection: GroupConnection) => {
    console.log("🔗 Connection clicked:", connection);
    setSelectedConnection(connection);
  }, []);

  // 🆕 HANDLER POUR FERMER LE MODAL
  const handleCloseConnectionModal = useCallback(() => {
    setSelectedConnection(null);
  }, []);

  // 🆕 HANDLER POUR SUPPRIMER DEPUIS LE MODAL
  const handleDeleteFromModal = useCallback(() => {
    if (selectedConnection) {
      onConnectionDelete?.(selectedConnection.id);
      notifyConnectionDeleted(selectedConnection.label);
      setSelectedConnection(null);
    }
  }, [selectedConnection, onConnectionDelete, notifyConnectionDeleted]);

  // 🆕 HANDLER POUR ÉDITER DEPUIS LE MODAL
  const handleEditFromModal = useCallback(() => {
    if (selectedConnection) {
      // TODO: Ouvrir le modal d'édition des connections
      console.log("Edit connection:", selectedConnection.id);
      toast.info("Edit connection feature coming soon!");
      setSelectedConnection(null);
    }
  }, [selectedConnection]);

  // 🎨 CONFIGURATION DES TYPES DE CONNECTION
  const getConnectionConfig = (type: GroupConnection['type']) => {
    switch (type) {
      case 'hierarchy': 
        return { color: '#3B82F6', icon: '📊', label: 'Hierarchy' };
      case 'dependency': 
        return { color: '#10B981', icon: '⚡', label: 'Dependency' };
      case 'contradiction': 
        return { color: '#EF4444', icon: '⚠️', label: 'Contradiction' };
      case 'related': 
      default: 
        return { color: '#8B5CF6', icon: '🔗', label: 'Related' };
    }
  };

  // ==================== HANDLERS CONNECTION CREATION ====================

  // 🖱️ HANDLER POUR TRACKER LA SOURIS DURANT LA CRÉATION
  const handleCanvasMouseMoveForConnection = useCallback((e: React.MouseEvent) => {
    if (connectionMode && connectionStart) {
      const rect = canvasRef.current!.getBoundingClientRect();
      const x = (e.clientX - rect.left - position.x) / scale;
      const y = (e.clientY - rect.top - position.y) / scale;
      setMousePosition({ x, y });
    }
  }, [connectionMode, connectionStart, position.x, position.y, scale]);

  // 🖱️ HANDLER POUR DÉMARRER UNE CONNECTION
  const handleGroupConnectionStart = useCallback((groupId: string) => {
    if (connectionMode && connectionStart && connectionStart !== groupId) {
      console.log(`🔗 Creating connection: ${connectionStart} → ${groupId} (${connectionMode})`);
      onConnectionCreate?.(connectionStart, groupId, connectionMode);
      setConnectionStart(null);
      setConnectionMode(null);
      setMousePosition(null);
    } 
    else if (connectionMode && !connectionStart) {
      setConnectionStart(groupId);
      console.log(`🔗 Connection started from group: ${groupId}`);
    }
  }, [connectionMode, connectionStart, onConnectionCreate]);

  // 🚫 ANNULATION DE CRÉATION
  const cancelConnectionCreation = useCallback(() => {
    if (connectionStart) {
      console.log("❌ Connection creation cancelled");
      setConnectionStart(null);
      setConnectionMode(null);
      setMousePosition(null);
      notifyConnectionCreationCancelled();
    }
  }, [connectionStart, notifyConnectionCreationCancelled]);

  // ==================== HANDLERS EXISTANTS ====================

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
    setConnectionMode('related');
    setConnectionStart(groupId);
    console.log(`🔗 Connection started from context menu: ${groupId}`);
  }, []);

  // ==================== UNDO/REDO ====================

  const saveToHistory = useCallback((newGroups: AffinityGroup[], action: string = "modification") => {
    const now = Date.now();
    if (now - lastActionTime < 500 && action === "drag") {
      return;
    }
    setLastActionTime(now);

    const groupsSnapshot = JSON.parse(JSON.stringify(newGroups));
    
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push({ groups: groupsSnapshot, timestamp: now });
      if (newHistory.length > 50) newHistory.shift();
      return newHistory;
    });
    
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [historyIndex, lastActionTime]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const previousState = history[newIndex];
      if (previousState && onGroupsReplace) {
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
        onGroupsReplace(nextState.groups);
      }
      setHistoryIndex(newIndex);
    }
  }, [historyIndex, history.length, history, onGroupsReplace]);

  // ==================== SELECTION ====================

  const handleGroupClick = useCallback((groupId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (connectionMode) {
      handleGroupConnectionStart(groupId);
      return;
    }

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
    
    if (e.ctrlKey || e.metaKey) {
      setSelectedGroups(prev => {
        const newSelection = new Set(prev);
        if (newSelection.has(groupId)) {
          newSelection.delete(groupId);
        } else {
          newSelection.add(groupId);
        }
        return newSelection;
      });
      setSelectionAnchor(groupId);
    } 
    else {
      setSelectedGroups(new Set([groupId]));
      setSelectionAnchor(groupId);
    }
  }, [groups, selectionAnchor, connectionMode, handleGroupConnectionStart]);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      setSelectedGroups(new Set());
      setSelectionAnchor(null);
      if (connectionStart) {
        cancelConnectionCreation();
      }
    }
  }, [connectionStart, cancelConnectionCreation]);

  // ==================== DRAG & DROP ====================

  const handleGroupMove = useCallback((groupId: string, newPosition: { x: number; y: number }) => {
    const draggedGroup = groups.find(g => g.id === groupId);
    if (!draggedGroup) return;

    const deltaX = newPosition.x - draggedGroup.position.x;
    const deltaY = newPosition.y - draggedGroup.position.y;

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
      
      updates.forEach(update => {
        onGroupMove(update.groupId, update.position);
      });
    }
    
    onGroupMove(groupId, newPosition);
    
    setTimeout(() => {
      saveToHistory(groups, "drag");
    }, 100);
  }, [groups, selectedGroups, onGroupMove, saveToHistory]);

  const handleDeleteGroupCallback = useCallback((groupId: string) => {
    saveToHistory(groups, "delete_group");
    onGroupDelete?.(groupId);
  }, [onGroupDelete, groups, saveToHistory]);

  // ==================== ZOOM & PAN ====================

  const handleWheel = useCallback((e: WheelEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.group-insights-container')) return;
    
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

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning && e.buttons === 1) {
      setPosition(prev => ({
        x: prev.x + e.movementX,
        y: prev.y + e.movementY
      }));
    }
    handleCanvasMouseMoveForConnection(e);
  }, [isPanning, handleCanvasMouseMoveForConnection]);

  const handleCanvasMouseUp = () => {
    setIsPanning(false);
  };

  // ==================== KEYBOARD SHORTCUTS ====================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isTypingInInput = e.target instanceof HTMLInputElement || 
                             e.target instanceof HTMLTextAreaElement;
      
      if (isTypingInInput) return;

      // ESC - Annule sélection et création de connection
      if (e.key === 'Escape') {
        if (selectedGroups.size > 0) {
          e.preventDefault();
          setSelectedGroups(new Set());
          setSelectionAnchor(null);
        }
        if (connectionStart) {
          e.preventDefault();
          cancelConnectionCreation();
        }
        if (editingGroupId) {
          e.preventDefault();
          handleTitleEditCancel();
        }
      }

      // UNDO/REDO
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if (((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) || 
          ((e.ctrlKey || e.metaKey) && e.key === 'y')) {
        e.preventDefault();
        redo();
      }

      // SELECTION
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        setSelectedGroups(new Set(groups.map(g => g.id)));
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedGroups, connectionStart, editingGroupId, groups, cancelConnectionCreation, handleTitleEditCancel, undo, redo]);

  // ==================== RENDER ====================

  return (
    <div className="h-full relative bg-gray-50 overflow-hidden">
      {/* 🆕 MODAL DE DÉTAILS DE CONNECTION AVEC SHADCN/UI */}
      <Dialog open={!!selectedConnection} onOpenChange={(open) => !open && handleCloseConnectionModal()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedConnection && getConnectionConfig(selectedConnection.type).icon}
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
              <Badge 
                variant="outline"
                className="capitalize"
                style={{ 
                  borderColor: selectedConnection ? getConnectionConfig(selectedConnection.type).color : '',
                  color: selectedConnection ? getConnectionConfig(selectedConnection.type).color : ''
                }}
              >
                {selectedConnection?.type}
              </Badge>
            </div>

            {/* GROUPES CONNECTÉS */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">From Group</span>
                <span className="text-sm text-gray-600">
                  {selectedConnection && groups.find(g => g.id === selectedConnection.sourceGroupId)?.title}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">To Group</span>
                <span className="text-sm text-gray-600">
                  {selectedConnection && groups.find(g => g.id === selectedConnection.targetGroupId)?.title}
                </span>
              </div>
            </div>

            {/* LABEL (si présent) */}
            {selectedConnection?.label && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Label</span>
                <span className="text-sm text-gray-600">{selectedConnection.label}</span>
              </div>
            )}

            {/* STRENGTH (si présent) */}
            {selectedConnection?.strength && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Strength</span>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-yellow-600">
                    {'★'.repeat(selectedConnection.strength)}
                    {'☆'.repeat(5 - selectedConnection.strength)}
                  </span>
                  <span className="text-xs text-gray-500 ml-2">
                    ({selectedConnection.strength}/5)
                  </span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={handleDeleteFromModal}
              className="text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700"
            >
              Delete Connection
            </Button>
            <Button onClick={handleEditFromModal}>
              Edit Connection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL D'ÉDITION DE TITRE */}
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

      {/* Toolbar */}
      <div className="absolute top-4 left-4 z-30 flex gap-2">
        {/* Connection Tools */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-2 flex flex-col gap-2 min-w-48">
          {/* INDICATEUR DE STATUT */}
          {connectionStart && (
            <div className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded border border-blue-200 flex items-center justify-between">
              <span>Connecting...</span>
              <button
                onClick={cancelConnectionCreation}
                className="text-blue-500 hover:text-blue-700 text-xs"
              >
                ✕ Cancel
              </button>
            </div>
          )}
          
          {/* SELECT POUR CHOISIR LE TYPE DE RELATION */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600 block">
              Connection Type
            </label>
            <Select
              value={selectedConnectionType}
              onValueChange={(value: GroupConnection['type']) => {
                setSelectedConnectionType(value);
                // Optionnel: activer automatiquement le mode
                // handleConnectionModeToggle(value);
              }}
            >
              <SelectTrigger className="w-full h-8 text-sm">
                <SelectValue placeholder="Select connection type" />
              </SelectTrigger>
              <SelectContent>
                {CONNECTION_TYPES.map((type) => (
                  <SelectItem 
                    key={type.value} 
                    value={type.value}
                    className="flex items-center gap-2"
                  >
                    <span>{type.icon}</span>
                    <span>{type.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* BOUTON POUR DÉMARRER LA CONNECTION */}
          <Button
            variant={connectionMode === selectedConnectionType ? "default" : "outline"}
            size="sm"
            onClick={() => handleConnectionModeToggle(selectedConnectionType)}
            className="w-full justify-start gap-2"
            style={
              connectionMode === selectedConnectionType 
                ? { 
                    backgroundColor: CONNECTION_TYPES.find(t => t.value === selectedConnectionType)?.color,
                    borderColor: CONNECTION_TYPES.find(t => t.value === selectedConnectionType)?.color
                  }
                : {}
            }
          >
            <span>
              {CONNECTION_TYPES.find(t => t.value === selectedConnectionType)?.icon}
            </span>
            <span>
              {connectionMode === selectedConnectionType ? 'Connecting...' : 'Start Connection'}
            </span>
          </Button>

          {/* INDICATEUR VISUEL DES TYPES */}
          <div className="grid grid-cols-2 gap-1 pt-1 border-t">
            {CONNECTION_TYPES.map((type) => (
              <div
                key={type.value}
                className={`flex items-center gap-1 p-1 rounded text-xs cursor-pointer transition-all ${
                  selectedConnectionType === type.value 
                    ? 'bg-gray-100 font-medium' 
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
                onClick={() => setSelectedConnectionType(type.value)}
                title={type.description}
              >
                <div 
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: type.color }}
                />
                <span>{type.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Undo/Redo Buttons */}
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

        {/* Zoom Buttons */}
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
        style={{ cursor: isPanning ? 'grabbing' : (connectionMode ? 'crosshair' : 'grab') }}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseUp}
        onClick={handleCanvasClick}
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
            className="absolute inset-0 z-0"
            style={{
              backgroundImage: `
                linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)
              `,
              backgroundSize: '40px 40px',
            }}
          />

          {/* 🔗 LAYER DES CONNECTIONS */}
          <ConnectionsLayer
            groups={groups}
            connections={connections}
            // position={position}
            scale={scale}
            connectionMode={connectionMode}
            connectionStart={connectionStart}
            mousePosition={mousePosition}
            onConnectionClick={handleConnectionClick}
            onConnectionDelete={handleConnectionDelete}
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
                if (connectionMode) {
                  handleGroupConnectionStart(groupId);
                } else {
                  handleGroupClick(groupId, e);
                }
              }}
              onMove={handleGroupMove}
              onDelete={handleDeleteGroupCallback}
              onTitleUpdate={(groupId, title) => onGroupTitleUpdate?.(groupId, title)}
              onRemoveInsight={(insightId, groupId) => onInsightRemoveFromGroup?.(insightId, groupId)}
              onDragOver={(e, groupId) => {
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = 'move';
                setDragOverGroup(groupId);
              }}
              onDragLeave={(e) => {
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                const x = e.clientX;
                const y = e.clientY;
                if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
                  setDragOverGroup(null);
                }
              }}
              onDrop={(e, groupId) => {
                e.preventDefault();
                e.stopPropagation();
                const insightId = e.dataTransfer.getData('text/plain');
                if (insightId) {
                  onInsightDrop(insightId, groupId);
                }
                setDragOverGroup(null);
                setDraggedInsight(null);
              }}
              onInsightDragStart={(e, insightId) => {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', insightId);
                setDraggedInsight(insightId);
                setDraggedInsightId(insightId);
              }}
              onInsightDragEnd={() => {
                setDraggedInsight(null);
                setDragOverGroup(null);
                setDraggedInsightId(null);
              }}
              selectedGroupsCount={selectedGroups.size}
              onRenameRequest={handleRenameRequest}
              onCreateConnectionFromGroup={handleCreateConnectionFromGroup}
            />
          ))}
        </div>
      </div>

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
                  onClick={() => {
                    if (newInsightText.trim()) {
                      onManualInsightCreate(newInsightText.trim(), newInsightType);
                      setNewInsightText("");
                      setShowAddInsight(false);
                    }
                  }}
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
              onDragStart={(e) => {
                const dragTransfer  = e as unknown as React.DragEvent;
                dragTransfer.dataTransfer.effectAllowed = 'move';
                dragTransfer.dataTransfer.setData('text/plain', insight.id);
                setDraggedInsight(insight.id);
                setDraggedInsightId(insight.id);
              }}
              onDragEnd={() => {
                setDraggedInsight(null);
                setDragOverGroup(null);
                setDraggedInsightId(null);
              }}
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