// components/AffinityCanvas.tsx - VERSION COMPLÈTE ET SIMPLIFIÉE
"use client";

import { useRef, useEffect, useState, useCallback, useMemo, use } from "react";
import AffinityGroup from "./AffinityGroup";
import { Plus, Users, Vote, Download, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Undo, Redo, ChevronRight, ChevronLeft, BarChart3, Sparkles, Move, Upload, Presentation, Eye, ActivityIcon } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { ActivePanel, AffinityGroup as AffinityGroupType, DotVotingSession, Insight, WorkspaceMode } from "@/types";
import { toast } from "sonner";
import { useCanvasShortcuts } from "@/hooks/useCanvasShortcuts";
import { useHistory } from "@/hooks/useHistory";
import { DotVotingPanel } from "./DotVotingPanel";
import { Button } from "../ui/button";
import { AnalyticsDashboard } from "./AnalyticsDashboard";
import { UngroupedInsightsPanel } from "./UngroupedInsightsPanel";
import { InsightsOrganizationPanel } from "./InsightsOrganizationPanel";
import { useMutation, useQuery } from "convex/react";
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
import { ExportPanel } from "./ExportPanel";
import { ImportModal } from "./ImportModal";
import { usePresence } from "@/hooks/usePresence";
import { DebugSecondUser } from "./DebugSecondUser";
import { useAuth, useUser } from "@clerk/nextjs";
import { CommentPanel } from "./CommentPanel";
import { useFollowGroupRect } from "@/hooks/useFollowGroupRect";
import { useActivity } from "@/hooks/useActivity";
import { ActivityPanel } from "./ActivityPanel";
import { FloatingToolbar } from "./FloatingToolbar";
import { VotingSessionManager } from "./VotingSessionManager";
import { VotingHistoryPanel } from "./VotingHistoryPanel";
import { PersonaGenerator } from "./PersonaGenerator";



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
  const { userId: currentUserId } = useAuth();

  const projectName = useQuery(api.projects.getById, {projectId: projectId as Id<"projects">});

  // const upsertPresence = useMutation(api.presence.upsert);  

  const activities = useQuery(api.activityLog.getActivityForMap, 
    mapId ? { 
      mapId: mapId as Id<"affinityMaps">,
      limit: 10 
    } : "skip" // ✅ "skip" si affinityMap n'existe pas encore
  );

  // Dans le composant :
// const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
const updatePresence = usePresence(mapId);
const otherUsers = useQuery(api.presence.getByMap, { mapId: mapId as Id<"affinityMaps"> });

useEffect(() => {
  const selections: Record<string, string[]> = {};
  otherUsers?.forEach(user => {
    selections[user.userId] = user.selection || [];
  });
  setSharedSelections(selections);
}, [otherUsers]);

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
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('grouping');
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [isMovingWithArrows, setIsMovingWithArrows] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [showThemeDiscovery, setShowThemeDiscovery] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<DetectedTheme | null>(null);
  const [pendingParentGroup, setPendingParentGroup] = useState<PendingGroupData | null>(null);
  const [applyingAction, setApplyingAction] = useState<string | null>(null);
  const [highlightedGroups, setHighlightedGroups] = useState<Set<string>>(new Set());
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const [optimisticPositions, setOptimisticPositions] = useState<Map<string, {x: number, y: number}>>(new Map());
  const [renderKey, setRenderKey] = useState(0);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [draggedInsightId, setDraggedInsightId] = useState<string | null>(null);
  const [dragSourceGroupId, setDragSourceGroupId] = useState<string | null>(null);
   // 🆕 AJOUTER CES STATES POUR EXPORT/IMPORT
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [sharedSelections, setSharedSelections] = useState<Record<string, string[]>>({});
  const [isPresentMode, setPresentMode] = useState(false);
  // 🎯 AJOUTER UN ÉTAT POUR SUIVRE LA SESSION ACTIVE
  const [activeVotingSession, setActiveVotingSession] = useState<string | null>(null);
  // 🎯 AJOUTER L'ÉTAT
  const [showVotingHistory, setShowVotingHistory] = useState(false);
  // Ajouter dans les états
  const [showPersonaGenerator, setShowPersonaGenerator] = useState(false);

