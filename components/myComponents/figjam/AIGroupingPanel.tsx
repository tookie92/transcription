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

interface GroupingSuggestion {
  action: "create_new" | "add_to_existing";
  confidence: number;
  reason: string;
  insightIds: string[];
  newGroupTitle?: string;
  newGroupDescription?: string;
  cachedAt?: number;
}

interface AIGroupingPanelProps {
  isOpen: boolean;
  onClose: () => void;
  ungroupedStickies: StickyNoteData[];
  existingClusters: ClusterLabelData[];
  projectContext?: string;
  onCreateCluster: (stickyIds: string[], title: string, position: { x: number; y: number }) => void;
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
}: AIGroupingPanelProps) {
  const [suggestions, setSuggestions] = useState<GroupingSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<number>>(new Set());
  const [lastStickyIds, setLastStickyIds] = useState<string[]>([]);
  const [fromCache, setFromCache] = useState(false);
  const cachedSuggestionsRef = useRef<GroupingSuggestion[]>([]);
  const lastFetchTimeRef = useRef<number>(0);

  // Check if we have valid cached suggestions
  const hasValidCache = suggestions.length > 0 && !fromCache;

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

  // Auto-load cached suggestions when panel opens
  useEffect(() => {
    if (isOpen && cachedSuggestionsRef.current.length > 0) {
      const cacheAge = Date.now() - lastFetchTimeRef.current;
      if (cacheAge < CACHE_DURATION) {
        // Use cached suggestions
        setSuggestions(cachedSuggestionsRef.current);
        setFromCache(true);
        setSelectedSuggestions(new Set());
      }
    }
  }, [isOpen]);

  const fetchSuggestions = async (forceRefresh = false) => {
    // Check cache first (unless forcing refresh)
    if (!forceRefresh && cachedSuggestionsRef.current.length > 0) {
      const cacheAge = Date.now() - lastFetchTimeRef.current;
      if (cacheAge < CACHE_DURATION) {
        // Use cached suggestions
        setSuggestions(cachedSuggestionsRef.current);
        setFromCache(true);
        setSelectedSuggestions(new Set());
        setLastStickyIds(ungroupedStickies.map(s => s.id));
        toast.success("Loaded cached suggestions");
        return;
      }
    }

    setIsLoading(true);
    setFromCache(false);
    setSuggestions([]);
    setSelectedSuggestions(new Set());

    try {
      const response = await fetch("/api/suggest-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          insights: ungroupedStickies.map((s) => ({
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
      const newSuggestions = (data.suggestions || []).map((s: GroupingSuggestion) => ({
        ...s,
        cachedAt: Date.now()
      }));
      
      // Cache the suggestions
      cachedSuggestionsRef.current = newSuggestions;
      lastFetchTimeRef.current = Date.now();
      setLastStickyIds(ungroupedStickies.map(s => s.id));
      
      setSuggestions(newSuggestions);

      if (!newSuggestions.length) {
        toast.info("No groupings could be suggested");
      } else {
        toast.success(`Got ${newSuggestions.length} suggestions`);
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

    // PROXIMITY_RADIUS = 350px in FigJamBoard
    // Stickies will be placed at cluster.y + 40 to cluster.y + 360
    // Cluster label should be ABOVE where we want the stickies to end up
    // Place cluster label above the original sticky positions
    const CLUSTER_LABEL_OFFSET_Y = -150; // Cluster label is above the stickies
    const SPACING_X = 350; // Horizontal space between cluster centers
    const SPACING_Y = 400; // Vertical space between rows of clusters

    // Position cluster label above and to the left of the stickies
    const baseClusterX = avgX - (selectedList.length * SPACING_X) / 2;
    const baseClusterY = avgY + CLUSTER_LABEL_OFFSET_Y;

    selectedList.forEach((suggestion, index) => {
      // Arrange in rows of max 3 clusters
      const COLS_PER_ROW = Math.min(3, selectedList.length);
      const col = index % COLS_PER_ROW;
      const row = Math.floor(index / COLS_PER_ROW);
      
      // Position cluster label center
      // Stickies will be placed at cluster.y + 40 to cluster.y + 360 (within 350px radius)
      // So if cluster.y = avgY - 150, stickies will be at avgY - 110 to avgY + 210
      // Original stickies are at avgY - 100 to avgY + 100
      // Stickies will end up ABOVE their original position (higher on screen)
      const clusterPosition = {
        x: baseClusterX + col * SPACING_X,
        y: baseClusterY - row * SPACING_Y
      };
      
      onCreateCluster(
        suggestion.insightIds,
        suggestion.newGroupTitle || "New Cluster",
        clusterPosition
      );
    });

    // Remove created suggestions from the list
    const newSuggestions = suggestions.filter((_, i) => !selectedSuggestions.has(i));
    setSuggestions(newSuggestions);
    cachedSuggestionsRef.current = newSuggestions;
    
    // Clear selection
    setSelectedSuggestions(new Set());
    
    if (newSuggestions.length === 0) {
      toast.success(`Created ${selectedList.length} cluster(s). All done!`);
      onClose();
    } else {
      toast.success(`Created ${selectedList.length} cluster(s). ${newSuggestions.length} remaining.`);
    }
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
              All {ungroupedStickies.length} stickies are grouped
            </p>
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
            {suggestions.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {suggestions.length} suggestions
                    </p>
                    {fromCache && (
                      <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                        Cached
                      </Badge>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => fetchSuggestions(true)}>
                    <RefreshCw size={14} className="mr-1" />
                    New Request
                  </Button>
                </div>

                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {suggestions.map((suggestion, index) => {
                    const isSelected = selectedSuggestions.has(index);
                    const stickiesInSuggestion = ungroupedStickies.filter((s) =>
                      suggestion.insightIds.includes(s.id)
                    );

                    return (
                      <button
                        key={index}
                        onClick={() => toggleSuggestion(index)}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50 hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="font-medium text-sm text-foreground line-clamp-1">
                            {suggestion.newGroupTitle || "New Group"}
                          </p>
                          <div className="flex items-center gap-1 shrink-0">
                            <Badge variant="secondary" className="text-xs">
                              {suggestion.insightIds.length} items
                            </Badge>
                            <Badge variant="outline" className="text-xs">
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
                        <div className={`mt-2 flex items-center gap-1 text-xs ${
                          isSelected ? "text-primary" : "text-muted-foreground"
                        }`}>
                          <div className={`w-4 h-4 rounded border ${
                            isSelected
                              ? "bg-primary border-primary"
                              : "border-muted-foreground"
                          } flex items-center justify-center`}>
                            {isSelected && <Check size={12} className="text-white" />}
                          </div>
                          <span>{isSelected ? "Selected" : "Click to select"}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Create Button */}
                <div className="sticky bottom-0 bg-card pt-2 border-t border-border">
                  <Button
                    onClick={handleCreateClusters}
                    disabled={selectedSuggestions.size === 0}
                    className="w-full"
                  >
                    <Plus size={16} className="mr-2" />
                    Create {selectedSuggestions.size} Cluster{selectedSuggestions.size !== 1 ? "s" : ""}
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
