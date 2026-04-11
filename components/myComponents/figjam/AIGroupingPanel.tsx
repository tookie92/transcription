"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Sparkles, 
  Loader2, 
  Plus, 
  Layers,
  X,
  ChevronRight,
  Lightbulb,
  Check,
  RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import type { StickyNoteData, ClusterLabelData } from "@/types/figjam";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface GroupingSuggestion {
  id: string;
  action: "create_new" | "add_to_existing";
  confidence: number;
  reason: string;
  insightIds: string[];
  newGroupTitle?: string;
  newGroupDescription?: string;
  cachedAt?: number;
  isApplied?: boolean;
  isDismissed?: boolean;
}

interface AIGroupingPanelProps {
  isOpen: boolean;
  onClose: () => void;
  ungroupedStickies: StickyNoteData[];
  existingClusters: ClusterLabelData[];
  projectContext?: string;
  onCreateCluster: (stickyIds: string[], title: string, position: { x: number; y: number }) => void;
  onNeedConsent?: () => void;
  mapId: string;
  userId: string;
}

const INSIGHT_TYPE_COLORS: Record<string, string> = {
  pain: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  quote: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  insight: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  follow: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
};

// Cache duration: 5 minutes
const CACHE_DURATION = 5 * 60 * 1000;

export function AIGroupingPanel({
  isOpen,
  onClose,
  ungroupedStickies,
  existingClusters,
  projectContext,
  onCreateCluster,
  onNeedConsent,
  mapId,
  userId,
}: AIGroupingPanelProps) {
  const [suggestions, setSuggestions] = useState<GroupingSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<number>>(new Set());
  const [lastStickyIds, setLastStickyIds] = useState<string[]>([]);
  const [fromCache, setFromCache] = useState(false);
  const cachedSuggestionsRef = useRef<GroupingSuggestion[]>([]);
  const lastFetchTimeRef = useRef<number>(0);

  // Credits & GDPR
  const userCredits = useQuery(api.credits.getUserCredits);
  const userConsent = useQuery(api.credits.getConsent);
  const deductCredits = useMutation(api.credits.deductCredits);
  const initializeCredits = useMutation(api.credits.initializeCredits);

  // Shared cache - Convex queries
  const sharedSuggestions = useQuery(
    api.affinityMaps.getAISuggestions,
    mapId ? { mapId: mapId as Id<"affinityMaps"> } : "skip"
  );
  const saveAISuggestions = useMutation(api.affinityMaps.saveAISuggestions);
  const markApplied = useMutation(api.affinityMaps.markSuggestionApplied);
  const markDismissed = useMutation(api.affinityMaps.markSuggestionDismissed);
  const clearSuggestions = useMutation(api.affinityMaps.clearAISuggestions);

  // Sync shared suggestions to local state
  useEffect(() => {
    if (sharedSuggestions && sharedSuggestions.length > 0) {
      const mapped: GroupingSuggestion[] = sharedSuggestions.map(s => ({
        id: s.id,
        action: s.action,
        confidence: s.confidence,
        reason: s.reason,
        insightIds: s.insightIds,
        newGroupTitle: s.newGroupTitle,
        newGroupDescription: s.newGroupDescription,
        isApplied: s.isApplied,
        isDismissed: s.isDismissed,
      }));
      cachedSuggestionsRef.current = mapped;
      setSuggestions(mapped);
      setFromCache(true);
      lastFetchTimeRef.current = Date.now();
    }
  }, [sharedSuggestions]);

  // Filter out applied and dismissed suggestions
  const visibleSuggestions = suggestions.filter(s => !s.isApplied && !s.isDismissed);
  const hasValidCache = suggestions.length > 0 && !fromCache;

  const checkCredits = async () => {
    // Check GDPR consent first
    if (!userConsent) {
      onNeedConsent?.();
      return false;
    }

    try {
      await initializeCredits({});
    } catch {
      // Ignore init errors
    }

    const creditsData = userCredits || { credits: 150, costs: { transcription: 20, aiGrouping: 10, aiRename: 5 } };
    
    if (creditsData.credits < creditsData.costs.aiGrouping) {
      toast.error(`Not enough credits for AI grouping. You need ${creditsData.costs.aiGrouping} credits but have ${creditsData.credits}.`);
      return false;
    }

    try {
      await deductCredits({ operation: "aiGrouping" });
      return true;
    } catch (e) {
      toast.error(`Not enough credits for AI grouping.`);
      return false;
    }
  };

  const toggleSuggestion = (index: number) => {
    setSelectedSuggestions((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const dismissSuggestion = (index: number) => {
    const suggestionToDismiss = visibleSuggestions[index];
    if (!suggestionToDismiss || !mapId) return;

    markDismissed({ 
      mapId: mapId as Id<"affinityMaps">, 
      suggestionId: suggestionToDismiss.id 
    });

    setSuggestions(prev => {
      const updated = prev.map(s => 
        s.id === suggestionToDismiss.id ? { ...s, isDismissed: true } : s
      );
      cachedSuggestionsRef.current = updated;
      return updated;
    });
    toast.info("Suggestion dismissed");
  };

  // Auto-load shared cache when panel opens
  useEffect(() => {
    if (isOpen && sharedSuggestions && sharedSuggestions.length > 0) {
      const mapped: GroupingSuggestion[] = sharedSuggestions.map(s => ({
        id: s.id,
        action: s.action,
        confidence: s.confidence,
        reason: s.reason,
        insightIds: s.insightIds,
        newGroupTitle: s.newGroupTitle,
        newGroupDescription: s.newGroupDescription,
        isApplied: s.isApplied,
        isDismissed: s.isDismissed,
      }));
      cachedSuggestionsRef.current = mapped;
      setSuggestions(mapped);
      setFromCache(true);
      lastFetchTimeRef.current = Date.now();
    }
  }, [isOpen, sharedSuggestions]);

  // Get stickies NOT covered by any existing suggestion
  const getUncoveredStickies = (): StickyNoteData[] => {
    const coveredIds = new Set<string>();
    
    for (const sugg of suggestions) {
      if (!sugg.isApplied && !sugg.isDismissed) {
        for (const id of sugg.insightIds) {
          coveredIds.add(id);
        }
      }
    }
    
    return ungroupedStickies.filter(s => !coveredIds.has(s.id));
  };

  const fetchSuggestions = async (forceRefresh = false) => {
    // Check if we already have suggestions (from shared cache or previous fetch)
    const existingVisible = suggestions.filter(s => !s.isApplied && !s.isDismissed);
    
    // If not forcing refresh and we have existing suggestions, just use them
    if (!forceRefresh && existingVisible.length > 0) {
      setFromCache(true);
      setSelectedSuggestions(new Set());
      toast.success(`Using ${existingVisible.length} existing suggestion(s)`);
      return;
    }

    // Check credits before making API call
    const hasCredits = await checkCredits();
    if (!hasCredits) return;

    // Get stickies that need suggestions
    const uncoveredStickies = getUncoveredStickies();
    
    if (uncoveredStickies.length === 0 && forceRefresh) {
      toast.info("All stickies are covered by suggestions");
      return;
    }

    setIsLoading(true);
    setFromCache(false);
    setSelectedSuggestions(new Set());

    try {
      const response = await fetch("/api/suggest-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          insights: uncoveredStickies.map((s) => ({
            id: s.id,
            text: s.content,
            type: s.color,
          })),
          existingGroups: existingClusters.map((c) => ({
            id: c.id,
            title: c.text,
            insightIds: [],
          })),
          projectContext,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch suggestions");
      }

      const data = await response.json();
      const newSuggestions: GroupingSuggestion[] = (data.suggestions || []).map((s: GroupingSuggestion, idx: number) => ({
        ...s,
        id: `suggestion-${Date.now()}-${idx}`,
        cachedAt: Date.now(),
        isApplied: false,
        isDismissed: false,
      }));
      
      if (newSuggestions.length > 0 && mapId) {
        await saveAISuggestions({
          mapId: mapId as Id<"affinityMaps">,
          userId: userId,
          suggestions: newSuggestions.map(s => ({
            suggestionId: s.id,
            action: s.action,
            confidence: s.confidence,
            reason: s.reason,
            insightIds: s.insightIds,
            newGroupTitle: s.newGroupTitle,
            newGroupDescription: s.newGroupDescription,
          })),
        });
      }

      // Add new suggestions to local state
      const allSuggestions = [...suggestions, ...newSuggestions];
      cachedSuggestionsRef.current = allSuggestions;
      lastFetchTimeRef.current = Date.now();
      setSuggestions(allSuggestions);
      setLastStickyIds(ungroupedStickies.map(s => s.id));

      if (!newSuggestions.length) {
        toast.info("No new groupings could be suggested");
      } else {
        toast.success(`Generated ${newSuggestions.length} new suggestion(s)`);
      }
    } catch {
      toast.error("Failed to generate groupings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateClusters = () => {
    if (selectedSuggestions.size === 0) {
      toast.info("Select suggestions to create clusters");
      return;
    }

    // Track which stickies have already been assigned to avoid duplicates
    const assignedStickyIds = new Set<string>();

    // Mark selected suggestions as applied
    setSuggestions(prev => {
      const updated = prev.map(s => ({ ...s }));
      let selectedCount = 0;
      for (let i = 0; i < updated.length; i++) {
        if (!updated[i].isApplied && !updated[i].isDismissed) {
          if (selectedSuggestions.has(selectedCount)) {
            updated[i] = { ...updated[i], isApplied: true };
          }
          selectedCount++;
        }
      }
      cachedSuggestionsRef.current = updated;
      return updated;
    });

    const selectedList = Array.from(selectedSuggestions).map((i) => suggestions[i]);

    // Calculate bounds of ungrouped stickies
    if (ungroupedStickies.length === 0) {
      toast.error("No stickies to group");
      return;
    }

    // Calculate center of ungrouped stickies
    const stickyCenters = ungroupedStickies.map(s => ({
      x: s.position.x + 100,
      y: s.position.y + 100
    }));

    const avgX = stickyCenters.reduce((sum, c) => sum + c.x, 0) / stickyCenters.length;
    const avgY = stickyCenters.reduce((sum, c) => sum + c.y, 0) / stickyCenters.length;

    const CLUSTER_LABEL_OFFSET_Y = -150;
    const SPACING_X = 450;
    const SPACING_Y = 500;
    const CLUSTER_WIDTH = 400;
    const CLUSTER_HEIGHT = 300;

    // Find a non-overlapping position for clusters
    const findEmptySpot = (startX: number, startY: number): { x: number; y: number } => {
      const existingBounds = existingClusters.map(c => ({
        x: c.position.x,
        y: c.position.y,
        width: c.width || CLUSTER_WIDTH,
        height: c.height || CLUSTER_HEIGHT
      }));

      let bestX = startX;
      let bestY = startY;
      let found = false;
      const maxAttempts = 20;

      for (let attempt = 0; attempt < maxAttempts && !found; attempt++) {
        found = true;
        for (const bounds of existingBounds) {
          const overlap = !(
            bestX + CLUSTER_WIDTH < bounds.x - 50 ||
            bestX > bounds.x + bounds.width + 50 ||
            bestY + CLUSTER_HEIGHT < bounds.y - 50 ||
            bestY > bounds.y + bounds.height + 50
          );
          if (overlap) {
            found = false;
            // Move to the right and down
            bestX += SPACING_X;
            bestY += SPACING_Y * 0.3;
            if (bestX > window.innerWidth - 500) {
              bestX = 100;
              bestY += SPACING_Y;
            }
            break;
          }
        }
      }

      return { x: bestX, y: bestY };
    };

    const baseClusterX = avgX - (selectedList.length * SPACING_X) / 2;
    const baseClusterY = avgY + CLUSTER_LABEL_OFFSET_Y;

    // Mark all selected suggestions as applied in Convex
    selectedList.forEach((suggestion) => {
      if (mapId) {
        markApplied({ 
          mapId: mapId as Id<"affinityMaps">, 
          suggestionId: suggestion.id,
          userId: userId 
        });
      }
    });

    selectedList.forEach((suggestion, index) => {
      // Filter out already assigned stickies to avoid conflicts
      const uniqueInsightIds = suggestion.insightIds.filter(id => !assignedStickyIds.has(id));

      // Mark these stickies as assigned
      uniqueInsightIds.forEach(id => assignedStickyIds.add(id));

      if (uniqueInsightIds.length === 0) {
        console.log(`[AI GROUPING] Skipping suggestion ${index} - all stickies already assigned`);
        return;
      }

      const COLS_PER_ROW = Math.min(3, selectedList.length);
      const col = index % COLS_PER_ROW;
      const row = Math.floor(index / COLS_PER_ROW);

      const targetX = baseClusterX + col * SPACING_X;
      const targetY = baseClusterY - row * SPACING_Y;
      const clusterPosition = findEmptySpot(targetX, targetY);

      console.log(`[AI GROUPING] Creating cluster ${index}:`, {
        title: suggestion.newGroupTitle || "New Cluster",
        stickies: uniqueInsightIds.length,
        assignedCount: assignedStickyIds.size
      });

      onCreateCluster(
        uniqueInsightIds,
        suggestion.newGroupTitle || "New Cluster",
        clusterPosition
      );
    });

    console.log(`[AI GROUPING] Total stickies assigned: ${assignedStickyIds.size}`);

    // Clear selection
    setSelectedSuggestions(new Set());

    const remaining = visibleSuggestions.length - selectedList.length;
    if (remaining === 0) {
      toast.success(`Created ${selectedList.length} cluster(s). All done!`);
      onClose();
    } else {
      toast.success(`Created ${selectedList.length} cluster(s). ${remaining} remaining.`);
    }

    console.log(`[AI GROUPING] Completed - created ${selectedList.length} clusters, remaining: ${remaining}`);
  };

  // Get confidence color
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "bg-green-500";
    if (confidence >= 0.6) return "bg-yellow-500";
    return "bg-gray-400";
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return "High confidence";
    if (confidence >= 0.6) return "Medium confidence";
    return "Low confidence";
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      className="fixed right-0 top-0 bottom-0 w-80 bg-card border-l border-border shadow-xl z-50 flex flex-col"
    >
      {/* Header */}
      <div className="p-4 border-b border-border shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-violet-500" />
            <h3 className="font-semibold text-foreground">AI Grouping</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <ChevronRight size={16} />
          </Button>
        </div>
        
        {/* Stats */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Layers size={14} />
          <span>{ungroupedStickies.length} ungrouped stickies</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {ungroupedStickies.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
              <Check size={20} className="text-green-600 dark:text-green-400" />
            </div>
            <p className="text-sm font-medium text-foreground">All organized!</p>
            <p className="text-xs text-muted-foreground mt-1">
              All stickies are grouped
            </p>
          </div>
        ) : visibleSuggestions.length === 0 && suggestions.length > 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-violet-100 dark:bg-violet-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
              <Sparkles size={20} className="text-violet-600 dark:text-violet-400" />
            </div>
            <p className="text-sm font-medium text-foreground">No more suggestions</p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">
              You've used or dismissed all suggestions
            </p>
            <Button variant="outline" onClick={() => fetchSuggestions(true)}>
              <RefreshCw size={14} className="mr-2" />
              Generate New Suggestions
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Ungrouped Preview */}
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-2">Ungrouped stickies</p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {ungroupedStickies.slice(0, 5).map((sticky) => (
                  <div
                    key={sticky.id}
                    className="flex items-start gap-2 text-xs"
                  >
                    <Badge
                      variant="secondary"
                      className={`shrink-0 text-[10px] px-1.5 py-0 ${
                        INSIGHT_TYPE_COLORS[sticky.color] || "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {sticky.color}
                    </Badge>
                    <span className="text-muted-foreground line-clamp-1">
                      {sticky.content}
                    </span>
                  </div>
                ))}
                {ungroupedStickies.length > 5 && (
                  <p className="text-xs text-muted-foreground pt-1">
                    +{ungroupedStickies.length - 5} more...
                  </p>
                )}
              </div>
            </div>

            {/* Generate Button */}
            {!suggestions.length && !isLoading && (
              <Button onClick={() => fetchSuggestions()} className="w-full" disabled={ungroupedStickies.length < 2}>
                <Sparkles size={16} className="mr-2" />
                Generate Groupings
              </Button>
            )}

            {ungroupedStickies.length < 2 && (
              <p className="text-xs text-muted-foreground text-center">
                Need at least 2 ungrouped stickies to suggest groupings
              </p>
            )}

            {/* Loading */}
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={24} className="animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">
                  Analyzing patterns...
                </span>
              </div>
            )}

            {/* Suggestions */}
            {visibleSuggestions.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {visibleSuggestions.length} suggestion{visibleSuggestions.length !== 1 ? "s" : ""}
                    </p>
                    {fromCache && (
                      <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                        Cached
                      </Badge>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => fetchSuggestions(true)}>
                    <RefreshCw size={14} className="mr-1" />
                    Refresh
                  </Button>
                </div>

                <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                  {visibleSuggestions.map((suggestion, index) => {
                    const isSelected = selectedSuggestions.has(index);
                    const stickiesInSuggestion = ungroupedStickies.filter((s) =>
                      suggestion.insightIds.includes(s.id)
                    );

                    return (
                      <motion.div
                        key={suggestion.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`group relative p-3 rounded-lg border transition-all ${
                          isSelected
                            ? "border-primary bg-primary/5 shadow-md"
                            : "border-border hover:border-primary/50 hover:bg-muted/30"
                        }`}
                      >
                        {/* Dismiss button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            dismissSuggestion(index);
                          }}
                          className="absolute top-2 right-2 w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-muted transition-all"
                        >
                          <X size={12} className="text-muted-foreground" />
                        </button>

                        <button
                          onClick={() => toggleSuggestion(index)}
                          className="w-full text-left"
                        >
                          <div className="flex items-start justify-between gap-2 mb-2 pr-6">
                            <p className="font-medium text-sm text-foreground line-clamp-1">
                              {suggestion.newGroupTitle || "New Group"}
                            </p>
                          </div>

                          {/* Confidence indicator */}
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${suggestion.confidence * 100}%` }}
                                transition={{ duration: 0.5, delay: index * 0.05 }}
                                className={`h-full ${getConfidenceColor(suggestion.confidence)}`}
                              />
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Badge 
                                variant="secondary" 
                                className={`text-xs ${
                                  suggestion.confidence >= 0.8 
                                    ? "bg-green-100 text-green-700" 
                                    : suggestion.confidence >= 0.6 
                                      ? "bg-yellow-100 text-yellow-700"
                                      : "bg-gray-100 text-gray-600"
                                }`}
                              >
                                {Math.round(suggestion.confidence * 100)}%
                              </Badge>
                            </div>
                          </div>
                          
                          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                            {suggestion.reason}
                          </p>

                          {/* Preview of stickies in this group */}
                          <div className="flex flex-wrap gap-1">
                            {stickiesInSuggestion.slice(0, 3).map((sticky) => (
                              <span
                                key={sticky.id}
                                className="text-[10px] px-1.5 py-0.5 bg-muted rounded truncate max-w-[100px]"
                              >
                                {sticky.content.slice(0, 20)}...
                              </span>
                            ))}
                            {stickiesInSuggestion.length > 3 && (
                              <span className="text-[10px] px-1.5 py-0.5 text-muted-foreground">
                                +{stickiesInSuggestion.length - 3}
                              </span>
                            )}
                          </div>

                          {/* Selection indicator */}
                          <div className={`mt-3 flex items-center gap-2 text-xs ${
                            isSelected ? "text-primary" : "text-muted-foreground"
                          }`}>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                              isSelected
                                ? "bg-primary border-primary"
                                : "border-muted-foreground"
                            }`}>
                              {isSelected && (
                                <Check size={12} className="text-white" />
                              )}
                            </div>
                            <span>{isSelected ? "Selected" : "Add to selection"}</span>
                            <Badge variant="outline" className="ml-auto text-[10px]">
                              {suggestion.insightIds.length} items
                            </Badge>
                          </div>
                        </button>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Create Button */}
                <div className="sticky bottom-0 bg-gradient-to-t from-card to-transparent pt-4 pb-2">
                  <Button
                    onClick={handleCreateClusters}
                    disabled={selectedSuggestions.size === 0}
                    className="w-full"
                    size="lg"
                  >
                    <Sparkles size={16} className="mr-2" />
                    Create {selectedSuggestions.size > 0 ? `${selectedSuggestions.size} ` : ""}Cluster{selectedSuggestions.size !== 1 ? "s" : ""}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
