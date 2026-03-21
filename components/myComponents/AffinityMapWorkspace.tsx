// components/AffinityMapWorkspace.tsx - FigJam Style
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { AffinityGroup, Insight, ActivePanel, ThemeAnalysis, ThemeRecommendation } from "@/types";
import { toast } from "sonner";
import { useAuth, useUser } from "@clerk/nextjs";

// Import the new FigJam-style canvas
import { FigJamCanvas } from "./figjam/FigJamCanvas";

// Extracted hooks
import { useAffinityMapData } from "@/hooks/useAffinityMapData";
import { useAffinityMapHandlers } from "@/hooks/useAffinityMapHandlers";

// Activity
import { useActivity } from "@/hooks/useActivity";
import { ActivityPanel } from "./ActivityPanel";

// Side panels for features (AI suggestions, analytics, etc.)
import { CanvasSidePanels } from "./canvas/CanvasSidePanels";

interface AffinityMapWorkspaceProps {
  projectId: Id<"projects">;
}

export function AffinityMapWorkspace({ projectId }: AffinityMapWorkspaceProps) {
  const router = useRouter();
  const { userId } = useAuth();
  const { user } = useUser();

  // ==================== DATA HOOK ====================
  const { 
    project, affinityMap, groups, insights, insightsData, activities,
    stickyPositions, updateStickyPositions,
    addGroup, moveGroup, addInsightToGroup, updateGroupTitle, 
    removeGroup, removeInsightFromGroup, replaceAllGroups, createManualInsight, deleteInsight,
    broadcastGroupCreated, broadcastInsightMoved
  } = useAffinityMapData(projectId);

  // ==================== STATE ====================
  const activity = useActivity();
  const [showActivityPanel, setShowActivityPanel] = useState(false);
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const [isVotingMode, setIsVotingMode] = useState(false);
  const [userVotes, setUserVotes] = useState<string[]>([]);
  const [themeAnalysis, setThemeAnalysis] = useState<ThemeAnalysis | null>(null);
  const [isThemesAnalyzing, setIsThemesAnalyzing] = useState(false);

  // ==================== AUTO-CREATE MAP ====================
  const createAffinityMap = useMutation(api.affinityMaps.create);
  useEffect(() => {
    if (project && !affinityMap) {
      createAffinityMap({
        projectId: projectId as Id<"projects">,
        name: `${project.name} Affinity Map`,
        description: `Affinity map for ${project.name}`
      }).catch(console.error);
    }
  }, [project, affinityMap, projectId, createAffinityMap]);

  // ==================== HANDLERS HOOK ====================
  const handlers = useAffinityMapHandlers({
    affinityMap,
    projectId,
    userId: userId || undefined,
    userName: user?.fullName || user?.firstName || "Un utilisateur",
    addGroup,
    moveGroup,
    addInsightToGroup,
    updateGroupTitle,
    removeGroup,
    removeInsightFromGroup,
    replaceAllGroups,
    createManualInsight: createManualInsight as (args: { projectId: Id<"projects">; text: string; type: string }) => Promise<string>,
    deleteInsight,
    updateStickyPositions,
    broadcastGroupCreated,
    broadcastInsightMoved,
    activity,
  });

  // ==================== VOTING HANDLERS ====================
  const handleVote = useCallback((insightId: string) => {
    if (userVotes.includes(insightId)) {
      setUserVotes((prev) => prev.filter((id) => id !== insightId));
      toast.info("Vote removed");
    } else {
      if (userVotes.length >= 5) {
        toast.error("Maximum 5 votes allowed");
        return;
      }
      setUserVotes((prev) => [...prev, insightId]);
      toast.success("Vote added!");
    }
  }, [userVotes]);

  const handleToggleVotingMode = useCallback(() => {
    setIsVotingMode((prev) => !prev);
    if (!isVotingMode) {
      toast.info("Voting mode enabled - click on stickies to vote");
    }
  }, [isVotingMode]);

  // ==================== STICKY POSITION HANDLER ====================
  const handleStickyPositionChange = useCallback((insightId: string, position: { x: number; y: number }) => {
    if (affinityMap?._id) {
      updateStickyPositions({
        mapId: affinityMap._id as Id<"affinityMaps">,
        positions: {
          ...stickyPositions,
          [insightId]: position,
        },
      });
    }
  }, [affinityMap, stickyPositions, updateStickyPositions]);

  // ==================== THEME ANALYSIS HANDLERS ====================
  const handleAnalyzeThemes = useCallback(async () => {
    if (groups.length === 0) {
      toast.error("No groups to analyze");
      return;
    }

    setIsThemesAnalyzing(true);
    try {
      const response = await fetch("/api/detect-themes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groups: groups.map(g => ({
            id: g.id,
            title: g.title,
            insights: insights.filter(i => g.insightIds.includes(i.id)).map(i => i.text),
            insightCount: g.insightIds.length,
          })),
          projectContext: project?.name || "Project",
          totalGroups: groups.length,
          totalInsights: insights.length,
        }),
      });

      if (!response.ok) throw new Error("Analysis failed");
      
      const data = await response.json();
      setThemeAnalysis(data);
      toast.success(`Found ${data.themes?.length || 0} themes`);
    } catch (error) {
      console.error("Theme analysis error:", error);
      toast.error("Failed to analyze themes");
    } finally {
      setIsThemesAnalyzing(false);
    }
  }, [groups, insights, project]);

  const handleClearThemes = useCallback(() => {
    setThemeAnalysis(null);
  }, []);

  const handleApplyRecommendation = useCallback((recommendation: ThemeRecommendation) => {
    switch (recommendation.type) {
      case "merge":
        if (recommendation.groups.length < 2) {
          toast.error("Need at least 2 groups to merge");
          return;
        }
        const groupsToMerge = groups.filter(g => recommendation.groups.includes(g.id));
        if (groupsToMerge.length < 2) {
          toast.error("Selected groups not found");
          return;
        }
        const mergedGroup = groupsToMerge[0];
        const avgX = groupsToMerge.reduce((sum, g) => sum + g.position.x, 0) / groupsToMerge.length;
        const avgY = groupsToMerge.reduce((sum, g) => sum + g.position.y, 0) / groupsToMerge.length;
        const mergedInsightIds = groupsToMerge.flatMap(g => g.insightIds);
        
        handlers.handleGroupsReplace([
          ...groups.filter(g => !recommendation.groups.includes(g.id)),
          {
            ...mergedGroup,
            title: mergedGroup.title,
            position: { x: avgX, y: avgY },
            insightIds: mergedInsightIds,
          },
        ]);
        toast.success(`Merged ${groupsToMerge.length} groups`);
        break;

      case "split":
        if (recommendation.groups.length !== 1) {
          toast.info("Split requires selecting one group");
          return;
        }
        const groupToSplit = groups.find(g => g.id === recommendation.groups[0]);
        if (!groupToSplit) {
          toast.error("Group not found");
          return;
        }
        const insightsPerGroup = Math.ceil(groupToSplit.insightIds.length / 2);
        const newGroups: AffinityGroup[] = [];
        for (let i = 0; i < 2; i++) {
          const startIdx = i * insightsPerGroup;
          const endIdx = Math.min(startIdx + insightsPerGroup, groupToSplit.insightIds.length);
          if (startIdx < groupToSplit.insightIds.length) {
            newGroups.push({
              id: `split-${Date.now()}-${i}`,
              title: `${groupToSplit.title} (${i + 1})`,
              color: groupToSplit.color,
              position: {
                x: groupToSplit.position.x + (i * 450),
                y: groupToSplit.position.y,
              },
              insightIds: groupToSplit.insightIds.slice(startIdx, endIdx),
            });
          }
        }
        handlers.handleGroupsReplace([
          ...groups.filter(g => g.id !== groupToSplit.id),
          ...newGroups,
        ]);
        toast.success(`Split into ${newGroups.length} groups`);
        break;

      case "reorganize":
        toast.info("Select insights to move to different groups");
        break;

      case "create_parent":
        const parentGroups = groups.filter(g => recommendation.groups.includes(g.id));
        if (parentGroups.length === 0) {
          toast.error("No groups selected for parent");
          return;
        }
        const parentX = Math.min(...parentGroups.map(g => g.position.x)) - 50;
        const parentY = Math.min(...parentGroups.map(g => g.position.y)) - 50;
        const newParent: AffinityGroup = {
          id: `parent-${Date.now()}`,
          title: "Parent Theme",
          color: "#9747FF",
          position: { x: parentX, y: parentY },
          insightIds: [],
        };
        handlers.handleGroupsReplace([
          ...groups,
          newParent,
        ]);
        toast.success("Created parent theme - drag groups inside");
        break;
    }
    setThemeAnalysis(null);
  }, [groups, handlers]);

  const handleGroupsMerge = useCallback((groupIds: string[], newTitle: string) => {
    if (groupIds.length < 2) {
      toast.error("Select at least 2 groups to merge");
      return;
    }
    const groupsToMerge = groups.filter(g => groupIds.includes(g.id));
    if (groupsToMerge.length < 2) {
      toast.error("Groups not found");
      return;
    }
    const mergedGroup = groupsToMerge[0];
    const avgX = groupsToMerge.reduce((sum, g) => sum + g.position.x, 0) / groupsToMerge.length;
    const avgY = groupsToMerge.reduce((sum, g) => sum + g.position.y, 0) / groupsToMerge.length;
    const mergedInsightIds = groupsToMerge.flatMap(g => g.insightIds);
    
    handlers.handleGroupsReplace([
      ...groups.filter(g => !groupIds.includes(g.id)),
      {
        ...mergedGroup,
        title: newTitle || mergedGroup.title,
        position: { x: avgX, y: avgY },
        insightIds: mergedInsightIds,
      },
    ]);
    toast.success(`Merged ${groupsToMerge.length} groups into "${newTitle}"`);
  }, [groups, handlers]);

  // ==================== OTHER USERS (MOCK FOR NOW) ====================
  const otherUsers = useQuery(api.presence.getByMap, affinityMap ? { 
    mapId: affinityMap._id as Id<"affinityMaps"> 
  } : "skip");

  // ==================== PROJECT NOT FOUND ====================
  if (!project) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Project not found</h1>
          <button 
            onClick={() => router.push("/")}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // ==================== RENDER ====================
  return (
    <div className="h-full relative bg-[#f5f5f0]">
      {/* Main Canvas with FigJam Style */}
      <FigJamCanvas
        groups={groups}
        insights={insights}
        stickyPositions={stickyPositions}
        onStickyPositionChange={handleStickyPositionChange}
        projectId={projectId}
        projectName={project.name}
        currentUserId={userId || undefined}
        currentUserName={user?.fullName || user?.firstName || "User"}
        otherUsers={otherUsers?.map((u: { userId: string; user?: { name?: string }; cursor: { x: number; y: number }; lastSeen: number }) => ({
          id: u.userId,
          name: u.user?.name || "User",
          initials: (u.user?.name || "U").substring(0, 2).toUpperCase(),
          color: "#9747FF",
          cursor: u.cursor,
          lastSeen: u.lastSeen,
        })) || []}
        onGroupMove={handlers.handleGroupMove}
        onGroupCreate={handlers.handleGroupCreate}
        onInsightDrop={handlers.handleInsightDrop}
        onInsightRemove={handlers.handleInsightRemoveFromGroup}
        onGroupDelete={handlers.handleGroupDelete}
        onGroupTitleUpdate={handlers.handleGroupTitleUpdate}
        onStickyCreate={(position, color) => {
          handlers.handleManualInsightCreate(`New note`, "custom", position);
        }}
        onInsightDelete={handlers.handleInsightDelete}
        isVotingMode={isVotingMode}
        userVotes={userVotes}
        onVote={handleVote}
      />

      {/* Side Panels (Theme Discovery, Analytics, Persona, Export) - slide in from right as overlay */}
      <CanvasSidePanels
        isPresentMode={false}
        activePanel={activePanel}
        setActivePanel={setActivePanel}
        groups={groups}
        insights={insights}
        projectId={projectId}
        projectInfo={{ name: project.name, description: project.description }}
        mapId={affinityMap?._id || ""}
        userId={userId || undefined}
        selectedTheme={null}
        setSelectedTheme={() => {}}
        onApplyRecommendation={handleApplyRecommendation}
        onGroupsMerge={handleGroupsMerge}
        filteredRecommendations={themeAnalysis?.recommendations}
        themeAnalysis={themeAnalysis}
        isThemesAnalyzing={isThemesAnalyzing}
        onAnalyzeThemes={handleAnalyzeThemes}
        onClearThemes={handleClearThemes}
      />

      {/* Activity Panel */}
      {showActivityPanel && affinityMap && (
        <ActivityPanel
          mapId={affinityMap._id}
          isOpen={showActivityPanel}
          onClose={() => setShowActivityPanel(false)}
        />
      )}

      {/* Voting Mode Toggle Button */}
      <button
        onClick={handleToggleVotingMode}
        className={`fixed top-16 right-4 z-40 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
          isVotingMode
            ? "bg-[#9747FF] text-white"
            : "bg-white border border-[#e8e8e8] text-[#1d1d1d] hover:bg-[#f5f5f5]"
        }`}
      >
        {isVotingMode ? (
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            Voting On ({userVotes.length})
          </span>
        ) : (
          "Start Voting"
        )}
      </button>

      {/* Activity Toggle Button */}
      <button
        onClick={() => setShowActivityPanel(!showActivityPanel)}
        className={`fixed bottom-4 left-4 z-40 px-3 py-2 rounded-lg text-sm transition-all ${
          showActivityPanel
            ? "bg-[#1d1d1d] text-white"
            : "bg-white border border-[#e8e8e8] text-[#1d1d1d] hover:bg-[#f5f5f5]"
        }`}
      >
        Activity
      </button>

      {/* Side Panels Toggle */}
      <div className="fixed top-16 left-4 z-40 flex flex-col gap-2">
        <button
          onClick={() => setActivePanel(activePanel === "themeDiscovery" ? null : "themeDiscovery")}
          className={`p-2 rounded-lg transition-all ${
            activePanel === "themeDiscovery"
              ? "bg-[#9747FF] text-white"
              : "bg-white border border-[#e8e8e8] hover:bg-[#f5f5f5]"
          }`}
          title="AI Suggestions"
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </button>
        
        <button
          onClick={() => setActivePanel(activePanel === "analytics" ? null : "analytics")}
          className={`p-2 rounded-lg transition-all ${
            activePanel === "analytics"
              ? "bg-[#9747FF] text-white"
              : "bg-white border border-[#e8e8e8] hover:bg-[#f5f5f5]"
          }`}
          title="Analytics"
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M18 20V10M12 20V4M6 20v-6" />
          </svg>
        </button>
        
        <button
          onClick={() => setActivePanel(activePanel === "persona" ? null : "persona")}
          className={`p-2 rounded-lg transition-all ${
            activePanel === "persona"
              ? "bg-[#9747FF] text-white"
              : "bg-white border border-[#e8e8e8] hover:bg-[#f5f5f5]"
          }`}
          title="Personas"
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </button>
      </div>
    </div>
  );
}
