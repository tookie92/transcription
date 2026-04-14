"use client";

import { useState } from "react";
import { 
  Sparkles, 
  Loader2, 
  Layers,
  X,
  Check,
  RefreshCw,
  GitMerge,
  Search
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
}

interface SimilarClustersSuggestion {
  clusterAId: string;
  clusterATitle: string;
  clusterBId: string;
  clusterBTitle: string;
  similarityScore: number;
  reason: string;
  mergedTitle?: string;
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
  // Simple state - no cache
  const [suggestions, setSuggestions] = useState<GroupingSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<number>>(new Set());

  // Similar clusters detection
  const [similarClusters, setSimilarClusters] = useState<SimilarClustersSuggestion[]>([]);
  const [isDetectingSimilar, setIsDetectingSimilar] = useState(false);
  const [showSimilarTab, setShowSimilarTab] = useState(false);

  // Mutations
  const mergeClustersMutation = useMutation(api.affinityMaps.mergeClusters);
  const userCredits = useQuery(api.credits.getUserCredits);
  const userConsent = useQuery(api.credits.getConsent);
  const deductCredits = useMutation(api.credits.deductCredits);
  const initializeCredits = useMutation(api.credits.initializeCredits);

  const checkCredits = async () => {
    if (!userConsent) {
      onNeedConsent?.();
      return false;
    }

    try {
      await initializeCredits({});
    } catch {}

    const creditsData = userCredits || { credits: 150, costs: { transcription: 20, aiGrouping: 10, aiRename: 5 } };
    
    if (creditsData.credits < creditsData.costs.aiGrouping) {
      toast.error(`Not enough credits. Need ${creditsData.costs.aiGrouping} but have ${creditsData.credits}.`);
      return false;
    }

    try {
      await deductCredits({ operation: "aiGrouping" });
      return true;
    } catch {
      toast.error("Not enough credits for AI grouping.");
      return false;
    }
  };

  // Toggle selection
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

  // Fetch suggestions - SIMPLE: always based on current ungrouped stickies
  const fetchSuggestions = async () => {
    if (ungroupedStickies.length < 2) {
      toast.info("Need at least 2 ungrouped stickies");
      return;
    }

    const hasCredits = await checkCredits();
    if (!hasCredits) return;

    setIsLoading(true);
    setSelectedSuggestions(new Set());
    setSuggestions([]); // Clear previous suggestions

    try {
      const response = await fetch("/api/suggest-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // ONLY send current ungrouped stickies
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

      if (!response.ok) throw new Error("Failed to fetch");

      const data = await response.json();
      const newSuggestions: GroupingSuggestion[] = (data.suggestions || []).map((s: GroupingSuggestion, idx: number) => ({
        ...s,
        id: `suggestion-${Date.now()}-${idx}`,
      }));

      setSuggestions(newSuggestions);

      if (newSuggestions.length === 0) {
        toast.info("No groupings could be suggested");
      } else {
        toast.success(`Generated ${newSuggestions.length} suggestion(s)`);
      }
    } catch {
      toast.error("Failed to generate groupings");
    } finally {
      setIsLoading(false);
    }
  };

  // Detect similar clusters
  const detectSimilarClusters = async () => {
    if (existingClusters.length < 2) {
      toast.info("Need at least 2 clusters");
      return;
    }

    setIsDetectingSimilar(true);
    setShowSimilarTab(true);

    try {
      const clustersWithInsights = existingClusters.map(cluster => {
        const stickiesInCluster = ungroupedStickies.filter(s => 
          s.clusterId === cluster.id || s.parentSectionId === cluster.id
        );
        return {
          id: cluster.id,
          title: cluster.text,
          insights: stickiesInCluster.map(s => ({
            id: s.id,
            content: s.content,
          })),
        };
      });

      const response = await fetch("/api/find-similar-clusters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clusters: clustersWithInsights }),
      });

      if (!response.ok) throw new Error("Failed to find similar");

      const data = await response.json();
      setSimilarClusters(data.similarPairs || []);
    } catch {
      toast.error("Failed to detect similar clusters");
    } finally {
      setIsDetectingSimilar(false);
    }
  };

