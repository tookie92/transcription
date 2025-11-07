// components/AffinityCanvas.tsx - VERSION COMPLÈTE ET SIMPLIFIÉE
"use client";

import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import AffinityGroup from "./AffinityGroup";
import { Plus, Users, Vote, Download, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Undo, Redo, ChevronRight, ChevronLeft } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { AffinityGroup as AffinityGroupType, Insight } from "@/types";
import { toast } from "sonner";
import { useCanvasShortcuts } from "@/hooks/useCanvasShortcuts";
import { useHistory } from "@/hooks/useHistory";
import { DotVotingPanel } from "./DotVotingPanel";
import { Button } from "../ui/button";

interface AffinityCanvasProps {
  groups: AffinityGroupType[];
  insights: Insight[];
  projectId: string; // ← AJOUTER projectId
  mapId: string;     // ← AJOUTER mapId
  onGroupMove: (groupId: string, position: { x: number; y: number }) => void;
  onGroupCreate: (position: { x: number; y: number }) => void;
  onInsightDrop: (insightId: string, groupId: string) => void;
  onInsightRemoveFromGroup?: (insightId: string, groupId: string) => void;
  onGroupDelete?: (groupId: string) => void;
  onManualInsightCreate: (text: string, type: Insight['type']) => void;
  onGroupTitleUpdate?: (groupId: string, title: string) => void;
  onGroupsReplace?: (groups: AffinityGroupType[]) => void;
}

export default function AffinityCanvas({ 
  groups, 
  insights,
  projectId,
  mapId,
  onGroupMove, 
  onGroupCreate,
  onInsightDrop,
  onInsightRemoveFromGroup,
  onGroupDelete,
  onManualInsightCreate,
  onGroupTitleUpdate,
  onGroupsReplace
}: AffinityCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  
  const [dragOverGroup, setDragOverGroup] = useState<string | null>(null);
  const [draggedInsightId, setDraggedInsightId] = useState<string | null>(null);
  
  const [newInsightText, setNewInsightText] = useState("");
  const [newInsightType, setNewInsightType] = useState<Insight['type']>('insight');
  const [showAddInsight, setShowAddInsight] = useState(false);
  const [workspaceMode, setWorkspaceMode] = useState<'grouping' | 'voting'>('grouping');

  // 🆕 États pour la sélection et mouvement clavier
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [isMovingWithArrows, setIsMovingWithArrows] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });


  // 🆕 Historique SIMPLE
  const history = useHistory();

  // 📊 Stats pour le header
  const stats = useMemo(() => {
    const totalInsights = insights.length;
    const groupedInsights = groups.reduce((sum, group) => sum + group.insightIds.length, 0);
    const ungroupedInsights = totalInsights - groupedInsights;
    
    return {
      totalInsights,
      groupedInsights,
      ungroupedInsights,
      groupCount: groups.length,
      completion: totalInsights > 0 ? Math.round((groupedInsights / totalInsights) * 100) : 0
    };
  }, [groups, insights]);

  const availableInsights = useMemo(() => {
    const usedInsightIds = new Set(groups.flatMap(group => group.insightIds));
    return insights.filter(insight => !usedInsightIds.has(insight.id));
  }, [groups, insights]);

    // 🆕 Référence pour gérer les clicks
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const clickCountRef = useRef(0);

  // ==================== HISTORIQUE SIMPLE ====================

  // 🆕 ONLY 2 handlers pour undo/redo
  const handleUndo = useCallback(() => {
    console.log("🔄 UNDO called");
    const previousState = history.undo();
    if (previousState) {
      onGroupsReplace?.(previousState.groups);
      toast.success("Undone");
    } else {
      toast.info("Nothing to undo");
    }
  }, [history, onGroupsReplace]);

  const handleRedo = useCallback(() => {
    console.log("🔄 REDO called");
    const nextState = history.redo();
    if (nextState) {
      onGroupsReplace?.(nextState.groups);
      toast.success("Redone");
    } else {
      toast.info("Nothing to redo");
    }
  }, [history, onGroupsReplace]);

const saveCurrentState = useCallback((action: string, description: string) => {
  history.pushState(groups, insights, action, description);
}, [groups, insights, history]);