// dans le composant :
const [showComments, setShowComments] = useState<{
  groupId: string;
  screenRect: DOMRect;
  groupTitle: string;
} | null>(null);

  const commentCounts = useQuery(api.comments.getCommentCountsByMap, {
  mapId: mapId as Id<"affinityMaps">,
});





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

    // 🆕 FONCTION POUR SUCCÈS D'IMPORT
  const handleImportSuccess = (newMapId: string) => {
    console.log('✅ Map imported successfully:', newMapId);
    // Optionnel: recharger les données ou naviguer
    toast.success("Map imported successfully!");
  };

// 🆕 AJOUTER CE STATE
const [showActivityPanel, setShowActivityPanel] = useState(false);

// 🆕 INITIALISER LE HOOK
const activity = useActivity();

  // ==================== useCallback ====================

// AffinityCanvas.tsx
const handleOpenComments = useCallback((groupId: string, position: { x: number; y: number }) => {
  const group = groups.find(g => g.id === groupId);
  if (!group) return;
  
  const rect = new DOMRect(position.x, position.y, 0, 0);
  setShowComments({ 
    groupId, 
    screenRect: rect,
    groupTitle: group.title // 🆕 AJOUTER LE TITRE
  });
}, [groups]);


const presenceUsers = useMemo(
  () => otherUsers?.map(u => ({ id: u.userId, name: u.user.name })) ?? [],
  [otherUsers]
);


// hook qui suit le mouvement
const followRect = useFollowGroupRect(showComments?.groupId ?? null, {
  scale,
  position,
});


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



// 🎯 QUAND LA SESSION SE TERMINE
const handleSessionEnd = useCallback(() => {
  console.log('🎯 Session ended - cleaning up state');
  setIsPlacingDot(false); // 🎯 FORCER LA DÉSACTIVATION DU MODE PLACEMENT
  setActiveVotingSession(null); // 🎯 EFFACER LA SESSION ACTIVE
}, []);


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
  const group = groups.find(g => g.id === groupId);
  const oldPosition = group?.position;
  
  // Mise à jour optimiste (existant)
  setOptimisticPositions(prev => {
    const newMap = new Map(prev);
    newMap.set(groupId, newPosition);
    return newMap;
  });
  
  // Appel parent (existant)
  onGroupMove(groupId, newPosition);
  
  // 🆕 LOG ACTIVITÉ (NOUVEAU - mais optionnel, car déjà fait dans AffinityMapWorkspace)
  // On peut le laisser pour du double logging ou le supprimer
  if (group && oldPosition) {
    activity.logGroupMoved(
      mapId as Id<"affinityMaps">,
      groupId,
      group.title,
      oldPosition,
      newPosition
    );
  }
}, [groups, onGroupMove, mapId, activity]);


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

  

  // const toggleVotingPanel = useCallback(() => {
  //   setActivePanel(prev => prev === 'voting' ? null : 'voting');
  // }, []);

  const toggleAnalyticsPanel = useCallback(() => {
    setActivePanel(prev => prev === 'analytics' ? null : 'analytics');
  }, []);

  const togglePersonaPanel = useCallback(() => {
    setActivePanel(prev => prev === 'persona' ? null : 'persona');
  }, []);

  const toggleExportPanel = useCallback(() => {
    setActivePanel(prev => prev === 'export' ? null : 'export');
  }, []);



  const toggleVotingHistoryPanel = useCallback(() => {
    setActivePanel(prev => prev === 'votingHistory' ? null : 'votingHistory');
  }, []);

  const toggleThemeDiscoveryPanel = useCallback(() => {
    setActivePanel(prev => prev === 'themeDiscovery' ? null : 'themeDiscovery');
  }, []);

  const toggleActivityPanel = useCallback(() => {
    setActivePanel(prev => prev === 'activity' ? null : 'activity');
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

  // ===================== DOt VOTING ====================
// 🎯 ÉTATS POUR LE VOTE DIRECT
const [isPlacingDot, setIsPlacingDot] = useState(false);

// 🎯 QUERIES POUR LES SESSIONS ET DOTS
const activeSessions = useQuery(api.dotVoting.getActiveSessions, { 
  mapId: mapId as Id<"affinityMaps"> 
});


const myDots = useQuery(api.dotVoting.getMyDots,
  activeSessions && activeSessions.length > 0 ? { 
    sessionId: activeSessions[0]._id 
  } : "skip"
);

// 🎯 MUTATION POUR PLACER UN DOT
const placeDot = useMutation(api.dotVoting.placeDot);


// 🎯 GESTIONNAIRE POUR PLACER UN DOT SUR LE CANVAS





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
  if (!canvasRef.current) return;

  const rect = canvasRef.current.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  setCursorPosition({ x, y });

  // 🆕 Mise à jour de la présence (curseur + sélection)
  if (updatePresence) {
    const worldX = (x - position.x) / scale;
    const worldY = (y - position.y) / scale;
    updatePresence(worldX, worldY, Array.from(selectedGroups));
  }

  if (isPanning && e.buttons === 1) {
    setPosition(prev => ({
      x: prev.x + e.movementX,
      y: prev.y + e.movementY,
    }));
  }
}, [isPanning, position, scale, selectedGroups, updatePresence]);

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

