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

// 🎯 COUCHE 1: Interface principale du canvas
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
  
  // 🎯 COUCHE 2: États de navigation (zoom/pan)
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  
  // 🎯 COUCHE 3: États d'interaction groupes
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);
  const [draggedInsight, setDraggedInsight] = useState<string | null>(null);
  const [dragOverGroup, setDragOverGroup] = useState<string | null>(null);
  
  // 🎯 COUCHE 4: États création manuelle d'insights
  const [newInsightText, setNewInsightText] = useState("");
  const [newInsightType, setNewInsightType] = useState<Insight['type']>('insight');
  const [showAddInsight, setShowAddInsight] = useState(false);
  const [draggedInsightId, setDraggedInsightId] = useState<string | null>(null);

  // 🎯 COUCHE 5: Système de connections
  const [connectionMode, setConnectionMode] = useState<GroupConnection['type'] | null>(null);
  const [connectionStart, setConnectionStart] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
  const [selectedConnection, setSelectedConnection] = useState<GroupConnection | null>(null);

  // 🎯 COUCHE 6: Système undo/redo
  const [history, setHistory] = useState<{ groups: AffinityGroup[]; timestamp: number }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [lastActionTime, setLastActionTime] = useState(0);

  // 🎯 COUCHE 7: Multiselection
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [isMovingWithArrows, setIsMovingWithArrows] = useState(false);
  const [selectionAnchor, setSelectionAnchor] = useState<string | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionBox, setSelectionBox] = useState<{ start: { x: number; y: number }; end: { x: number; y: number } } | null>(null);

  // 🎯 COUCHE 8: Édition de groupes
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  // 🎯 COUCHE 9: Hooks personnalisés
  const {
    notifyConnectionCreated,
    notifyConnectionCreationStarted,
    notifyConnectionCreationCancelled,
    notifyConnectionDeleted,
    notifyConnectionError,
  } = useAffinityToasts();

  // 🎯 COUCHE 10: Mémoization des données
  const availableInsights = useMemo(() => {
    const usedInsightIds = new Set(groups.flatMap(group => group.insightIds));
    return insights.filter(insight => !usedInsightIds.has(insight.id as Id<"insights">));
  }, [groups, insights]);

  // ==================== CONNECTIONS - GESTION ====================

  // 🎯 Handler création de connection
  const handleGroupConnectionStart = useCallback((groupId: string) => {
    if (connectionMode && connectionStart && connectionStart !== groupId) {
      console.log(`🔗 Creating connection: ${connectionStart} → ${groupId} (${connectionMode})`);
      onConnectionCreate?.(connectionStart, groupId, connectionMode);
      setConnectionStart(null);
      setConnectionMode(null);
      setMousePosition(null);
    } else if (connectionMode && !connectionStart) {
      setConnectionStart(groupId);
      console.log(`🔗 Connection started from group: ${groupId}`);
    }
  }, [connectionMode, connectionStart, onConnectionCreate]);

  // 🎯 Handler clic sur connection
  const handleConnectionClick = useCallback((connection: GroupConnection) => {
    console.log("🔗 Connection clicked:", connection);
    setSelectedConnection(connection);
  }, []);

  // 🎯 Handler suppression connection
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

  // 🎯 Annulation création connection
  const cancelConnectionCreation = useCallback(() => {
    if (connectionStart) {
      console.log("❌ Connection creation cancelled");
      setConnectionStart(null);
      setConnectionMode(null);
      setMousePosition(null);
      notifyConnectionCreationCancelled();
    }
  }, [connectionStart, notifyConnectionCreationCancelled]);

  // ==================== UNDO/REDO - GESTION ====================

  const saveToHistory = useCallback((newGroups: AffinityGroup[], action: string = "modification") => {
    const now = Date.now();
    if (now - lastActionTime < 500 && action === "drag") return;
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

  // ==================== MULTISELECTION - GESTION ====================

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
    } else {
      setSelectedGroups(new Set([groupId]));
      setSelectionAnchor(groupId);
    }
  }, [groups, selectionAnchor, connectionMode, handleGroupConnectionStart]);

  // ==================== ZOOM/PAN - GESTION ====================

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

  // 🎯 Handler mouvement souris principal
  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning && e.buttons === 1) {
      setPosition(prev => ({
        x: prev.x + e.movementX,
        y: prev.y + e.movementY
      }));
    }
    
    // Tracking souris pour les connections
    if (connectionMode && connectionStart) {
      const rect = canvasRef.current!.getBoundingClientRect();
      const x = (e.clientX - rect.left);
      const y = (e.clientY - rect.top);
      setMousePosition({ x, y });
    }
    
    // Sélection rectangulaire
    if (isSelecting && selectionBox) {
      const rect = canvasRef.current!.getBoundingClientRect();
      const endX = (e.clientX - rect.left - position.x) / scale;
      const endY = (e.clientY - rect.top - position.y) / scale;
      setSelectionBox(prev => prev ? { ...prev, end: { x: endX, y: endY } } : null);
      
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
  }, [isPanning, connectionMode, connectionStart, isSelecting, selectionBox, groups, position.x, position.y, scale]);

  // ==================== RENDU PRINCIPAL ====================

  return (
    <div className="h-full relative bg-gray-50 overflow-hidden">
      {/* 🎯 COUCHE 11: Toolbars (z-index: 30) */}
      <div className="absolute top-4 left-4 z-30 flex gap-2">
        {/* Connection Tools */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-1 flex gap-1 items-center">
          {connectionStart && (
            <div className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded mr-1">
              Connecting...
            </div>
          )}
          
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
                setMousePosition(null);
              }}
              className={`w-8 h-8 rounded flex items-center justify-center transition-all group relative ${
                connectionMode === type 
                  ? 'bg-purple-100 text-purple-700 border-2 border-purple-500' 
                  : 'hover:bg-gray-100 text-gray-700 border-2 border-transparent'
              }`}
              title={`${label} Connection`}
            >
              {icon}
            </button>
          ))}
          
          {connectionStart && (
            <button
              onClick={cancelConnectionCreation}
              className="w-8 h-8 rounded flex items-center justify-center bg-red-100 text-red-700 border-2 border-red-500 hover:bg-red-200 transition-all"
              title="Cancel Connection (ESC)"
            >
              ✕
            </button>
          )}
        </div>

        {/* Undo/Redo */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-1 flex gap-1">
          <button onClick={undo} disabled={historyIndex <= 0} className="w-8 h-8 rounded hover:bg-gray-100 flex items-center justify-center text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed">
            <Undo2 size={16} />
          </button>
          <button onClick={redo} disabled={historyIndex >= history.length - 1} className="w-8 h-8 rounded hover:bg-gray-100 flex items-center justify-center text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed">
            <Redo2 size={16} />
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-1 flex gap-1">
          <button onClick={() => setScale(s => Math.min(3, s + 0.1))} className="w-8 h-8 rounded hover:bg-gray-100 flex items-center justify-center text-gray-700 font-semibold">+</button>
          <button onClick={() => setScale(s => Math.max(0.1, s - 0.1))} className="w-8 h-8 rounded hover:bg-gray-100 flex items-center justify-center text-gray-700 font-semibold">−</button>
          <div className="w-12 h-8 flex items-center justify-center text-xs text-gray-600 border-l border-gray-200">{Math.round(scale * 100)}%</div>
        </div>
      </div>

      {/* 🎯 COUCHE 12: Stats (z-index: 25) */}
      <div className="absolute top-4 right-96 z-25 bg-white rounded-lg shadow-lg border border-gray-200 px-4 py-2">
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

      {/* 🎯 COUCHE 13: Canvas principal (z-index: 0) */}
      <div
        ref={canvasRef}
        className="absolute inset-0"
        style={{ cursor: isPanning ? 'grabbing' : (isSelecting ? 'crosshair' : (connectionMode ? 'crosshair' : 'grab')) }}
        onMouseDown={(e) => {
          if (e.button === 0 && e.target === canvasRef.current) {
            setIsPanning(true);
          }
          if (e.button === 0 && e.target === canvasRef.current && !e.ctrlKey && !e.metaKey) {
            const rect = canvasRef.current!.getBoundingClientRect();
            const startX = (e.clientX - rect.left - position.x) / scale;
            const startY = (e.clientY - rect.top - position.y) / scale;
            setIsSelecting(true);
            setSelectionBox({ start: { x: startX, y: startY }, end: { x: startX, y: startY } });
          }
          setSelectedGroups(new Set());
          setSelectionAnchor(null);
          cancelConnectionCreation();
        }}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={() => {
          setIsPanning(false);
          setIsSelecting(false);
          setSelectionBox(null);
        }}
        onMouseLeave={() => {
          setIsPanning(false);
          setIsSelecting(false);
          setSelectionBox(null);
        }}
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
          {/* 🎯 COUCHE 14: Grid background (z-index: 1) */}
          <div className="absolute inset-0" style={{
            backgroundImage: `linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }} />

          {/* 🎯 COUCHE 15: Connections (z-index: 10) */}
          <ConnectionsLayer
            groups={groups}
            connections={connections}
            onConnectionClick={handleConnectionClick}
          />

          {/* 🎯 COUCHE 16: Groupes (z-index: 20) */}
          {groups.map((group) => (
            <DraggableGroup
              key={group.id}
              group={group}
              insights={insights}
              scale={scale}
              isHovered={hoveredGroup === group.id}
              isDragOver={dragOverGroup === group.id}
              isSelected={selectedGroups.has(group.id)}
              onSelect={handleGroupClick}
              onMove={onGroupMove}
              onDelete={onGroupDelete}
              onTitleUpdate={onGroupTitleUpdate}
              onRemoveInsight={onInsightRemoveFromGroup}
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
              onRenameRequest={(groupId) => {
                const group = groups.find(g => g.id === groupId);
                if (group) {
                  setEditingGroupId(groupId);
                  setEditingTitle(group.title);
                }
              }}
              onCreateConnectionFromGroup={(groupId) => {
                setConnectionMode('related');
                setConnectionStart(groupId);
              }}
            />
          ))}
        </div>
      </div>

      {/* 🎯 COUCHE 17: Panneau insights (z-index: 20) */}
      <div className="absolute right-4 top-4 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-20 overflow-hidden">
        {/* ... panneau insights existant ... */}
      </div>

      {/* 🎯 COUCHE 18: Modals (z-index: 50) */}
      {editingGroupId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          {/* Modal édition groupe */}
        </div>
      )}

      {selectedConnection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          {/* Modal détails connection */}
        </div>
      )}

      {/* 🎯 COUCHE 19: Indicateurs temporaires (z-index: 40) */}
      {selectedGroups.size > 0 && (
        <motion.div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg z-40 flex items-center gap-4">
          {/* Indicateurs raccourcis */}
        </motion.div>
      )}

      {draggedInsight && (
        <motion.div className="fixed top-6 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg z-40 flex items-center gap-2">
          <Move size={14} />
          Drag to organize insight
        </motion.div>
      )}
    </div>
  );
}