  // Create clusters from selected suggestions - SIMPLE
  const handleCreateClusters = () => {
    if (selectedSuggestions.size === 0) {
      toast.info("Select suggestions first");
      return;
    }

    if (ungroupedStickies.length === 0) {
      toast.error("No stickies to group");
      return;
    }

    const selectedList = Array.from(selectedSuggestions).map((i) => suggestions[i]);
    
    // Calculate center
    const stickyCenters = ungroupedStickies.map(s => ({
      x: s.position.x + 100,
      y: s.position.y + 100,
    }));
    const avgX = stickyCenters.reduce((sum, c) => sum + c.x, 0) / stickyCenters.length;
    const avgY = stickyCenters.reduce((sum, c) => sum + c.y, 0) / stickyCenters.length;

    const CLUSTERS_PER_ROW = 2;
    const SPACING_X = 350;
    const SPACING_Y = 400;
    const baseClusterX = avgX - (CLUSTERS_PER_ROW * SPACING_X) / 2 + 100;
    const baseClusterY = avgY - 100;

    // Simple position finder
    const findEmptySpot = (startX: number, startY: number) => {
      let bestX = startX;
      let bestY = startY;
      let found = false;
      const maxAttempts = 20;

      for (let attempt = 0; attempt < maxAttempts && !found; attempt++) {
        let overlap = false;
        for (const cluster of existingClusters) {
          const dx = Math.abs(bestX - cluster.position.x);
          const dy = Math.abs(bestY - cluster.position.y);
          if (dx < 300 && dy < 300) {
            overlap = true;
            break;
          }
        }
        if (!overlap) found = true;
        else {
          bestX += 50;
          bestY += 50;
        }
      }
      return { x: bestX, y: bestY };
    };

    // Create clusters
    selectedList.forEach((suggestion, index) => {
      const col = index % CLUSTERS_PER_ROW;
      const row = Math.floor(index / CLUSTERS_PER_ROW);
      const targetX = baseClusterX + col * SPACING_X;
      const targetY = baseClusterY - row * SPACING_Y;
      const position = findEmptySpot(targetX, targetY);

      onCreateCluster(
        suggestion.insightIds,
        suggestion.newGroupTitle || "New Cluster",
        position
      );
    });

    // SIMPLE: Clear all suggestions after creation
    setSuggestions([]);
    setSelectedSuggestions(new Set());
    
    toast.success(`Created ${selectedList.length} cluster(s)`);
  };

