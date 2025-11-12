// components/AffinityCanvas.tsx - VERSION COMPLÈTE ET SIMPLIFIÉE
"use client";

import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import AffinityGroup from "./AffinityGroup";
import { Plus, Users, Vote, Download, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Undo, Redo, ChevronRight, ChevronLeft, BarChart3, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { AffinityGroup as AffinityGroupType, Insight } from "@/types";
import { toast } from "sonner";
import { useCanvasShortcuts } from "@/hooks/useCanvasShortcuts";
import { useHistory } from "@/hooks/useHistory";
import { DotVotingPanel } from "./DotVotingPanel";
import { Button } from "../ui/button";
import { AnalyticsDashboard } from "./AnalyticsDashboard";
import { UngroupedInsightsPanel } from "./UngroupedInsightsPanel";
import { InsightsOrganizationPanel } from "./InsightsOrganizationPanel";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

//Theme 
import { ThemeDiscoveryPanel } from "./ThemeDiscoveryPanel";
import { ThemeVisualization } from "./ThemeVisualization";
import { ThemeAnalysis, DetectedTheme, ThemeRecommendation } from "@/types";
import { useThemeDetection } from "@/hooks/useThemeDetection";
import { ThemeVisualizationDebug } from "./ThemeVisualizationDebug";
import { ThemeVisualizationFixed } from "./ThemeVisualizationFixed";
import { SimpleThemeTest } from "./SimpleThemeTest";
import { UltraSimpleTest } from "./UltraSimpleTest";
import { Badge } from "../ui/badge";
// 🆕 AJOUTER childGroupIds À L'INTERFACE



interface PendingGroupData {
  groupTitle: string;
  insightIds: string[];
  tempGroupId: string;
  createdAt: number;
  childGroupIds?: string[];
}

interface AffinityCanvasProps {
  groups: AffinityGroupType[];
  insights: Insight[];
  projectId: string; // ← AJOUTER projectId
  projectInfo?: { // 🎯 NOUVELLE PROP
    name: string;
    description?: string;
  };
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
  projectInfo,
  onGroupMove, 
  onGroupCreate,
  onInsightDrop,
  onInsightRemoveFromGroup,
  onGroupDelete,
  onManualInsightCreate,
  onGroupTitleUpdate,
  onGroupsReplace
}: AffinityCanvasProps) {

  // const [draggedInsightId, setDraggedInsightId] = useState<string | null>(null);
  
  // const [newInsightText, setNewInsightText] = useState("");
  // const [newInsightType, setNewInsightType] = useState<Insight['type']>('insight');
  // const [showAddInsight, setShowAddInsight] = useState(false);


  // ==================== QUERIES ====================
  const projectName = useQuery(api.projects.getById, {projectId: projectId as Id<"projects">});

  // ==================== HOOKS EXTERNES ====================
  const { 
    isAnalyzing: isThemesAnalyzing, 
    themeAnalysis,
    detectThemes, 
    clearThemes 
  } = useThemeDetection();

  const history = useHistory();

  // ==================== useRef ====================
  const canvasRef = useRef<HTMLDivElement>(null);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const clickCountRef = useRef(0);

  // ==================== useState ====================
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [dragOverGroup, setDragOverGroup] = useState<string | null>(null);
  const [workspaceMode, setWorkspaceMode] = useState<'grouping' | 'voting'>('grouping');
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [isMovingWithArrows, setIsMovingWithArrows] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [showThemeDiscovery, setShowThemeDiscovery] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<DetectedTheme | null>(null);
  const [pendingParentGroup, setPendingParentGroup] = useState<PendingGroupData | null>(null);
  const [applyingAction, setApplyingAction] = useState<string | null>(null);
  const [highlightedGroups, setHighlightedGroups] = useState<Set<string>>(new Set());
  const [activePanel, setActivePanel] = useState<'voting' | 'analytics' | null>(null);
  const [optimisticPositions, setOptimisticPositions] = useState<Map<string, {x: number, y: number}>>(new Map());
  const [renderKey, setRenderKey] = useState(0);
  const [isInputFocused, setIsInputFocused] = useState(false);

  // ==================== useMemo ====================
  const detectedThemes = useMemo(() => {
    return themeAnalysis?.themes || [];
  }, [themeAnalysis?.themes]);

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

  const projectContext = useMemo(() => {
    return projectInfo ? `
PROJECT: ${projectInfo.name}
DESCRIPTION: ${projectInfo.description || 'No description'}
`.trim() : 'General user research project';
  }, [projectInfo]);

  // ==================== useCallback ====================
  const extractSuggestedName = useCallback((reason: string): string => {
    console.log('🔍 Extracting name from:', reason);
    
    const patterns = [
      /suggested name: "([^"]+)"/i,
      /suggested name: '([^']+)'/i,
      /suggested name: ([^.,]+)/i,
      /suggested.*name: "([^"]+)"/i,
      /create.*theme.*: "([^"]+)"/i,
      /parent.*: "([^"]+)"/i,
      /merge.*as "([^"]+)"/i,
      /["']([^"']+)["'].*suggested/i
    ];
    
    for (const pattern of patterns) {
      const match = reason.match(pattern);
      if (match && match[1]) {
        const name = match[1].trim();
        console.log('✅ Extracted name:', name);
        return name;
      }
    }
    
    if (reason.includes('hierarchical')) return 'Parent Theme';
    if (reason.includes('merge')) return `Merged Group`;
    if (reason.includes('similar')) return 'Similar Insights';
    
    console.log('❌ No name found, using default');
    return 'New Theme';
  }, []);

  const saveCurrentState = useCallback((action: string, description: string) => {
    history.pushState(groups, insights, action, description);
  }, [groups, insights, history]);

    const getCurrentPosition = useCallback((groupId: string) => {
    return optimisticPositions.get(groupId) || groups.find(g => g.id === groupId)?.position;
  }, [optimisticPositions, groups]);

    const handleGroupsMerge = useCallback((groupIds: string[], newTitle: string) => {
    if (!mapId || groupIds.length < 2) {
      toast.error('Cannot merge - need at least 2 groups');
      return;
    }
    
    const groupsToMerge = groups.filter(group => groupIds.includes(group.id));
    if (groupsToMerge.length < 2) {
      toast.error('Selected groups not found');
      return;
    }
    
    const avgX = groupsToMerge.reduce((sum, group) => sum + group.position.x, 0) / groupsToMerge.length;
    const avgY = groupsToMerge.reduce((sum, group) => sum + group.position.y, 0) / groupsToMerge.length;
    const allInsightIds = groupsToMerge.flatMap(group => group.insightIds);
    
    console.log('🔄 Merging groups:', {
      groups: groupsToMerge.map(g => g.title),
      newTitle,
      insightCount: allInsightIds.length
    });
    
    saveCurrentState("before_merge", `Before merging ${groupsToMerge.length} groups into "${newTitle}"`);
    onGroupCreate({ x: avgX, y: avgY });
    
    setTimeout(() => {
      const newGroup = groups.find(group => 
        group.title === "New Theme" || group.title === "New Group"
      );
      
      if (newGroup) {
        console.log('✅ New group created, adding insights:', newGroup.id);
        
        allInsightIds.forEach((insightId, index) => {
          setTimeout(() => {
            onInsightDrop(insightId, newGroup.id);
          }, 50 * index);
        });
        
        if (onGroupTitleUpdate) {
          setTimeout(() => {
            onGroupTitleUpdate(newGroup.id, newTitle);
          }, 200);
        }
        
        setTimeout(() => {
          console.log('🗑️ Deleting empty source groups:', groupsToMerge.map(g => g.title));
          groupsToMerge.forEach(group => {
            if (group.insightIds.length === 0 || confirm(`Delete group "${group.title}"?`)) {
              onGroupDelete?.(group.id);
            }
          });
          toast.success(`✅ Merged ${groupsToMerge.length} groups into "${newTitle}"`);
        }, 1000);
        
      } else {
        toast.error('❌ Failed to create new group for merge');
      }
    }, 100);
    
  }, [mapId, groups, onGroupCreate, onInsightDrop, onGroupDelete, onGroupTitleUpdate, saveCurrentState]);

  const handleCreateParentGroup = useCallback((groupIds: string[], parentTitle: string) => {
    const childGroups = groups.filter(group => groupIds.includes(group.id));
    if (childGroups.length === 0) {
      toast.error('No groups found to create parent for');
      return;
    }
    
    const allChildInsightIds = childGroups.flatMap(group => group.insightIds);
    const avgX = childGroups.reduce((sum, group) => sum + group.position.x, 0) / childGroups.length;
    const avgY = childGroups.reduce((sum, group) => sum + group.position.y, 0) / childGroups.length;
    
    console.log('👨‍👦 Creating parent group:', {
      parentTitle,
      childGroups: childGroups.length,
      insights: allChildInsightIds.length
    });
    
    saveCurrentState("before_create_parent", `Creating parent "${parentTitle}" for ${childGroups.length} groups`);
    
    setPendingParentGroup({
      groupTitle: parentTitle,
      insightIds: allChildInsightIds,
      tempGroupId: `pending-${Date.now()}`,
      createdAt: Date.now(),
      childGroupIds: childGroups.map(g => g.id)
    });
    
    onGroupCreate({ x: avgX, y: avgY - 150 });
    toast.info(`Creating parent group "${parentTitle}"...`);
  }, [groups, onGroupCreate, saveCurrentState]);

  const handleReorganizeGroups = useCallback((groupIds: string[]) => {
    const groupsToReorganize = groups.filter(group => groupIds.includes(group.id));
    if (groupsToReorganize.length === 0) return;
    
    const centerX = groupsToReorganize.reduce((sum, group) => sum + group.position.x, 0) / groupsToReorganize.length;
    const centerY = groupsToReorganize.reduce((sum, group) => sum + group.position.y, 0) / groupsToReorganize.length;
    
    saveCurrentState("before_reorganize", `Before reorganizing ${groupsToReorganize.length} groups`);
    
    groupsToReorganize.forEach((group, index) => {
      const angle = (index / groupsToReorganize.length) * 2 * Math.PI;
      const radius = 200;
      const newPosition = {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius
      };
      
      onGroupMove(group.id, newPosition);
    });
    
    toast.success(`Reorganized ${groupsToReorganize.length} groups in a circle`);
  }, [groups, onGroupMove, saveCurrentState]);

  const handleApplyRecommendation = useCallback((recommendation: ThemeRecommendation) => {
    console.log('🎯 RECOMMENDATION APPLIED:', {
      type: recommendation.type,
      groups: recommendation.groups,
      reason: recommendation.reason
    });
    
    setApplyingAction(recommendation.type);
    setHighlightedGroups(new Set(recommendation.groups));
    
    const suggestedName = extractSuggestedName(recommendation.reason);
    
    toast.info(`Applying ${recommendation.type} recommendation...`);
    
    switch (recommendation.type) {
      case 'merge':
        if (recommendation.groups.length >= 2) {
          handleGroupsMerge(recommendation.groups, suggestedName);
        } else {
          toast.error('Need at least 2 groups to merge');
        }
        break;
        
      case 'split':
        if (recommendation.groups.length === 1) {
          const groupId = recommendation.groups[0];
          const group = groups.find(g => g.id === groupId);
          
          if (group) {
            toast.info(`Select group "${group.title}" to split it manually`, {
              duration: 5000,
              action: {
                label: 'Show Group',
                onClick: () => {
                  setSelectedGroups(new Set([groupId]));
                  const groupElement = document.querySelector(`[data-group-id="${groupId}"]`);
                  groupElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }
            });
          }
        } else {
          toast.info('Please select a single group to split manually');
        }
        break;
        
      case 'create_parent':
        if (recommendation.groups.length >= 1) {
          handleCreateParentGroup(recommendation.groups, suggestedName);
        } else {
          toast.error('Need groups to create parent for');
        }
        break;
        
      case 'reorganize':
        if (recommendation.groups.length >= 1) {
          handleReorganizeGroups(recommendation.groups);
        } else {
          toast.error('Need groups to reorganize');
        }
        break;
        
      default:
        toast.info(`Action "${recommendation.type}" ready to implement`);
    }
    
    setTimeout(() => {
      setApplyingAction(null);
      setHighlightedGroups(new Set());
    }, 3000);
    
  }, [handleGroupsMerge, handleCreateParentGroup, handleReorganizeGroups, groups, setSelectedGroups, extractSuggestedName]);


  const handleAnalyzeThemes = useCallback(async () => {
    if (groups.length === 0) {
      toast.error('No groups to analyze');
      return;
    }
    
    console.log('🔍 Starting theme analysis...', { groups: groups.length });
    
    toast.info('Analyzing themes patterns...');
    
    const analysis = await detectThemes(groups, insights, projectContext);
    
    if (analysis && analysis.themes.length > 0) {
      console.log('✅ Themes analysis completed:', analysis.themes.length, 'themes found');
      
      if (!selectedTheme && analysis.themes.length > 0) {
        setSelectedTheme(analysis.themes[0]);
      }
      
      toast.success(`Found ${analysis.themes.length} themes with ${analysis.summary.coverage}% coverage`);
    } else {
      console.log('❌ No themes detected');
      toast.info('No significant themes detected in current groups');
    }
  }, [groups, insights, projectContext, selectedTheme, detectThemes, setSelectedTheme]);





  const handleArrowKeys = useCallback((direction: 'up' | 'down' | 'left' | 'right', shiftKey: boolean) => {
    console.log("🔑 ARROW KEY PRESSED:", direction, "Shift:", shiftKey);
    
    if (selectedGroups.size === 0) {
      console.log("⚠️ No groups selected - ignoring arrow key");
      return;
    }
    
    const moveDistance = shiftKey ? 20 : 5;
    let deltaX = 0;
    let deltaY = 0;

    switch (direction) {
      case 'up': deltaY = -moveDistance; break;
      case 'down': deltaY = moveDistance; break;
      case 'left': deltaX = -moveDistance; break;
      case 'right': deltaX = moveDistance; break;
      default: return;
    }

    setIsMovingWithArrows(true);
    setTimeout(() => setIsMovingWithArrows(false), 150);

    selectedGroups.forEach(groupId => {
      const group = groups.find(g => g.id === groupId);
      if (group) {
        const newPosition = {
          x: group.position.x + deltaX,
          y: group.position.y + deltaY
        };

        setOptimisticPositions(prev => {
          const newMap = new Map(prev);
          newMap.set(groupId, newPosition);
          return newMap;
        });

        onGroupMove(groupId, newPosition);
      }
    });
  }, [selectedGroups, groups, onGroupMove]);

  const handleGroupMoveOptimistic = useCallback((groupId: string, newPosition: { x: number; y: number }) => {
    setOptimisticPositions(prev => {
      const newMap = new Map(prev);
      newMap.set(groupId, newPosition);
      return newMap;
    });
    
    onGroupMove(groupId, newPosition);
  }, [onGroupMove]);


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

  

  const toggleVotingPanel = useCallback(() => {
    setActivePanel(prev => prev === 'voting' ? null : 'voting');
  }, []);

  const toggleAnalyticsPanel = useCallback(() => {
    setActivePanel(prev => prev === 'analytics' ? null : 'analytics');
  }, []);

  const handleThemeSelect = useCallback((theme: DetectedTheme) => {
    setSelectedTheme(theme);
  }, []);

  // ==================== CUSTOM HOOKS ====================
  const useNewGroupDetection = (
    groups: AffinityGroupType[], 
    onNewGroupDetected: (groupId: string, pendingData: PendingGroupData) => void
  ) => {
    const previousGroupsRef = useRef<AffinityGroupType[]>([]);
    
    useEffect(() => {
      if (groups.length > previousGroupsRef.current.length && pendingParentGroup) {
        const newGroups = groups.filter(newGroup => 
          !previousGroupsRef.current.some(oldGroup => oldGroup.id === newGroup.id)
        );
        
        const defaultTitledGroups = newGroups.filter(group => 
          group.title === "New Theme" || group.title === "New Group"
        );
        
        if (defaultTitledGroups.length > 0) {
          console.log('🆕 New group detected:', defaultTitledGroups[0]);
          onNewGroupDetected(defaultTitledGroups[0].id, pendingParentGroup);
        }
      }
      
      previousGroupsRef.current = groups;
    }, [groups, pendingParentGroup, onNewGroupDetected]);
  };

  // ==================== HANDLERS SOURIS/CLAVIER ====================
  const handleWheel = useCallback((e: WheelEvent) => {
    const target = e.target as HTMLElement;
    const isScrollableElement = 
      target.classList.contains('overflow-y-auto') ||
      target.classList.contains('overflow-auto') ||
      target.closest('.overflow-y-auto') ||
      target.closest('.overflow-auto');

    if (isScrollableElement) return;

    e.preventDefault();
    
    if (e.ctrlKey) {
      const zoomIntensity = 0.1;
      const delta = -e.deltaY * zoomIntensity * 0.01;
      const newScale = Math.min(2, Math.max(0.3, scale * (1 + delta)));
      
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const worldX = (mouseX - position.x) / scale;
        const worldY = (mouseY - position.y) / scale;
        
        setScale(newScale);
        setPosition({
          x: mouseX - worldX * newScale,
          y: mouseY - worldY * newScale
        });
      }
    } else {
      setPosition(prev => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY
      }));
    }
  }, [scale, position]);

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 2) return;
    if (e.button === 1 || (e.button === 0 && isSpacePressed)) {
      setIsPanning(true);
      return;
    }
  };

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      setCursorPosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }

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

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      const rect = canvasRef.current!.getBoundingClientRect();
      const x = (e.clientX - rect.left - position.x) / scale;
      const y = (e.clientY - rect.top - position.y) / scale;
      onGroupCreate({ x, y });
      toast.success("Group created with double-click");
    }
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      clickCountRef.current++;
      
      if (clickCountRef.current === 1) {
        clickTimeoutRef.current = setTimeout(() => {
          setSelectedGroups(new Set());
          clickCountRef.current = 0;
        }, 300);
      } else if (clickCountRef.current === 2) {
        if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
        const rect = canvasRef.current!.getBoundingClientRect();
        const x = (e.clientX - rect.left - position.x) / scale;
        const y = (e.clientY - rect.top - position.y) / scale;
        onGroupCreate({ x, y });
        toast.success("Group created with double-click");
        clickCountRef.current = 0;
      }
    } else {
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
      clickCountRef.current = 0;
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  // ==================== EFFETS ====================
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('wheel', handleWheel, { passive: false });
      return () => canvas.removeEventListener('wheel', handleWheel);
    }
  }, [handleWheel]);

  useEffect(() => {
    const handleFocusChange = () => {
      const activeElement = document.activeElement;
      const isInput = 
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        (activeElement instanceof HTMLElement && activeElement.isContentEditable);
      
      setIsInputFocused(isInput);
    };

    document.addEventListener('focusin', handleFocusChange);
    document.addEventListener('focusout', handleFocusChange);
    
    return () => {
      document.removeEventListener('focusin', handleFocusChange);
      document.removeEventListener('focusout', handleFocusChange);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isInputFocused) {
        e.preventDefault();
        setIsSpacePressed(true);
        if (canvasRef.current) canvasRef.current.style.cursor = 'grab';
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isInputFocused) {
        setIsSpacePressed(false);
        if (canvasRef.current) canvasRef.current.style.cursor = 'default';
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [isInputFocused]);

  useEffect(() => {
    if (canvasRef.current) {
      if (isSpacePressed && !isInputFocused) {
        canvasRef.current.style.cursor = isPanning ? 'grabbing' : 'grab';
      } else {
        canvasRef.current.style.cursor = isPanning ? 'grabbing' : 'default';
      }
    }
  }, [isSpacePressed, isPanning, isInputFocused]);

  useEffect(() => {
    setOptimisticPositions(new Map());
  }, [groups]);

  useEffect(() => {
    setRenderKey(prev => prev + 1);
  }, [optimisticPositions]);

  useEffect(() => {
    if (pendingParentGroup && Date.now() - pendingParentGroup.createdAt > 10000) {
      console.warn('⏰ Timeout - pending group creation took too long');
      setPendingParentGroup(null);
      toast.error('Group creation timeout');
    }
  }, [pendingParentGroup]);

  useEffect(() => {
    if (showThemeDiscovery && groups.length >= 2) {
      const hasNewGroups = groups.some(group => 
        !themeAnalysis?.themes.some(theme => theme.groupIds.includes(group.id))
      );
      
      if (hasNewGroups || !themeAnalysis) {
        const timer = setTimeout(() => {
          console.log('🔄 Groups changed significantly, auto-analyzing themes...');
          handleAnalyzeThemes();
        }, 1500);
        
        return () => clearTimeout(timer);
      }
    }
  }, [groups, showThemeDiscovery, themeAnalysis, handleAnalyzeThemes]);

  useEffect(() => {
    if (detectedThemes.length > 0 && !selectedTheme) {
      setSelectedTheme(detectedThemes[0]);
      console.log('🎯 Auto-selected first theme:', detectedThemes[0].name);
    }
  }, [detectedThemes, selectedTheme]);

  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
    };
  }, []);

  // ==================== HOOKS PERSONNALISÉS ====================
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
          selectedGroups.forEach(groupId => onGroupDelete?.(groupId));
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
    onArrowMove: handleArrowKeys,
    onUndo: handleUndo,
    onRedo: handleRedo,
    onToggleVotingPanel: toggleVotingPanel,
    onToggleAnalyticsPanel: toggleAnalyticsPanel,
    selectedGroups,
  });

  useNewGroupDetection(groups, (newGroupId, pendingData) => {
    console.log('🎯 Processing new group:', {
      newGroupId,
      pendingTitle: pendingData.groupTitle,
      insightsToAdd: pendingData.insightIds.length,
      childrenToDelete: pendingData.childGroupIds?.length || 0
    });
    
    pendingData.insightIds.forEach((insightId, index) => {
      setTimeout(() => onInsightDrop(insightId, newGroupId), 100 * index);
    });
    
    if (onGroupTitleUpdate) {
      setTimeout(() => {
        onGroupTitleUpdate(newGroupId, pendingData.groupTitle);
        
        if (pendingData.childGroupIds && pendingData.childGroupIds.length > 0) {
          setTimeout(() => {
            console.log('🗑️ Deleting child groups:', pendingData.childGroupIds);
            pendingData.childGroupIds?.forEach(childGroupId => onGroupDelete?.(childGroupId));
            toast.success(`✅ Created "${pendingData.groupTitle}" + cleaned ${pendingData.childGroupIds?.length} groups`);
          }, 1500);
        } else {
          toast.success(`✅ Created "${pendingData.groupTitle}"`);
        }
        
        setPendingParentGroup(null);
      }, 500);
    }
  });

  // ==================== DEBUG ====================
  console.log('🔍 AffinityCanvas render - detectedThemes:', detectedThemes.length);

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
            
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setActivePanel(activePanel === 'voting' ? null : 'voting')}
                variant={activePanel === 'voting' ? "default" : "outline"}
                size="sm"
              >
                <Vote size={16} />
                Voting
              </Button>
              
              <Button
                onClick={() => setActivePanel(activePanel === 'analytics' ? null : 'analytics')}
                variant={activePanel === 'analytics' ? "default" : "outline"}
                size="sm"
              >
                <BarChart3 size={16} />
                Analytics
              </Button>
            </div>


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

            {/* INDICATEUR ACTION EN COURS */}
            {applyingAction && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg z-50 flex items-center gap-2"
              >
                <Sparkles size={14} />
                <span>Applying {applyingAction}...</span>
              </motion.div>
            )}

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
            {/* GARDER SEULEMENT CE BOUTON AMÉLIORÉ : */}
            <Button
              onClick={() => {
                if (showThemeDiscovery) {
                  // Panel déjà ouvert - on le ferme
                  setShowThemeDiscovery(false);
                  clearThemes(); // 🆕 Optionnel: nettoyer l'analyse
                } else {
                  // Ouvrir le panel
                  setShowThemeDiscovery(true);
                  // Analyser seulement si on a des groupes et pas d'analyse récente
                  if (groups.length >= 2 && !themeAnalysis) {
                    setTimeout(() => handleAnalyzeThemes(), 300);
                  }
                }
              }}
              variant={showThemeDiscovery ? "default" : "outline"}
              size="sm"
              disabled={groups.length < 2} // 🆕 Désactivé si pas assez de groupes
              title={groups.length < 2 ? "Need at least 2 groups for theme analysis" : "Discover themes and patterns"}
            >
              <Sparkles size={16} className="mr-2" />
              {isThemesAnalyzing ? "Analyzing..." : "Themes"}
              {themeAnalysis && !isThemesAnalyzing && (
                <Badge variant="secondary" className="ml-2 bg-green-100 text-green-800">
                  {themeAnalysis.themes.length}
                </Badge>
              )}
            </Button>
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
        <InsightsOrganizationPanel
          groups={groups}
          insights={insights}
          projectInfo={projectInfo} // 🎯 PASSER LES INFOS
          onGroupCreate={onGroupCreate}
          onInsightDrop={onInsightDrop}
          onManualInsightCreate={onManualInsightCreate}
          onGroupTitleUpdate={onGroupTitleUpdate} // 🆕 AJOUTER SI DISPONIBLE
        />

        {/* CANVAS PRINCIPAL */}
        <div className="flex-1 relative overflow-hidden bg-linear-to-br from-gray-50 to-gray-100">
           {/* 🧪 BOUTON TEST TEMPORAIRE */}
        <Button
          onClick={() => {
            if (groups.length > 0) {
              const firstGroupId = groups[0].id;
              setHighlightedGroups(new Set([firstGroupId]));
              setTimeout(() => setHighlightedGroups(new Set()), 2000);
              toast.info("Test highlight activated");
            }
          }}
          variant="outline"
          size="sm"
          className="absolute top-4 left-4 z-50"
        >
          🧪 Test Highlight
        </Button>
          
          {/* 🎯 COUCHE 1: THÈMES (EN ARRIÈRE-PLAN) */}
          {detectedThemes.length > 0 && (
            <ThemeVisualizationFixed
              groups={groups}
              themes={detectedThemes}
              selectedTheme={selectedTheme}
              canvasPosition={position}
              canvasScale={scale}
            />
          )}

          {/* 🎯 COUCHE 2: CANVAS INTERACTIF (GROUPE + DRAG) */}
          <div
            ref={canvasRef}
            className="absolute inset-0 cursor-default z-20" // 🆕 z-20 pour interactivité
            style={{ 
              cursor: isSpacePressed ? 'grab' : (isPanning ? 'grabbing' : 'default')
            }}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
            onDoubleClick={handleDoubleClick}
            onContextMenu={handleContextMenu}
            onClick={handleCanvasClick}
          >
            
            {/* CANVAS CONTENT */}
            <div
              key={renderKey}
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
                {groups.map((group) => {
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
                      isHighlighted={highlightedGroups.has(group.id)} // 🆕 PROP AJOUTÉE
                      onMove={handleGroupMoveOptimistic}
                      onDelete={onGroupDelete}
                      onTitleUpdate={onGroupTitleUpdate}
                      onRemoveInsight={onInsightRemoveFromGroup}
                      projectContext={projectInfo ? `PROJECT: ${projectInfo.name}` : undefined}
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
                  );
                })}
                
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

          {/* 🎯 COUCHE 3: INDICATEURS UI (PAR-DESSUS TOUT) */}
          
          {/* Indicateur mouvement clavier */}
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

          {/* Indicateur espace */}
          {isSpacePressed && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg z-50">
              🖱️ Space + Drag to pan
            </div>
          )}

          {/* 🆕 INDICATEUR ACTION EN COURS */}
          {applyingAction && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg z-50 flex items-center gap-2"
            >
              <Sparkles size={14} />
              <span>Applying {applyingAction}...</span>
            </motion.div>
          )}

          {/* ZOOM CONTROLS */}
          <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-2 flex gap-1 z-30">
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
            {showThemeDiscovery && (
              <motion.div
                initial={{ x: 600, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 600, opacity: 0 }}
                className="w-80 bg-white border-l border-gray-200 flex flex-col shrink-0 z-30 h-full"
              >
            <ThemeDiscoveryPanel
              groups={groups}
              insights={insights}
              projectContext={projectInfo ? `PROJECT: ${projectInfo.name}` : undefined}
              onThemeSelect={setSelectedTheme}
              onApplyRecommendation={handleApplyRecommendation}
              onGroupsMerge={handleGroupsMerge}
            />
              </motion.div>
            )}
          {activePanel === 'analytics' && (
            <motion.div
              initial={{ x: 600, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 600, opacity: 0 }}
              className="w-[600px] bg-white border-l border-gray-200 flex flex-col shrink-0 z-30 h-full"
            >
              <AnalyticsDashboard 
                groups={groups}
                insights={insights}
                projectName={`Project: ${projectName?.name}`}
                onClose={() => setActivePanel(null)}
              />
            </motion.div>
          )}
          
          {activePanel === 'voting' && (
            <motion.div
              initial={{ x: 600, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 600, opacity: 0 }}
              className="w-80 bg-white border-l border-gray-200 flex flex-col shrink-0 z-30 h-full"
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