//=========== Arrow Move ===========

  // 🆕 État local pour les positions optimistes
  const [optimisticPositions, setOptimisticPositions] = useState<Map<string, {x: number, y: number}>>(new Map());

  // 🆕 Fonction pour obtenir la position actuelle (optimiste ou réelle)
  const getCurrentPosition = useCallback((groupId: string) => {
    return optimisticPositions.get(groupId) || groups.find(g => g.id === groupId)?.position;
  }, [optimisticPositions, groups]);

  // 🆕 Handler optimiste pour le mouvement flèches
  const handleArrowMove = useCallback((direction: 'up' | 'down' | 'left' | 'right', shiftKey: boolean) => {
    if (selectedGroups.size === 0) return;
    
    const moveDelta = shiftKey ? 20 : 5;
    
    // Sauvegarder l'état avant le mouvement
    saveCurrentState("before_move", `Before moving ${selectedGroups.size} groups`);
    
    console.log("🎯 Arrow move triggered:", direction, "Shift:", shiftKey);
    console.log("📋 Selected groups:", Array.from(selectedGroups));
    
    // 🆕 MISE À JOUR OPTIMISTE IMMÉDIATE
    const newPositions = new Map(optimisticPositions);
    
    selectedGroups.forEach(groupId => {
      const group = groups.find(g => g.id === groupId);
      
      if (group) {
        // 🆕 UTILISER LA POSITION OPTIMISTE SI ELLE EXISTE
        const currentPosition = optimisticPositions.get(groupId) || group.position;
        
        let newX = currentPosition.x;
        let newY = currentPosition.y;

        switch (direction) {
          case 'up':
            newY -= moveDelta;
            break;
          case 'down':
            newY += moveDelta;
            break;
          case 'left':
            newX -= moveDelta;
            break;
          case 'right':
            newX += moveDelta;
            break;
        }

        const newPosition = { x: newX, y: newY };
        console.log(`📍 New position for ${group.title}:`, newPosition);
        
        // 🆕 MISE À JOUR IMMÉDIATE LOCALE
        newPositions.set(groupId, newPosition);
        
        // 🆕 APPEL ASYNCHRONE À LA MUTATION
        onGroupMove(groupId, newPosition);
      }
    });

    // 🆕 APPLIQUER LES NOUVELLES POSITIONS OPTIMISTES
    setOptimisticPositions(newPositions);

    setIsMovingWithArrows(true);
    setTimeout(() => setIsMovingWithArrows(false), 100);
  }, [selectedGroups, groups, onGroupMove, saveCurrentState, optimisticPositions]);

  // 🆕 Handler optimiste pour le drag & drop
  const handleGroupMoveOptimistic = useCallback((groupId: string, newPosition: { x: number; y: number }) => {
    // 🆕 MISE À JOUR OPTIMISTE IMMÉDIATE
    setOptimisticPositions(prev => {
      const newMap = new Map(prev);
      newMap.set(groupId, newPosition);
      return newMap;
    });
    
    // Appel à la mutation parente
    onGroupMove(groupId, newPosition);
  }, [onGroupMove]);

  // 🆕 Réinitialiser les positions optimistes quand les groupes changent
  useEffect(() => {
    setOptimisticPositions(new Map());
  }, [groups]); // Réinitialise quand les groupes changent depuis la DB