// 🎯 MODIFIER LE HANDLER DE CLICK EXISTANT
const handleCanvasClick = (e: React.MouseEvent) => {
    console.log('🔴 [START] Canvas click - isPlacingDot:', isPlacingDot, 'target:', e.target);

  // if (isPlacingDot) {
  //   console.log('🟢 [VOTE MODE] Calling handleCanvasClickForDot');
  //   handleCanvasClickForDot(e);
  //   console.log('🟢 [VOTE MODE] Done - returning early');
  //   return;
  // }

  console.log('🔵 [NORMAL MODE] Normal group handling');
  // ... reste du code normal
  console.log('🖱️ Canvas click - target:', e.target, 'isPlacingDot:', isPlacingDot);

  // 🎯 TOUJOURS TRAITER LES DOTS EN PREMIER SI MODE ACTIVÉ
  if (isPlacingDot) {
    console.log('🎯 Handling dot placement first');
    // handleCanvasClickForDot(e);
    
    // 🎯 EN MODE VOTE, ON NE FAIT RIEN D'AUTRE
    return; // 🆕 IMPORTANT : QUITTER IMMÉDIATEMENT
  }

  // 🎯 COMPORTEMENT NORMAL UNIQUEMENT HORS MODE VOTE
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

//!
// 🆕 COMPOSANT AMÉLIORÉ - À AJOUTER DANS AffinityCanvas.tsx

// ==================== NOUVEAU STATE POUR LA PRÉSENTATION ====================
const [presentationState, setPresentationState] = useState<{
  isActive: boolean;
  currentGroupIndex: number;
  isOverview: boolean; // Vue d'ensemble ou focus sur un groupe
}>({
  isActive: false,
  currentGroupIndex: 0,
  isOverview: true
});

const currentGroup = presentationState.isActive && !presentationState.isOverview 
  ? groups[presentationState.currentGroupIndex]
  : null;

// ==================== FONCTIONS DE NAVIGATION ====================
const nextGroup = useCallback(() => {
  if (groups.length === 0) return;
  setPresentationState(prev => ({
    ...prev,
    currentGroupIndex: (prev.currentGroupIndex + 1) % groups.length,
    isOverview: false
  }));
}, [groups.length]);

const prevGroup = useCallback(() => {
  if (groups.length === 0) return;
  setPresentationState(prev => ({
    ...prev,
    currentGroupIndex: (prev.currentGroupIndex - 1 + groups.length) % groups.length,
    isOverview: false
  }));
}, [groups.length]);

const toggleOverview = useCallback(() => {
  setPresentationState(prev => ({
    ...prev,
    isOverview: !prev.isOverview
  }));
}, []);

// ==================== ENTRÉE/SORTIE DU MODE PRÉSENTATION ====================
const enterPresentationMode = useCallback(() => {
  setPresentationState({
    isActive: true,
    currentGroupIndex: 0,
    isOverview: true
  });
  toast.success("Mode présentation activé - Utilisez les flèches pour naviguer");
}, []);

const exitPresentationMode = useCallback(() => {
  setPresentationState({
    isActive: false,
    currentGroupIndex: 0,
    isOverview: true
  });
  toast.info("Mode présentation désactivé");
}, []);

// ==================== RACCOURCI CLAVIER POUR LA PRÉSENTATION ====================
useEffect(() => {
  if (!presentationState.isActive) return;

  const handlePresentationKeys = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      exitPresentationMode();
      return;
    }

    if (!presentationState.isActive) return;

    switch (e.key) {
      case 'ArrowRight':
      case ' ':
        e.preventDefault();
        nextGroup();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        prevGroup();
        break;
      case 'o':
      case 'O':
        e.preventDefault();
        toggleOverview();
        break;
      case 'ArrowDown':
        e.preventDefault();
        setPresentationState(prev => ({ ...prev, isOverview: true }));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setPresentationState(prev => ({ ...prev, isOverview: false }));
        break;
    }
  };

  document.addEventListener('keydown', handlePresentationKeys);
  return () => document.removeEventListener('keydown', handlePresentationKeys);
}, [presentationState.isActive, nextGroup, prevGroup, toggleOverview, exitPresentationMode]);
 