  // Merge clusters
  const handleMergeClusters = async (suggestion: SimilarClustersSuggestion) => {
    try {
      await mergeClustersMutation({
        mapId: mapId as Id<"affinityMaps">,
        targetClusterId: suggestion.clusterAId,
        sourceClusterId: suggestion.clusterBId,
        mergedTitle: suggestion.mergedTitle,
      });

      setSimilarClusters(prev => prev.filter(s => 
        !(s.clusterAId === suggestion.clusterAId && s.clusterBId === suggestion.clusterBId)
      ));

      toast.success(`Merged into "${suggestion.mergedTitle}"`);
    } catch {
      toast.error("Failed to merge clusters");
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "bg-green-500";
    if (confidence >= 0.6) return "bg-yellow-500";
    return "bg-gray-400";
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
            <div className="w-8 h-8 bg-violet-100 dark:bg-violet-900/30 rounded-lg flex items-center justify-center">
              <Sparkles size={16} className="text-violet-600 dark:text-violet-400" />
            </div>
            <h2 className="font-semibold text-foreground">AI Grouping</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center">
            <X size={18} className="text-muted-foreground" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-muted/50 rounded-lg">
          <button
            onClick={() => setShowSimilarTab(false)}
            className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-md transition-colors ${
              !showSimilarTab ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers size={14} className="inline mr-1" />
            Grouping
          </button>
          <button
            onClick={() => {
              setShowSimilarTab(true);
              if (similarClusters.length === 0) detectSimilarClusters();
            }}
            className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1 ${
              showSimilarTab ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <GitMerge size={14} className="inline mr-1" />
            Similar
            {similarClusters.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">{similarClusters.length}</Badge>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-3">
          <Layers size={14} />
          <span>{ungroupedStickies.length} ungrouped</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Similar Clusters Tab */}
        {showSimilarTab ? (
          <div className="space-y-4">
            <Button
              onClick={detectSimilarClusters}
              disabled={isDetectingSimilar || existingClusters.length < 2}
              className="w-full"
              variant="outline"
            >
              {isDetectingSimilar ? (
                <><Loader2 size={16} className="mr-2 animate-spin" />Analyzing...</>
              ) : (
                <><Search size={16} className="mr-2" />Find Similar</>
              )}
            </Button>

            {similarClusters.length > 0 ? (
              <div className="space-y-3">
                {similarClusters.map((suggestion, idx) => (
                  <div key={`${suggestion.clusterAId}-${suggestion.clusterBId}`} className="p-3 rounded-lg border border-border bg-muted/30">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs font-medium">
                        {Math.round(suggestion.similarityScore)}% similar
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1 p-2 bg-card rounded-lg border">
                        <p className="text-xs font-medium text-foreground truncate">{suggestion.clusterATitle}</p>
                      </div>
                      <GitMerge size={16} className="text-muted-foreground shrink-0" />
                      <div className="flex-1 p-2 bg-card rounded-lg border">
                        <p className="text-xs font-medium text-foreground truncate">{suggestion.clusterBTitle}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() => handleMergeClusters(suggestion)}
                    >
                      Merge
                    </Button>
                  </div>
                ))}
              </div>
            ) : existingClusters.length < 2 ? (
              <p className="text-xs text-muted-foreground text-center">Need at least 2 clusters</p>
            ) : null}
          </div>
        ) : (
          /* Grouping Tab - SIMPLE */
          <div className="space-y-4">
            {/* Generate Button */}
            {!suggestions.length && !isLoading && (
              <Button onClick={fetchSuggestions} className="w-full" disabled={ungroupedStickies.length < 2}>
                <Sparkles size={16} className="mr-2" />
                Generate Groupings
              </Button>
            )}

            {ungroupedStickies.length < 2 && (
              <p className="text-xs text-muted-foreground text-center">
                Need at least 2 ungrouped stickies
              </p>
            )}

            {/* Loading */}
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={24} className="animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Analyzing patterns...</span>
              </div>
            )}

            {/* Suggestions List */}
            {suggestions.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">
                    {suggestions.length} suggestion{suggestions.length !== 1 ? "s" : ""}
                  </p>
                  <Button variant="ghost" size="sm" onClick={fetchSuggestions}>
                    <RefreshCw size={14} className="mr-1" />
                    Refresh
                  </Button>
                </div>

                <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                  {suggestions.map((suggestion, index) => {
                    const isSelected = selectedSuggestions.has(index);
                    const stickiesInSuggestion = ungroupedStickies.filter((s) => suggestion.insightIds.includes(s.id));

                    return (
                      <motion.div
                        key={suggestion.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`group relative p-3 rounded-lg border transition-all cursor-pointer ${
                          isSelected
                            ? "border-primary bg-primary/5 shadow-md"
                            : "border-border hover:border-primary/50 hover:bg-muted/30"
                        }`}
                        onClick={() => toggleSuggestion(index)}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="font-medium text-sm text-foreground line-clamp-1">
                            {suggestion.newGroupTitle || "New Group"}
                          </p>
                        </div>

                        {/* Confidence */}
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${suggestion.confidence * 100}%` }}
                              className={`h-full ${getConfidenceColor(suggestion.confidence)}`}
                            />
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {Math.round(suggestion.confidence * 100)}%
                          </Badge>
                        </div>

                        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                          {suggestion.reason}
                        </p>

                        {/* Preview */}
                        <div className="flex flex-wrap gap-1 mb-2">
                          {stickiesInSuggestion.slice(0, 3).map((sticky) => (
                            <span key={sticky.id} className="text-[10px] px-1.5 py-0.5 bg-muted rounded truncate max-w-[100px]">
                              {sticky.content.slice(0, 15)}...
                            </span>
                          ))}
                          {stickiesInSuggestion.length > 3 && (
                            <span className="text-[10px] text-muted-foreground">+{stickiesInSuggestion.length - 3} more</span>
                          )}
                        </div>

                        {/* Selection indicator */}
                        <div className={`flex items-center gap-2 text-xs ${isSelected ? "text-primary" : "text-muted-foreground"}`}>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            isSelected ? "bg-primary border-primary" : "border-muted-foreground"
                          }`}>
                            {isSelected && <Check size={12} className="text-white" />}
                          </div>
                          <span>{isSelected ? "Selected" : "Click to select"}</span>
                          <Badge variant="outline" className="ml-auto text-[10px]">
                            {suggestion.insightIds.length} items
                          </Badge>
                        </div>
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
