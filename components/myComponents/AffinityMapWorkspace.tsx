// components/AffinityMapWorkspace.tsx - FigJam Style
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { AffinityGroup, Insight, ActivePanel, ThemeAnalysis, ThemeRecommendation } from "@/types";
import { toast } from "sonner";
import { useAuth, useUser } from "@clerk/nextjs";

// Import the FigJam board
import { FigJamBoard } from "./figjam/FigJamBoard";

// Extracted hooks
import { useAffinityMapData } from "@/hooks/useAffinityMapData";
import { useAffinityMapHandlers } from "@/hooks/useAffinityMapHandlers";

// Voting hook
import { useVotingSync } from "@/hooks/useVotingSync";

// Activity
import { useActivity } from "@/hooks/useActivity";
import { useActivityNotifications } from "@/hooks/useActivityNotifications";
import { ActivityPanel } from "./ActivityPanel";
import { CommentPanel } from "./CommentPanel";
import { ActivityButtonWithBadge } from "./figjam/NotificationBadge";
import { ArrowLeft, Clock, Vote } from "lucide-react";

// Side panels for features (AI suggestions, analytics, etc.)
import { CanvasSidePanels } from "./canvas/CanvasSidePanels";

// Voting config modal
import { VotingConfigModal } from "./figjam/VotingConfigModal";

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
    addGroup, moveGroup, resizeGroup, addInsightToGroup, updateGroupTitle, 
    removeGroup, removeInsightFromGroup, replaceAllGroups, createManualInsight, deleteInsight,
    broadcastGroupCreated, broadcastInsightMoved
  } = useAffinityMapData(projectId);

  // ==================== STATE ====================
  const activity = useActivity();
  const [showActivityPanel, setShowActivityPanel] = useState(false);
  
  // Activity notifications with badge
  const { unreadCount: activityUnreadCount, markAllAsRead } = useActivityNotifications({
    mapId: affinityMap?._id as Id<"affinityMaps">,
    maxNotifications: 50,
  });
  
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const [showVotingConfig, setShowVotingConfig] = useState(false);
  const [themeAnalysis, setThemeAnalysis] = useState<ThemeAnalysis | null>(null);
  const [isThemesAnalyzing, setIsThemesAnalyzing] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [commentPanel, setCommentPanel] = useState<{groupId: string; rect: DOMRect; title?: string} | null>(null);

  // ==================== COMMENT HANDLER ====================
  const handleOpenComment = useCallback((elementId: string, rect: DOMRect, title?: string) => {
    setCommentPanel({ groupId: elementId, rect, title });
  }, []);

  // ==================== VOTING (Synchronized via Convex) ====================
  const voting = useVotingSync(affinityMap?._id, projectId as Id<"projects">);
  const isVotingMode = voting.isVoting;

  // Compute vote results for ranking
  const voteResults = useMemo(() => {
    if (!voting.session || voting.session.isActive) return [];
    return groups
      .map(group => {
        const clusterVotes = voting.getClusterVotes(group.id);
        return {
          sectionId: group.id,
          title: group.title,
          voteCount: clusterVotes.length,
          colors: clusterVotes.map((v: { color: string }) => v.color),
        };
      })
      .filter((r: { voteCount: number }) => r.voteCount > 0)
      .sort((a: { voteCount: number }, b: { voteCount: number }) => b.voteCount - a.voteCount);
  }, [groups, voting.session, voting]);

  // Keyboard shortcut for voting mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;
      const active = document.activeElement;
      if (active?.tagName === "INPUT" || active?.tagName === "TEXTAREA" || (active as HTMLElement)?.isContentEditable) return;
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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
    resizeGroup,
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

  // ==================== STICKY POSITION HANDLER ====================
  const handleStickyPositionChange = useCallback((insightId: string, position: { x: number; y: number }) => {
    if (affinityMap?._id) {
      // Get current positions from affinityMap (fresh from query)
      const currentPositions = affinityMap.stickyPositions || {};
      updateStickyPositions({
        mapId: affinityMap._id as Id<"affinityMaps">,
        positions: {
          ...currentPositions,
          [insightId]: position,
        },
      });
    }
  }, [affinityMap, updateStickyPositions]);

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
              size: groupToSplit.size || { width: 400, height: 300 },
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
          size: { width: 500, height: 400 },
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
        size: mergedGroup.size || { width: 400, height: 300 },
      } as AffinityGroup,
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
  const isLoading = !affinityMap;

  return (
    <div className="h-full relative bg-background">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-2 bg-card border-b">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/project/${projectId}`)}
            className="p-2 rounded-lg hover:bg-accent transition-colors"
            title="Back to project"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">{project.name}</h1>
          <span className="text-sm text-muted-foreground">Affinity Map</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Vote Button - Start/Stop Voting */}
          <button
            onClick={() => {
              if (isVotingMode) {
                voting.stopVoting();
              } else {
                setShowVotingConfig(true);
              }
            }}
            className={`px-4 py-1.5 rounded-lg border flex items-center gap-2 text-sm font-medium transition-all ${
              isVotingMode
                ? "bg-red-500 border-red-600 text-white hover:bg-red-600 shadow-lg animate-pulse"
                : "bg-primary text-white hover:bg-primary/80 shadow-md"
            }`}
          >
            {isVotingMode ? (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="6" y="6" width="12" height="12" rx="2"/>
                </svg>
                Stop Voting
              </>
            ) : (
              <>
                <Vote className="w-4 h-4" />
                Start Voting
              </>
            )}
          </button>

          <ActivityButtonWithBadge
            count={activityUnreadCount}
            isActive={showActivityPanel}
            onClick={() => {
              setShowActivityPanel(!showActivityPanel);
              if (!showActivityPanel) {
                markAllAsRead();
              }
            }}
          />
        </div>
      </div>

      {/* Voting Status Banner */}
      {voting.session && voting.session.votingPhase !== "setup" && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-40 bg-gradient-to-r from-violet-500/10 to-purple-500/10 backdrop-blur-sm rounded-xl shadow-lg border border-violet-200 px-6 py-3 flex items-center gap-6">
          
          {/* Voting Phase Indicator */}
          {voting.session.votingPhase === "voting" && (
            <>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-violet-500 rounded-full animate-pulse"/>
                <span className="text-sm font-medium text-violet-700">Voting in progress</span>
              </div>
              
              {voting.remainingTime !== null && (
                <>
                  <div className="h-6 w-px bg-violet-200"/>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-violet-500" />
                    <span className="text-sm font-mono font-medium text-violet-700">
                      {Math.floor(voting.remainingTime / 60000).toString().padStart(2, '0')}:{Math.floor((voting.remainingTime % 60000) / 1000).toString().padStart(2, '0')}
                    </span>
                  </div>
                </>
              )}
              
              <div className="h-6 w-px bg-violet-200"/>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Your votes:</span>
                <div className="flex gap-1">
                  {Array.from({ length: voting.session?.maxDotsPerUser || 0 }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-5 h-5 rounded-full border-2 transition-all ${
                        i < voting.myVotesCount
                          ? "bg-violet-500 border-violet-500 scale-110"
                          : "border-gray-300"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs text-gray-500">({voting.myVotesCount}/{voting.session?.maxDotsPerUser})</span>
              </div>
            </>
          )}

          {/* Revealed Phase - Show Ranking */}
          {voting.session.votingPhase === "revealed" && (
            <>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"/>
                <span className="text-sm font-medium text-green-700">Results Revealed</span>
              </div>
              <div className="h-6 w-px bg-violet-200"/>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-violet-700">Top Clusters:</span>
                <div className="flex items-center gap-2">
                  {voteResults.slice(0, 3).map((result: { sectionId: string; title: string; voteCount: number }, i: number) => (
                    <div key={result.sectionId} className="flex items-center gap-1 bg-white/50 px-2 py-1 rounded-lg">
                      <span className={`text-xs font-bold ${i === 0 ? 'text-yellow-600' : i === 1 ? 'text-gray-500' : i === 2 ? 'text-amber-600' : 'text-gray-400'}`}>
                        #{i + 1}
                      </span>
                      <span className="text-xs text-gray-700 truncate max-w-[100px]">{result.title}</span>
                      <span className="text-xs font-bold text-violet-600">{result.voteCount}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background z-50">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading workspace...</p>
          </div>
        </div>
      )}
      
      {/* Main Canvas with FigJam Board */}
      {!isLoading && (
        <FigJamBoard
          projectName={project.name}
          projectId={projectId}
          mapId={affinityMap._id}
          style={{ paddingTop: isVotingMode ? '96px' : '56px' }}
          isVotingMode={isVotingMode}
          voting={voting}
          onBack={() => router.push(`/project/${projectId}`)}
          onOpenComment={handleOpenComment}
          onChange={(elements) => {
            console.log("Board changed:", Object.keys(elements).length, "elements");
          }}
        />
      )}

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
        onCreateGroup={async (insightIds, title) => {
          const position = { x: 400 + Math.random() * 200, y: 400 + Math.random() * 200 };
          const groupId = await handlers.handleGroupCreate(position, title);
          insightIds.forEach(insightId => {
            if (groupId) {
              handlers.handleInsightDrop(insightId, groupId);
            }
          });
        }}
        onAddToGroup={(insightIds, groupId) => {
          insightIds.forEach(insightId => {
            handlers.handleInsightDrop(insightId, groupId);
          });
        }}
      />

      {/* Activity Panel */}
      {showActivityPanel && affinityMap && (
        <ActivityPanel
          mapId={affinityMap._id}
          isOpen={showActivityPanel}
          onClose={() => setShowActivityPanel(false)}
        />
      )}

      {/* Comment Panel for Clusters */}
      {commentPanel && affinityMap && (
        <CommentPanel
          mapId={affinityMap._id as unknown as string}
          groupId={commentPanel.groupId}
          screenRect={commentPanel.rect}
          presenceUsers={otherUsers?.map((u) => ({
            id: u.userId,
            name: u.user?.name || "User",
          })) || []}
          groupTitle={commentPanel.title || groups.find(g => g.id === commentPanel.groupId)?.title || "Element"}
          projectId={projectId}
          projectMembers={project?.members || []}
          onClose={() => setCommentPanel(null)}
        />
      )}

      {/* Voting Mode Toggle Button
      <button
        onClick={handleToggleVotingMode}
        aria-label={isVotingMode ? `Voting mode on - ${userVotes.length} votes cast` : "Start voting mode"}
        className={`fixed top-16 right-4 z-20 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
          isVotingMode
            ? "bg-violet-600 text-white shadow-lg"
            : "bg-white border border-gray-200 text-gray-900 hover:bg-gray-50 shadow-sm"
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
      </button> */}

      {/* Side Panels Toggle */}
      <div className="fixed top-16 left-4 z-20 flex flex-col gap-2">
        {/* <button
          onClick={() => setActivePanel(activePanel === "aiAssistant" ? null : "aiAssistant")}
          aria-label="AI Assistant panel"
          aria-pressed={activePanel === "aiAssistant"}
          className={`p-3 rounded-lg transition-all duration-200 shadow-sm ${
            activePanel === "aiAssistant"
              ? "bg-violet-600 text-white"
              : "bg-white border border-gray-200 text-gray-900 hover:bg-gray-50"
          }`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </button> */}
        
        {/* <button
          onClick={() => setActivePanel(activePanel === "analytics" ? null : "analytics")}
          aria-label="Analytics panel"
          aria-pressed={activePanel === "analytics"}
          className={`p-3 rounded-lg transition-all duration-200 shadow-sm ${
            activePanel === "analytics"
              ? "bg-violet-600 text-white"
              : "bg-white border border-gray-200 text-gray-900 hover:bg-gray-50"
          }`}
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18 20V10M12 20V4M6 20v-6" />
          </svg>
        </button> */}
        
        {/* <button
          onClick={() => setActivePanel(activePanel === "persona" ? null : "persona")}
          aria-label="Personas panel"
          aria-pressed={activePanel === "persona"}
          className={`p-3 rounded-lg transition-all duration-200 shadow-sm ${
            activePanel === "persona"
              ? "bg-violet-600 text-white"
              : "bg-white border border-gray-200 text-gray-900 hover:bg-gray-50"
          }`}
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </button> */}
      </div>

      {/* Voting Config Modal */}
      <VotingConfigModal
        open={showVotingConfig}
        onOpenChange={setShowVotingConfig}
        onStartVoting={(config) => {
          voting.startVoting(config);
        }}
        clusterCount={groups.length || 3}
      />
    </div>
  );
}