// ==================== RACCOURCIS CLAVIER ====================
  // 🆕 Handlers avec sauvegarde MANUELLE
  const handleGroupDeleteWithSave = useCallback((groupId: string) => {
    const groupToDelete = groups.find(g => g.id === groupId);
    
    // 1. Sauvegarde AVANT la suppression
    saveCurrentState("before_delete", `Before deleting group "${groupToDelete?.title}"`);
    
    // 2. Execute l'action
    onGroupDelete?.(groupId);
  }, [onGroupDelete, groups, saveCurrentState]);

  const handleGroupTitleUpdateWithSave = useCallback((groupId: string, title: string) => {
    const oldGroup = groups.find(g => g.id === groupId);
    
    // 1. Sauvegarde AVANT le rename
    saveCurrentState("before_rename", `Before renaming group "${oldGroup?.title}"`);
    
    // 2. Execute l'action
    onGroupTitleUpdate?.(groupId, title);
  }, [onGroupTitleUpdate, groups, saveCurrentState]);

  // ==================== RACCOURCIS CLAVIER ====================

  // 🆕 Raccourci clavier pour toggle voting panel
  useCanvasShortcuts({
    onNewGroup: () => {
      const x = (cursorPosition.x - position.x) / scale;
      const y = (cursorPosition.y - position.y) / scale;
      onGroupCreate({ x, y });
      toast.success("New group created (N)");
    },
    onSelectAll: () => {
      setSelectedGroups(new Set(groups.map(g => g.id)));
      toast.info(`Selected all ${groups.length} groups`);
    },
    onDeleteSelected: () => {
      if (selectedGroups.size > 0) {
        saveCurrentState("before_multiple_delete", `Before deleting ${selectedGroups.size} groups`);
        
        if (confirm(`Delete ${selectedGroups.size} selected group(s)?`)) {
          selectedGroups.forEach(groupId => {
            onGroupDelete?.(groupId);
          });
          setSelectedGroups(new Set());
          toast.success(`Deleted ${selectedGroups.size} group(s)`);
        }
      }
    },
    onEscape: () => {
      if (selectedGroups.size > 0) {
        setSelectedGroups(new Set());
        toast.info("Selection cleared");
      }
    },
    onArrowMove: handleArrowMove, // 🆕 UTILISER LE HANDLER OPTIMISTE
    onUndo: handleUndo,
    onRedo: handleRedo,
    onToggleVotingPanel: () => {
      setShowVotingPanel(prev => !prev);
      toast.info(showVotingPanel ? "Voting panel hidden" : "Voting panel shown");
    },
    selectedGroups,
  });

    // 🆕 État pour le panel voting
  const [showVotingPanel, setShowVotingPanel] = useState(false);

  // ==================== GESTION Wheel ====================

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    
    if (e.ctrlKey) {
      // Zoom avec Ctrl + molette
      const zoomIntensity = 0.1;
      const delta = -e.deltaY * zoomIntensity * 0.01;
      const newScale = Math.min(2, Math.max(0.3, scale * (1 + delta)));
      
      // Zoom vers le curseur
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Calculer la position relative avant le zoom
        const worldX = (mouseX - position.x) / scale;
        const worldY = (mouseY - position.y) / scale;
        
        // Appliquer le zoom
        setScale(newScale);
        
        // Ajuster la position pour zoomer vers le curseur
        setPosition({
          x: mouseX - worldX * newScale,
          y: mouseY - worldY * newScale
        });
      }
    } else {
      // Pan avec molette seule
      setPosition(prev => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY
      }));
    }
  }, [scale, position]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('wheel', handleWheel, { passive: false });
      return () => canvas.removeEventListener('wheel', handleWheel);
    }
  }, [handleWheel]);


  // ==================== GESTION SOURIS ====================
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // LAISSER LE CLIC DROIT POUR SHADCN CONTEXT MENU
    if (e.button === 2) {
      return; // Shadcn gère le context menu
    }

    // Panning seulement avec espace + clic ou bouton milieu
    if (e.button === 1 || (e.button === 0 && isSpacePressed)) {
      setIsPanning(true);
      return;
    }
    
    // Pour le clic gauche normal, on ne fait rien ici
    // La gestion est dans handleCanvasClick
  };

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    // Track cursor position
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      setCursorPosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }

    // Panning
    if (isPanning && e.buttons === 1) {
      setPosition(prev => ({
        x: prev.x + e.movementX,
        y: prev.y + e.movementY
      }));
    }
  }, [isPanning]);

  const handleCanvasMouseUp = () => {
    setIsPanning(false);
  };

  // Nettoyer le timeout quand le composant est démonté
  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
    };
  }, []);

  // 🆕 DOUBLE-CLICK GAUCHE POUR CRÉER UN GROUPE
  const handleDoubleClick = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = (e.clientX - rect.left - position.x) / scale;
    const y = (e.clientY - rect.top - position.y) / scale;
    
    onGroupCreate({ x, y });
    toast.success("Group created with right-click");
    }
  };

 const handleCanvasClick = (e: React.MouseEvent) => {
    // Si c'est un clic sur le canvas vide (pas sur un groupe)
    if (e.target === canvasRef.current) {
      clickCountRef.current++;
      
      if (clickCountRef.current === 1) {
        // Premier clic - attendre pour voir si c'est un double-click
        clickTimeoutRef.current = setTimeout(() => {
          // Clic simple - désélectionner les groupes
          setSelectedGroups(new Set());
          clickCountRef.current = 0;
        }, 300); // Délai pour détecter le double-click
      } else if (clickCountRef.current === 2) {
        // Double-click détecté - créer un groupe
        if (clickTimeoutRef.current) {
          clearTimeout(clickTimeoutRef.current);
        }
        
        const rect = canvasRef.current!.getBoundingClientRect();
        const x = (e.clientX - rect.left - position.x) / scale;
        const y = (e.clientY - rect.top - position.y) / scale;
        
        onGroupCreate({ x, y });
        toast.success("Group created with double-click");
        
        clickCountRef.current = 0;
      }
    } else {
      // Clic sur autre chose que le canvas - réinitialiser
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
      clickCountRef.current = 0;
    }
  };



  // 🆕 Gestion de la sélection des groupes
  const handleGroupSelect = useCallback((groupId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (e.ctrlKey || e.metaKey) {
      // Sélection multiple avec Ctrl
      setSelectedGroups(prev => {
        const newSelection = new Set(prev);
        if (newSelection.has(groupId)) {
          newSelection.delete(groupId);
        } else {
          newSelection.add(groupId);
        }
        return newSelection;
      });
    } else {
      // Sélection simple
      setSelectedGroups(new Set([groupId]));
    }
  }, []);

   // 🆕 GESTION CLIC DROIT POUR CRÉER UN GROUPE
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault(); // Empêcher le menu contextuel du navigateur
    
    // const rect = canvasRef.current!.getBoundingClientRect();
    // const x = (e.clientX - rect.left - position.x) / scale;
    // const y = (e.clientY - rect.top - position.y) / scale;
    
    // onGroupCreate({ x, y });
    // toast.success("Group created with right-click");
  };


  // ==================== GESTION TOUCHE ESPACE ====================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setIsSpacePressed(true);
        if (canvasRef.current) {
          canvasRef.current.style.cursor = 'grab';
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
        if (canvasRef.current) {
          canvasRef.current.style.cursor = 'default';
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // ==================== RENDER ====================

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* HEADER AVEC RACCOURCIS */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Affinity Diagram</h1>
              <p className="text-sm text-gray-600">Group related insights to discover patterns</p>
            </div>
            
            {/* STATS */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-gray-700">{stats.totalInsights} insights</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-gray-700">{stats.groupCount} groups</span>
              </div>
              {selectedGroups.size > 0 && (
                <div className="flex items-center gap-2 bg-orange-100 px-3 py-1 rounded-full">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span className="text-orange-700 font-medium">{selectedGroups.size} selected</span>
                </div>
              )}
            </div>
          </div>

          {/* TOOLBAR */}
          <div className="flex items-center gap-4">

            {/* BOUTON TOGGLE VOTING PANEL */}
            <Button
              onClick={() => setShowVotingPanel(!showVotingPanel)}
              className={`px-4 py-2 rounded-lg border flex items-center gap-2 transition-colors ${
                showVotingPanel 
                  ? 'bg-purple-500 text-white border-purple-600' 
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Vote size={16} />
              {showVotingPanel ? 'Hide Voting' : 'Show Voting'}
              {showVotingPanel ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </Button>
            {/* UNDO/REDO */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleUndo}
                disabled={!history.canUndo}
                className={`px-3 py-2 rounded-lg border flex items-center gap-2 ${
                  history.canUndo
                    ? 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                    : 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                }`}
                title="Undo (Ctrl+Z)"
              >
                <Undo size={16} />
                Undo
              </button>

              <button
                onClick={handleRedo}
                disabled={!history.canRedo}
                className={`px-3 py-2 rounded-lg border flex items-center gap-2 ${
                  history.canRedo
                    ? 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                    : 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                }`}
                title="Redo (Ctrl+Y)"
              >
                <Redo size={16} />
                Redo
              </button>
            </div>

            {/* INDICATEUR RACCOURCIS */}
            <div className="text-xs text-gray-500 flex items-center gap-3">
              <kbd className="px-2 py-1 bg-gray-100 rounded border text-xs">N</kbd>
              <span>New group</span>
              <kbd className="px-2 py-1 bg-gray-100 rounded border text-xs">Ctrl+A</kbd>
              <span>Select all</span>
              <kbd className="px-2 py-1 bg-gray-100 rounded border text-xs">←↑↓→</kbd>
              <span>Move</span>
            </div>

            {/* MODES */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setWorkspaceMode('grouping')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  workspaceMode === 'grouping'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Users size={16} className="inline mr-2" />
                Grouping
              </button>
              <button
                onClick={() => setWorkspaceMode('voting')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  workspaceMode === 'voting'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Vote size={16} className="inline mr-2" />
                Dot Voting
              </button>
            </div>

            <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-2">
              <Download size={16} />
              Export
            </button>
          </div>
        </div>

        {/* PROGRESS BAR */}
        <div className="mt-3">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${stats.completion}%` }}
            ></div>
          </div>
        </div>
      </header>

      {/* MAIN WORKSPACE */}
      <div className="flex-1 flex min-h-0">
        {/* SIDEBAR - INSIGHTS DISPONIBLES */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col shrink-0">
          <div className="p-4 border-b border-gray-200 shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Available Insights</h3>
              <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-sm font-medium">
                {availableInsights.length}
              </span>
            </div>
            
            <button
              onClick={() => setShowAddInsight(!showAddInsight)}
              className="w-full bg-blue-500 text-white py-2.5 px-4 rounded-lg text-sm font-medium hover:bg-blue-600 transition-all flex items-center justify-center gap-2"
            >
              <Plus size={16} />
              Add Insight
            </button>

            {showAddInsight && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
                {/* Sélecteur de type */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'pain-point', label: 'Pain', color: 'bg-red-100 text-red-700' },
                    { value: 'quote', label: 'Quote', color: 'bg-blue-100 text-blue-700' },
                    { value: 'insight', label: 'Insight', color: 'bg-purple-100 text-purple-700' },
                    { value: 'follow-up', label: 'Follow-up', color: 'bg-green-100 text-green-700' },
                    { value: 'custom', label: 'Custom', color: 'bg-gray-100 text-gray-700' },
                  ].map(({ value, label, color }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setNewInsightType(value as Insight['type'])}
                      className={`p-2 rounded-lg text-xs font-medium transition-colors ${
                        newInsightType === value
                          ? `${color} border-2 border-current`
                          : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                
                <textarea
                  value={newInsightText}
                  onChange={(e) => setNewInsightText(e.target.value)}
                  placeholder="Type your insight, observation, or quote..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
                
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (newInsightText.trim()) {
                        onManualInsightCreate(newInsightText.trim(), newInsightType);
                        setNewInsightText("");
                        setNewInsightType('insight');
                        setShowAddInsight(false);
                      }
                    }}
                    disabled={!newInsightText.trim()}
                    className="flex-1 bg-green-500 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    Add {newInsightType.charAt(0).toUpperCase() + newInsightType.slice(1).replace('-', ' ')}
                  </button>
                  <button
                    onClick={() => {
                      setShowAddInsight(false);
                      setNewInsightText("");
                      setNewInsightType('insight');
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* LISTE DES INSIGHTS SCROLLABLE */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-3 space-y-2">
              {availableInsights.map(insight => (
                <motion.div
                  key={insight.id}
                  draggable={workspaceMode === 'grouping'}
                  onDragStart={(e) => {
                    const data = e as unknown as React.DragEvent;
                    data.dataTransfer.effectAllowed = 'move';
                    data.dataTransfer.setData('text/plain', insight.id);
                    setDraggedInsightId(insight.id);
                  }}
                  onDragEnd={() => {
                    setDraggedInsightId(null);
                  }}
                  whileHover={{ scale: workspaceMode === 'grouping' ? 1.02 : 1 }}
                  className={`p-3 rounded-lg border cursor-${workspaceMode === 'grouping' ? 'move' : 'default'} transition-all group relative ${
                    workspaceMode === 'grouping' 
                      ? 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-md' 
                      : 'bg-gray-50 border-gray-100'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      insight.type === 'pain-point' ? 'bg-red-100 text-red-700' :
                      insight.type === 'quote' ? 'bg-blue-100 text-blue-700' :
                      insight.type === 'insight' ? 'bg-purple-100 text-purple-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {insight.type}
                    </span>
                    {insight.source === 'manual' && (
                      <span className="text-xs text-gray-400">Manual</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 leading-snug">
                    {insight.text}
                  </p>
                  {workspaceMode === 'grouping' && (
                    <p className="text-xs text-gray-400 mt-2">Drag to group</p>
                  )}
                </motion.div>
              ))}

              {availableInsights.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-3xl mb-2">🎉</div>
                  <p className="font-medium">All insights organized!</p>
                  <p className="text-sm mt-1">Great job on your affinity mapping</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CANVAS PRINCIPAL */}
        <div className="flex-1 relative overflow-hidden bg-linear-to-br from-gray-50 to-gray-100">
          <div
            ref={canvasRef}
            className="absolute inset-0"
            style={{ 
              cursor: isSpacePressed ? 'grab' : (isPanning ? 'grabbing' : 'default')
            }}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
            onDoubleClick={handleDoubleClick}
            onContextMenu={handleContextMenu}
          >
           
            {/* CANVAS CONTENT */}
            <div
              className="absolute"
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                transformOrigin: '0 0',
                width: '5000px',
                height: '5000px',
              }}
            >
              {/* GRID BACKGROUND */}
              <div 
                className="absolute inset-0 canvas-background"
                style={{
                  backgroundImage: `
                    linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)
                  `,
                  backgroundSize: '40px 40px',
                }}
              />

              {/* GROUPS */}
              <div className="p-8">
                {groups.map((group) =>{
                  const currentPosition = getCurrentPosition(group.id);
                 return (
                    
                    <AffinityGroup
                      key={group.id}
                      group={{
                        ...group,
                        position: currentPosition || group.position
                      }}
                      insights={insights}
                      scale={scale}
                      isSelected={selectedGroups.has(group.id)}
                      isDragOver={dragOverGroup === group.id}
                      onMove={handleGroupMoveOptimistic}
                      onDelete={onGroupDelete}
                      onTitleUpdate={onGroupTitleUpdate}
                      onRemoveInsight={onInsightRemoveFromGroup}
                      onSelect={(groupId, e) => {
                        e.stopPropagation();
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
                        } else {
                          setSelectedGroups(new Set([groupId]));
                        }
                      }}
                      onDragOver={(e: React.DragEvent) => {
                        if (workspaceMode === 'grouping') {
                          e.preventDefault();
                          setDragOverGroup(group.id);
                        }
                      }}
                      onDragLeave={() => {
                        setDragOverGroup(null);
                      }}
                      onDrop={(e: React.DragEvent) => {
                        if (workspaceMode === 'grouping') {
                          e.preventDefault();
                          const insightId = e.dataTransfer.getData('text/plain');
                          if (insightId) {
                            onInsightDrop(insightId, group.id);
                          }
                          setDragOverGroup(null);
                        }
                      }}
                      workspaceMode={workspaceMode}
                    />
                  )
                } 
                )}

                {/* EMPTY STATE */}
                {groups.length === 0 && (
                  <div className="text-center py-20">
                    <div className="text-6xl mb-4">📊</div>
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">Start Creating Groups</h3>
                    <p className="text-gray-500 mb-4">Double-click on the canvas to create your first group</p>
                    <div className="flex justify-center gap-4 text-sm text-gray-600 mb-6">
                      <div className="flex items-center gap-2">
                        <kbd className="px-2 py-1 bg-gray-100 rounded border text-xs">Double-click</kbd>
                        <span>Create group</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <kbd className="px-2 py-1 bg-gray-100 rounded border text-xs">N</kbd>
                        <span>New group</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* INDICATEUR MOUVEMENT CLAVIER */}
          {isMovingWithArrows && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg z-50 flex items-center gap-2"
            >
              <ArrowUp size={14} />
              <span>Moving {selectedGroups.size} group{selectedGroups.size > 1 ? 's' : ''}</span>
            </motion.div>
          )}

          {/* INDICATEUR ESPACE */}
          {isSpacePressed && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg z-50">
              🖱️ Space + Drag to pan
            </div>
          )}

          {/* ZOOM CONTROLS */}
          <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-2 flex gap-1">
            <button 
              onClick={() => setScale(s => Math.min(2, s + 0.1))}
              className="w-8 h-8 rounded hover:bg-gray-100 flex items-center justify-center text-gray-700 font-semibold"
            >
              +
            </button>
            <button 
              onClick={() => setScale(s => Math.max(0.3, s - 0.1))}
              className="w-8 h-8 rounded hover:bg-gray-100 flex items-center justify-center text-gray-700 font-semibold"
            >
              −
            </button>
            <div className="w-12 h-8 flex items-center justify-center text-xs text-gray-600 border-l border-gray-200">
              {Math.round(scale * 100)}%
            </div>
          </div>
        </div>
         <AnimatePresence>
          {showVotingPanel && (
            <motion.div
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="w-80 bg-white border-l border-gray-200 flex flex-col shrink-0 z-30"
            >
              <DotVotingPanel 
                projectId={projectId}
                mapId={mapId}
                groups={groups}
                insights={insights}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}