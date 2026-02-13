"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { AffinityGroup as AffinityGroupType, Insight, DetectedTheme, ThemeRecommendation, ThemeAnalysis } from "@/types";
import { useThemeDetection } from "@/hooks/useThemeDetection";
import { toast } from "sonner";

interface PendingGroupData {
  groupTitle: string;
  insightIds: string[];
  tempGroupId: string;
  createdAt: number;
  childGroupIds?: string[];
}

interface UseThemeManagementProps {
  groups: AffinityGroupType[];
  insights: Insight[];
  projectContext: string;
  onGroupCreate: (position: { x: number; y: number }) => void;
  onGroupMove: (groupId: string, position: { x: number; y: number }) => void;
  onInsightDrop: (insightId: string, groupId: string) => void;
  onGroupDelete?: (groupId: string) => void;
  onGroupTitleUpdate?: (groupId: string, title: string) => void;
  saveCurrentState: (action: string, description: string) => void;
}

export function useThemeManagement({
  groups,
  insights,
  projectContext,
  onGroupCreate,
  onGroupMove,
  onInsightDrop,
  onGroupDelete,
  onGroupTitleUpdate,
  saveCurrentState,
}: UseThemeManagementProps) {
  const {
    isAnalyzing: isThemesAnalyzing,
    themeAnalysis,
    detectThemes,
    clearThemes,
  } = useThemeDetection();

  const [selectedTheme, setSelectedTheme] = useState<DetectedTheme | null>(null);
  const [pendingParentGroup, setPendingParentGroup] = useState<PendingGroupData | null>(null);
  const [applyingAction, setApplyingAction] = useState<string | null>(null);
  const [highlightedGroups, setHighlightedGroups] = useState<Set<string>>(new Set());

  const detectedThemes = themeAnalysis?.themes || [];

  // ==================== EXTRACT SUGGESTED NAME ====================
  const extractSuggestedName = useCallback((reason: string): string => {
    const patterns = [
      /suggested name: "([^"]+)"/i,
      /suggested name: '([^']+)'/i,
      /suggested name: ([^.,]+)/i,
      /suggested.*name: "([^"]+)"/i,
      /create.*theme.*: "([^"]+)"/i,
      /parent.*: "([^"]+)"/i,
      /merge.*as "([^"]+)"/i,
      /["']([^"']+)["'].*suggested/i,
    ];

    for (const pattern of patterns) {
      const match = reason.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    if (reason.includes("hierarchical")) return "Parent Theme";
    if (reason.includes("merge")) return "Merged Group";
    if (reason.includes("similar")) return "Similar Insights";

    return "New Theme";
  }, []);

  // ==================== MERGE ====================
  const handleGroupsMerge = useCallback(
    (groupIds: string[], newTitle: string) => {
      if (groupIds.length < 2) {
        toast.error("Cannot merge - need at least 2 groups");
        return;
      }

      const groupsToMerge = groups.filter((group) =>
        groupIds.includes(group.id)
      );
      if (groupsToMerge.length < 2) {
        toast.error("Selected groups not found");
        return;
      }

      const avgX =
        groupsToMerge.reduce((sum, group) => sum + group.position.x, 0) /
        groupsToMerge.length;
      const avgY =
        groupsToMerge.reduce((sum, group) => sum + group.position.y, 0) /
        groupsToMerge.length;
      const allInsightIds = groupsToMerge.flatMap(
        (group) => group.insightIds
      );

      saveCurrentState(
        "before_merge",
        `Before merging ${groupsToMerge.length} groups into "${newTitle}"`
      );
      onGroupCreate({ x: avgX, y: avgY });

      setTimeout(() => {
        const newGroup = groups.find(
          (group) =>
            group.title === "New Theme" || group.title === "New Group"
        );

        if (newGroup) {
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
            groupsToMerge.forEach((group) => {
              if (
                group.insightIds.length === 0 ||
                confirm(`Delete group "${group.title}"?`)
              ) {
                onGroupDelete?.(group.id);
              }
            });
            toast.success(
              `✅ Merged ${groupsToMerge.length} groups into "${newTitle}"`
            );
          }, 1000);
        } else {
          toast.error("❌ Failed to create new group for merge");
        }
      }, 100);
    },
    [groups, onGroupCreate, onInsightDrop, onGroupDelete, onGroupTitleUpdate, saveCurrentState]
  );

  // ==================== CREATE PARENT ====================
  const handleCreateParentGroup = useCallback(
    (groupIds: string[], parentTitle: string) => {
      const childGroups = groups.filter((group) =>
        groupIds.includes(group.id)
      );
      if (childGroups.length === 0) {
        toast.error("No groups found to create parent for");
        return;
      }

      const allChildInsightIds = childGroups.flatMap(
        (group) => group.insightIds
      );
      const avgX =
        childGroups.reduce((sum, group) => sum + group.position.x, 0) /
        childGroups.length;
      const avgY =
        childGroups.reduce((sum, group) => sum + group.position.y, 0) /
        childGroups.length;

      saveCurrentState(
        "before_create_parent",
        `Creating parent "${parentTitle}" for ${childGroups.length} groups`
      );

      setPendingParentGroup({
        groupTitle: parentTitle,
        insightIds: allChildInsightIds,
        tempGroupId: `pending-${Date.now()}`,
        createdAt: Date.now(),
        childGroupIds: childGroups.map((g) => g.id),
      });

      onGroupCreate({ x: avgX, y: avgY - 150 });
      toast.info(`Creating parent group "${parentTitle}"...`);
    },
    [groups, onGroupCreate, saveCurrentState]
  );

  // ==================== REORGANIZE ====================
  const handleReorganizeGroups = useCallback(
    (groupIds: string[]) => {
      const groupsToReorganize = groups.filter((group) =>
        groupIds.includes(group.id)
      );
      if (groupsToReorganize.length === 0) return;

      const centerX =
        groupsToReorganize.reduce(
          (sum, group) => sum + group.position.x,
          0
        ) / groupsToReorganize.length;
      const centerY =
        groupsToReorganize.reduce(
          (sum, group) => sum + group.position.y,
          0
        ) / groupsToReorganize.length;

      saveCurrentState(
        "before_reorganize",
        `Before reorganizing ${groupsToReorganize.length} groups`
      );

      groupsToReorganize.forEach((group, index) => {
        const angle =
          (index / groupsToReorganize.length) * 2 * Math.PI;
        const radius = 200;
        const newPosition = {
          x: centerX + Math.cos(angle) * radius,
          y: centerY + Math.sin(angle) * radius,
        };

        onGroupMove(group.id, newPosition);
      });

      toast.success(
        `Reorganized ${groupsToReorganize.length} groups in a circle`
      );
    },
    [groups, onGroupMove, saveCurrentState]
  );

  // ==================== APPLY RECOMMENDATION ====================
  const handleApplyRecommendation = useCallback(
    (recommendation: ThemeRecommendation) => {
      setApplyingAction(recommendation.type);
      setHighlightedGroups(new Set(recommendation.groups));

      const suggestedName = extractSuggestedName(recommendation.reason);
      toast.info(`Applying ${recommendation.type} recommendation...`);

      switch (recommendation.type) {
        case "merge":
          if (recommendation.groups.length >= 2) {
            handleGroupsMerge(recommendation.groups, suggestedName);
          } else {
            toast.error("Need at least 2 groups to merge");
          }
          break;
        case "split":
          if (recommendation.groups.length === 1) {
            const groupId = recommendation.groups[0];
            const group = groups.find((g) => g.id === groupId);
            if (group) {
              toast.info(
                `Select group "${group.title}" to split it manually`,
                { duration: 5000 }
              );
            }
          } else {
            toast.info("Please select a single group to split manually");
          }
          break;
        case "create_parent":
          if (recommendation.groups.length >= 1) {
            handleCreateParentGroup(
              recommendation.groups,
              suggestedName
            );
          } else {
            toast.error("Need groups to create parent for");
          }
          break;
        case "reorganize":
          if (recommendation.groups.length >= 1) {
            handleReorganizeGroups(recommendation.groups);
          } else {
            toast.error("Need groups to reorganize");
          }
          break;
        default:
          toast.info(
            `Action "${recommendation.type}" ready to implement`
          );
      }

      setTimeout(() => {
        setApplyingAction(null);
        setHighlightedGroups(new Set());
      }, 3000);
    },
    [
      handleGroupsMerge,
      handleCreateParentGroup,
      handleReorganizeGroups,
      groups,
      extractSuggestedName,
    ]
  );

  // ==================== ANALYZE THEMES ====================
  const handleAnalyzeThemes = useCallback(async () => {
    if (groups.length === 0) {
      toast.error("No groups to analyze");
      return;
    }

    toast.info("Analyzing themes patterns...");

    const analysis = await detectThemes(groups, insights, projectContext);

    if (analysis && analysis.themes.length > 0) {
      if (!selectedTheme && analysis.themes.length > 0) {
        setSelectedTheme(analysis.themes[0]);
      }
      toast.success(
        `Found ${analysis.themes.length} themes with ${analysis.summary.coverage}% coverage`
      );
    } else {
      toast.info("No significant themes detected in current groups");
    }
  }, [groups, insights, projectContext, selectedTheme, detectThemes]);

  // ==================== NEW GROUP DETECTION ====================
  const useNewGroupDetection = (
    groupsList: AffinityGroupType[],
    onNewGroupDetected: (
      groupId: string,
      pendingData: PendingGroupData
    ) => void
  ) => {
    const previousGroupsRef = useRef<AffinityGroupType[]>([]);

    useEffect(() => {
      if (
        groupsList.length > previousGroupsRef.current.length &&
        pendingParentGroup
      ) {
        const newGroups = groupsList.filter(
          (newGroup) =>
            !previousGroupsRef.current.some(
              (oldGroup) => oldGroup.id === newGroup.id
            )
        );

        const defaultTitledGroups = newGroups.filter(
          (group) =>
            group.title === "New Theme" || group.title === "New Group"
        );

        if (defaultTitledGroups.length > 0) {
          onNewGroupDetected(
            defaultTitledGroups[0].id,
            pendingParentGroup
          );
        }
      }

      previousGroupsRef.current = groupsList;
    }, [groupsList, pendingParentGroup, onNewGroupDetected]);
  };

  // Pending parent group timeout
  useEffect(() => {
    if (
      pendingParentGroup &&
      Date.now() - pendingParentGroup.createdAt > 10000
    ) {
      console.warn("⏰ Timeout - pending group creation took too long");
      setPendingParentGroup(null);
      toast.error("Group creation timeout");
    }
  }, [pendingParentGroup]);

  // Auto-select first theme
  useEffect(() => {
    if (detectedThemes.length > 0 && !selectedTheme) {
      setSelectedTheme(detectedThemes[0]);
    }
  }, [detectedThemes, selectedTheme]);

  return {
    // Theme detection
    isThemesAnalyzing,
    themeAnalysis,
    detectedThemes,
    selectedTheme,
    setSelectedTheme,
    clearThemes,

    // Actions
    handleGroupsMerge,
    handleCreateParentGroup,
    handleReorganizeGroups,
    handleApplyRecommendation,
    handleAnalyzeThemes,

    // Visual state
    applyingAction,
    highlightedGroups,
    setHighlightedGroups,

    // Parent group
    pendingParentGroup,
    setPendingParentGroup,

    // Hook for new group detection
    useNewGroupDetection,
  };
}
