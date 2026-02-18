// components/AffinityMapWorkspace.tsx - REFACTORED
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { AffinityGroup, Insight, ActivePanel } from "@/types";
import { toast } from "sonner";
import AffinityCanvas from "./AffinityCanvas";
import { useAuth, useUser } from "@clerk/nextjs";

// Extracted hooks
import { useAffinityMapData } from "@/hooks/useAffinityMapData";
import { useAffinityMapHandlers } from "@/hooks/useAffinityMapHandlers";

// Extracted components
import { WorkspaceHeader } from "./workspace/WorkspaceHeader";
import { WorkspaceFooter } from "./workspace/WorkspaceFooter";

// Activity
import { useActivity } from "@/hooks/useActivity";
import { ActivityPanel } from "./ActivityPanel";

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
    addGroup, moveGroup, addInsightToGroup, updateGroupTitle, 
    removeGroup, removeInsightFromGroup, replaceAllGroups, createManualInsight,
    broadcastGroupCreated, broadcastInsightMoved
  } = useAffinityMapData(projectId);

  // ==================== ACTIVITY ====================
  const activity = useActivity();
  const [showActivityPanel, setShowActivityPanel] = useState(false);
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);

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
    createManualInsight,
    broadcastGroupCreated,
    broadcastInsightMoved,
    activity,
  });

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
    <div className="h-full flex flex-col">
      {/* Header */}
      <WorkspaceHeader
        projectId={projectId}
        projectName={project.name}
        mapName={affinityMap?.name}
        userId={userId || undefined}
        mapId={affinityMap?._id}
        showActivityPanel={showActivityPanel}
        setShowActivityPanel={setShowActivityPanel}
        activePanel={activePanel}
        setActivePanel={setActivePanel}
        activities={activities}
      />

      {/* Main Workspace */}
      <div className="flex-1 relative bg-white overflow-hidden">
        <AffinityCanvas
          activePanel={activePanel}
          setActivePanel={setActivePanel}
          groups={groups}
          insights={insights}
          projectId={projectId}
          projectInfo={project ? { name: project.name, description: project.description } : undefined}
          mapId={affinityMap?._id || ""}
          onGroupMove={handlers.handleGroupMove}
          onGroupCreate={handlers.handleGroupCreate}
          onInsightDrop={handlers.handleInsightDrop}
          onInsightRemoveFromGroup={handlers.handleInsightRemoveFromGroup}
          onGroupDelete={handlers.handleGroupDelete}
          onGroupTitleUpdate={handlers.handleGroupTitleUpdate}
          onManualInsightCreate={handlers.handleManualInsightCreate}
          onGroupsReplace={handlers.handleGroupsReplace}
        />

        {/* Activity Panel */}
        {showActivityPanel && affinityMap && (
          <ActivityPanel
            mapId={affinityMap._id}
            isOpen={showActivityPanel}
            onClose={() => setShowActivityPanel(false)}
          />
        )}
      </div>

      {/* Footer */}
      <WorkspaceFooter
        groupCount={affinityMap?.groups.length}
        insightCount={insightsData?.length}
        hasMap={!!affinityMap}
      />
    </div>
  );
}