//! end const currentUserId = userId!; // déjà récupéré via useAuth
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


  useEffect(() => {
  const handleEsc = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && isPresentMode) {
      e.preventDefault();
      setPresentMode(false);
    }

    if(e.key === 'v'){
      e.preventDefault();
      setWorkspaceMode('voting');
    }

    if(e.key === 'Escape' && workspaceMode === 'voting' && !isPresentMode){
      e.preventDefault();
      setWorkspaceMode('grouping');
      toast.info("Voting mode disabled");
    }
  };
  document.addEventListener('keydown', handleEsc);
  return () => document.removeEventListener('keydown', handleEsc);
}, [isPresentMode, workspaceMode]);

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
    // onToggleVotingPanel: toggleVotingPanel,
    onToggleAnalyticsPanel: toggleAnalyticsPanel,
    onTogglePersonaPanel: togglePersonaPanel,
    onToggleThemeDiscoveryPanel: toggleThemeDiscoveryPanel,
    onToggleActivityPanel: toggleActivityPanel,
    onToggleExportPanel: toggleExportPanel,
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

  useEffect(() => {
    const handleQuitPanel = (e: KeyboardEvent) => {

      if (e.key === 'Escape' || activePanel) {
        setActivePanel(null);
        return;
      }
        return;
      }

      document.addEventListener('keydown', handleQuitPanel);
      return () => document.removeEventListener('keydown', handleQuitPanel);
    }, [activePanel]);
    
  

  // ==================== DEBUG ====================
  // console.log('🔍 AffinityCanvas render - detectedThemes:', detectedThemes.length);
// const { userId } = useAuth();
//   console.log("🧪 DebugSecondUser monté avec mapId :", mapId);
//   console.log("🧪 NODE_ENV :", process.env.NODE_ENV);
//   console.log("🧪 userId from Clerk :", userId);
  // console.log("🧪 Panel position → x =", showComments!.position.x, "y =", showComments!.position.y);

// {console.log('🔍 Dots Debug:', { 
//   dotsCount: dots?.length,
//   myDotsCount: myDots?.length,
//   activeSession: activeSessions?.[0],
//   isSilentMode: activeSessions?.[0]?.isSilentMode,
//   votingPhase: activeSessions?.[0]?.votingPhase,
//   currentUserId
// })}
  // ==================== RENDER ====================

  return (
    <div className="h-full flex flex-col bg-gray-50">

      {isPresentMode && (
  <div className="fixed top-4 right-4 bg-black/70 text-white px-3 py-1 rounded text-xs">
    Present mode – press ESC to exit
  </div>
)}

{/* VOTING SESSION MANAGER */}
    {!isPresentMode && workspaceMode === 'voting' && (
      <VotingSessionManager
        mapId={mapId}
        projectId={projectId}
        isPlacingDot={isPlacingDot}
        onToggleDotPlacement={() => setIsPlacingDot(!isPlacingDot)}
        onSessionEnd={handleSessionEnd} // 🎯 PASSER LE CALLBACK
      />
    )}

{!isPresentMode && (
    <FloatingToolbar
      // Stats
      stats={stats}
      
      // États
      workspaceMode={workspaceMode}
      setWorkspaceMode={setWorkspaceMode}
      activePanel={activePanel}
      setActivePanel={setActivePanel}
      showThemeDiscovery={showThemeDiscovery}
      setShowThemeDiscovery={setShowThemeDiscovery}
      showExportPanel={showExportPanel}
      setShowExportPanel={setShowExportPanel}
      showImportModal={showImportModal}
      setShowImportModal={setShowImportModal}
      showActivityPanel={showActivityPanel}
      setShowActivityPanel={setShowActivityPanel}
      
      // Actions
      onEnterPresentation={enterPresentationMode}
      onAnalyzeThemes={handleAnalyzeThemes}
      
      // Données
      themeAnalysis={themeAnalysis}
      isThemesAnalyzing={isThemesAnalyzing}
      activities={activities}

      // 🎯 NOUVEAU PROP
      showVotingHistory={showVotingHistory}
      onShowVotingHistory={setShowVotingHistory}

      // 🎯 NOUVEAU PROP
      showPersonaGenerator={showPersonaGenerator}
      onShowPersonaGenerator={setShowPersonaGenerator}
    />
  )}
      {/* HEADER AVEC RACCOURCIS */}

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
        <div 
          className="flex-1 relative overflow-hidden bg-linear-to-br from-gray-50 to-gray-100"
          onDragOver={(e: React.DragEvent) => {
            // 🆕 Permettre le drop sur le canvas
            if (workspaceMode === 'grouping') {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
            }
          }}
          onDrop={(e: React.DragEvent) => {
            // 🆕 Handler pour drop sur le canvas (retirer l'insight du groupe)
            if (workspaceMode === 'grouping') {
              e.preventDefault();
              const insightId = e.dataTransfer.getData('text/plain');
              const sourceGroupId = e.dataTransfer.getData('application/group-id');
              
              console.log('🗑️ Dropping insight on canvas:', { insightId, sourceGroupId });
              
              if (insightId && sourceGroupId) {
                // Sauvegarder avant modification
                saveCurrentState("before_insight_remove", `Removing insight from group`);
                
                // Retirer l'insight du groupe
                onInsightRemoveFromGroup?.(insightId, sourceGroupId);
                toast.info("Insight removed from group and returned to available insights");
              }
              
              setDraggedInsightId(null);
              setDragSourceGroupId(null);
            }
          }}
        >
{!isPresentMode && showComments && (
  <CommentPanel
    mapId={mapId}
    groupId={showComments.groupId}
    groupTitle={showComments.groupTitle} // 🆕 AJOUTER
    projectId={projectId}
    presenceUsers={presenceUsers}
    screenRect={followRect ?? showComments.screenRect}
    onClose={() => setShowComments(null)}
  />
)}


{isPresentMode && (
  <div className="fixed inset-0 z-50 pointer-events-none">
    {/* HEADER MINIMALISTE */}
    <div className="absolute top-0 left-0 right-0 bg-black/80 text-white p-4 flex justify-between items-center">
      <div className="flex items-center gap-4">
        <div className="bg-blue-500 px-3 py-1 rounded-full text-sm font-medium">
          Mode Présentation
        </div>
        <span className="text-sm opacity-80">
          {presentationState.isOverview 
            ? "Vue d'ensemble" 
            : `Groupe ${presentationState.currentGroupIndex + 1}/${groups.length}`
          }
        </span>
        {!presentationState.isOverview && (
          <span className="text-sm font-medium">
            {groups[presentationState.currentGroupIndex]?.title}
          </span>
        )}
      </div>
      
      <div className="flex items-center gap-4">
        {/* INDICATEUR DE NAVIGATION */}
        <div className="flex items-center gap-2 text-sm opacity-80">
          <kbd className="px-2 py-1 bg-white/20 rounded text-xs">←→</kbd>
          <span>Naviguer</span>
          <kbd className="px-2 py-1 bg-white/20 rounded text-xs">Espace</kbd>
          <span>Suivant</span>
          <kbd className="px-2 py-1 bg-white/20 rounded text-xs">ESC</kbd>
          <span>Quitter</span>
        </div>
        
        <Button
          onClick={exitPresentationMode}
          variant="outline"
          size="sm"
          className="bg-white/10 text-white border-white/20 hover:bg-white/20 pointer-events-auto"
        >
          Quitter (ESC)
        </Button>
      </div>
    </div>

    {/* CONTROLS DE NAVIGATION FLOATING */}
    {!presentationState.isOverview && (
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center gap-4 bg-black/70 rounded-full px-6 py-3 pointer-events-auto">
        <Button
          onClick={prevGroup}
          variant="ghost"
          size="sm"
          className="text-white hover:bg-white/20"
        >
          <ChevronLeft size={20} />
        </Button>
        
        <span className="text-white text-sm mx-4">
          {presentationState.currentGroupIndex + 1} / {groups.length}
        </span>
        
        <Button
          onClick={nextGroup}
          variant="ghost"
          size="sm"
          className="text-white hover:bg-white/20"
        >
          <ChevronRight size={20} />
        </Button>
        
        <Button
          onClick={toggleOverview}
          variant="ghost"
          size="sm"
          className="text-white hover:bg-white/20 ml-4"
        >
          <Eye size={16} className="mr-2" />
          Vue d{"'"}ensemble
        </Button>
      </div>
    )}
  </div>
)}
           {/* 🧪 BOUTON TEST TEMPORAIRE */}

{!isPresentMode && isPlacingDot && groups.length > 0 && (
  <Button
    onClick={async () => {
      try {
        const result = await placeDot({
          sessionId: activeSessions![0]._id,
          targetType: 'group',
          targetId: groups[0].id,
          position: { x: 100, y: 100 },
        });
        console.log('🧪 Test placeDot result:', result);
        toast.success("Test dot placed!");
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : error;
        console.error('🧪 Test placeDot error:', errorMessage);
        toast.error("Test failed: " + errorMessage);
      }
    }}
    size="sm"
    variant="outline"
    className="absolute top-20 left-4 z-50"
  >
    🧪 Test Dot on First Group
  </Button>
)}
        {/* <Button
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
        </Button> */}
     
          
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
            {!isPresentMode && otherUsers?.map(user => (
                <motion.div
                  key={user.userId}
                  className="absolute pointer-events-none z-50"
                  style={{
                    left: user.cursor.x * scale + position.x,
                    top: user.cursor.y * scale + position.y,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow" />
                    <span className="text-xs bg-gray-900 text-white px-2 py-1 rounded shadow">
                      {user.user.name}
                    </span>
                  </div>
                </motion.div>
              ))}

              
                          
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

                {groups.map((group, index) => {
                  const isCurrentInPresentation = presentationState.isActive && 
                    !presentationState.isOverview && 
                    index === presentationState.currentGroupIndex;
                  
                  return (
                    <AffinityGroup
                      key={group.id}
                      group={group}
                      activeSessionId={activeSessions?.[0]?._id}
                      insights={insights}
                      scale={scale}
                      isPlacingDot={isPlacingDot && !!activeSessions?.[0]}
                      // 🎯 PROPS OBLIGATOIRES - TOUJOURS FOURNIR DES FONCTIONS, MÊME EN PRÉSENTATION
                      onMove={(groupId, position) => {
                        if (presentationState.isActive) return; // 🚫 Ignorer silencieusement en présentation
                        handleGroupMoveOptimistic(groupId, position);
                      }}
                      
                      onDragOver={(e: React.DragEvent) => {
                        if (presentationState.isActive) {
                          e.preventDefault(); // 🎯 Toujours appeler preventDefault() même en présentation
                          return;
                        }
                        if (workspaceMode === 'grouping') {
                          e.preventDefault();
                          setDragOverGroup(group.id);
                        }
                      }}
                      
                      onDragLeave={() => {
                        if (presentationState.isActive) return; // 🚫 Ignorer silencieusement
                        setDragOverGroup(null);
                      }}
                      
                      onDrop={(e: React.DragEvent) => {
                        if (presentationState.isActive) {
                          e.preventDefault(); // 🎯 Toujours appeler preventDefault() même en présentation
                          return;
                        }
                        if (workspaceMode === 'grouping') {
                          e.preventDefault();
                          const insightId = e.dataTransfer.getData('text/plain');
                          const sourceGroupId = e.dataTransfer.getData('application/group-id');
                          
                          if (insightId) {
                            saveCurrentState("before_insight_add", `Adding insight to group "${group.title}"`);
                            onInsightDrop(insightId, group.id);
                            
                            const message = sourceGroupId 
                              ? `Insight moved to "${group.title}"`
                              : `Insight added to "${group.title}"`;
                            toast.success(message);
                          }
                          setDragOverGroup(null);
                        }
                      }}
                      
                      onSelect={(groupId, e) => {
                        // 🎯 EN MODE PRÉSENTATION: NAVIGATION AU CLICK
                        if (presentationState.isActive) {
                          e.stopPropagation();
                          setPresentationState(prev => ({
                            ...prev,
                            currentGroupIndex: index,
                            isOverview: false
                          }));
                          return;
                        }
                        
                        // 👇 COMPORTEMENT NORMAL HORS PRÉSENTATION
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
                      
                      // 🎯 PROPS CONDITIONNELLES - TOUJOURS DÉFINIES
                      isSelected={presentationState.isActive ? false : selectedGroups.has(group.id)}
                      isDragOver={presentationState.isActive ? false : dragOverGroup === group.id}
                      isHighlighted={isCurrentInPresentation || highlightedGroups.has(group.id)}
                      
                      // 🎯 NOUVELLES PROPS POUR LA PRÉSENTATION
                      isPresentationMode={presentationState.isActive}
                      isFocusedInPresentation={isCurrentInPresentation}
                      presentationScale={1.1}
                      
                      // 🎯 PROPS OPTIONNELLES - AVEC FONCTIONS VIDES SI NON FOURNIES
                      onDelete={onGroupDelete}
                      onTitleUpdate={onGroupTitleUpdate}
                      onRemoveInsight={onInsightRemoveFromGroup}
                      onInsightDragStart={(insightId, sourceGroupId) => {
                        if (!presentationState.isActive) {
                          console.log('🧩 Insight drag started:', { insightId, sourceGroupId });
                          setDraggedInsightId(insightId);
                          setDragSourceGroupId(sourceGroupId);
                        }
                      }}
                      onInsightDrop={(insightId, targetGroupId) => {
                        if (!presentationState.isActive) {
                          console.log('🎯 Insight dropped to new group:', { insightId, targetGroupId });
                          saveCurrentState("before_insight_move", `Moving insight to different group`);
                          onInsightDrop(insightId, targetGroupId);
                          toast.success("Insight moved to new group");
                          setDraggedInsightId(null);
                          setDragSourceGroupId(null);
                        }
                      }}
                      onOpenComments={handleOpenComments}
                      
                      // 🎯 PROPS EXISTANTES
                      workspaceMode={workspaceMode}
                      projectContext={projectInfo ? `PROJECT: ${projectInfo.name}` : undefined}
                      sharedSelections={sharedSelections}
                      currentUserId={currentUserId!}
                      mapId={mapId}
                      commentCounts={commentCounts}
                      activeSession={activeSessions?.[0]}
                      // comments={comments}
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

             {/* {process.env.NODE_ENV === "development" && (
                <DebugSecondUser mapId={mapId} />
              )} */}
          </div>

          {/* 🎯 COUCHE 3: INDICATEURS UI (PAR-DESSUS TOUT) */}
        {isPlacingDot && (
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg z-50">
            🎯 Click on groups or insights to place dots
          </div>
        )}

          {isPlacingDot && (
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg z-50 flex items-center gap-2">
            <div className="w-3 h-3 bg-white rounded-full animate-ping" />
            <span>Click on groups or insights to place dots</span>
            <div className="w-3 h-3 bg-white rounded-full animate-ping" />
          </div>
          )}
          
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

          
            {!isPresentMode && activePanel === 'themeDiscovery' && (
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
          {!isPresentMode && activePanel === 'analytics' && (
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

          {!isPresentMode && activePanel === 'persona' && (
            <motion.div
            initial={{ x: 600, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 600, opacity: 0 }}
            className="w-[800px] bg-white border-l border-gray-200 flex flex-col shrink-0 z-30 h-full"
          >
            <PersonaGenerator
              projectId={projectId}
              mapId={mapId}
              groups={groups}
              insights={insights}
              projectContext={projectInfo ? `PROJECT: ${projectInfo.name}` : undefined}
            />
          </motion.div>
          )}
          {!isPresentMode && activePanel === 'activity' && (
             <motion.div
              initial={{ x: 600, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 600, opacity: 0 }}
              className="w-80 bg-white border-l border-gray-200 flex flex-col shrink-0 z-30 h-full"
            >
              <ActivityPanel
                mapId={mapId as Id<"affinityMaps">}
                isOpen={activePanel === 'activity'}
                onClose={() => setActivePanel(null)}
              />
            </motion.div>
          )}
          {!isPresentMode && activePanel === 'votingHistory' && (
              <motion.div
              initial={{ x: 600, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 600, opacity: 0 }}
              className="w-80 bg-white border-l border-gray-200 flex flex-col shrink-0 z-30 h-full"
            >
              <VotingHistoryPanel 
                projectId={projectId}
                mapId={mapId}
                groups={groups}
              />
            </motion.div>
          )}
          {!isPresentMode && activePanel === 'export' && (
              <motion.div
              initial={{ x: 600, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 600, opacity: 0 }}
              className="w-80 bg-white border-l border-gray-200 flex flex-col shrink-0 z-30 h-full"
            >
              <ExportPanel
                mapId={mapId}
                projectId={projectId}
                onClose={() => setActivePanel(null)}
              />
            </motion.div>
          )}
          
        </AnimatePresence>



                         


      </div>


  

   {/* 🆕 AJOUTER LE MODAL D'IMPORT ICI */}
    <ImportModal
      open={showImportModal}
      onOpenChange={setShowImportModal}
      projectId={projectId}
      onImportSuccess={handleImportSuccess}
    />
    </div>
  );
}