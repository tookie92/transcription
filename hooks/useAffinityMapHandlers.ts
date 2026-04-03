"use client";

import { useCallback } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { AffinityCluster, Insight } from "@/types";
import { toast } from "sonner";

interface UseAffinityMapHandlersProps {
  affinityMap: {
    _id: Id<"affinityMaps">;
    clusters: AffinityCluster[];
    stickyPositions?: Record<string, { x: number; y: number }>;
  } | null | undefined;

  userId: string | null | undefined;
  userName: string;

  // Mutations
  addCluster: (args: { mapId: Id<"affinityMaps">; title: string; color: string; position: { x: number; y: number } }) => Promise<string>;
  moveCluster: (args: { mapId: Id<"affinityMaps">; clusterId: string; position: { x: number; y: number } }) => Promise<unknown>;
  resizeCluster: (args: { mapId: Id<"affinityMaps">; clusterId: string; size: { width: number; height: number } }) => Promise<unknown>;
  addInsightToCluster: (args: { mapId: Id<"affinityMaps">; clusterId: string; insightId: Id<"insights"> }) => Promise<unknown>;
  updateClusterTitle: (args: { mapId: Id<"affinityMaps">; clusterId: string; title: string }) => Promise<unknown>;
  removeCluster: (args: { mapId: Id<"affinityMaps">; clusterId: string }) => Promise<unknown>;
  removeInsightFromCluster: (args: { mapId: Id<"affinityMaps">; clusterId: string; insightId: Id<"insights"> }) => Promise<unknown>;
  replaceAllClusters: (args: { mapId: Id<"affinityMaps">; clusters: AffinityCluster[]; stickyPositions?: Record<string, { x: number; y: number }> }) => Promise<unknown>;
  createManualInsight: (args: { projectId: Id<"projects">; text: string; type: string }) => Promise<string>;
  deleteInsight: (args: { insightId: Id<"insights"> }) => Promise<unknown>;
  updateStickyPositions: (args: { mapId: Id<"affinityMaps">; positions: Record<string, { x: number; y: number }> }) => Promise<unknown>;

  // Notifications
  broadcastClusterCreated: (args: {
    mapId: Id<"affinityMaps">;
    clusterId: string;
    clusterTitle: string;
    createdByUserId: string;
    createdByUserName: string;
  }) => Promise<unknown>;
  broadcastInsightMoved: (args: {
    mapId: Id<"affinityMaps">;
    fromGroupId: string;
    toGroupId: string;
    fromGroupTitle: string;
    toGroupTitle: string;
    movedByUserId: string;
    movedByUserName: string;
  }) => Promise<unknown>;

  // Activity
  activity: {
    logGroupCreated: (mapId: Id<"affinityMaps">, clusterId: string, clusterTitle: string) => void;
    logGroupMoved: (mapId: Id<"affinityMaps">, clusterId: string, clusterTitle: string, fromPos: { x: number; y: number }, toPos: { x: number; y: number }) => void;
    logGroupRenamed: (mapId: Id<"affinityMaps">, clusterId: string, oldTitle: string, newTitle: string) => void;
    logGroupDeleted: (mapId: Id<"affinityMaps">, clusterId: string, clusterTitle: string) => void;
    logInsightAdded: (mapId: Id<"affinityMaps">, clusterId: string, clusterTitle: string, insightId: string) => void;
    logInsightRemoved: (mapId: Id<"affinityMaps">, clusterId: string, clusterTitle: string, insightId: string) => void;
    logInsightMoved: (mapId: Id<"affinityMaps">, fromGroupId: string, toGroupId: string, fromGroupTitle: string, toGroupTitle: string, insightId: string) => void;
  };

  projectId: Id<"projects">;
}

export function useAffinityMapHandlers({
  affinityMap,
  userId,
  userName,
  addCluster,
  moveCluster,
  resizeCluster,
  addInsightToCluster,
  updateClusterTitle,
  removeCluster,
  removeInsightFromCluster,
  replaceAllClusters,
  createManualInsight,
  deleteInsight,
  updateStickyPositions,
  broadcastClusterCreated,
  broadcastInsightMoved,
  activity,
  projectId,
}: UseAffinityMapHandlersProps) {
  const handleClusterCreate = useCallback(
    async (position: { x: number; y: number }, title?: string) => {
      if (!affinityMap || !userId) return "";

      const clusterTitle = title || "New Theme";
      const clusterColor = "#F59E0B";

      try {
        const clusterId = await addCluster({
          mapId: affinityMap._id,
          title: clusterTitle,
          color: clusterColor,
          position,
        });

        activity.logGroupCreated(affinityMap._id, clusterId, clusterTitle);

        await broadcastClusterCreated({
          mapId: affinityMap._id,
          clusterId,
          clusterTitle: clusterTitle,
          createdByUserId: userId,
          createdByUserName: userName,
        });

        return clusterId;
      } catch (error) {
        console.error("Failed to create group:", error);
        return "";
      }
    },
    [affinityMap, userId, userName, addCluster, activity, broadcastClusterCreated]
  );

  const handleClusterMove = useCallback(
    async (clusterId: string, position: { x: number; y: number }) => {
      if (!affinityMap) return;

      const group = affinityMap.clusters.find((g) => g.id === clusterId);
      const oldPosition = group?.position;

      try {
        await moveCluster({
          mapId: affinityMap._id,
          clusterId,
          position,
        });

        if (group && oldPosition) {
          activity.logGroupMoved(
            affinityMap._id,
            clusterId,
            group.title,
            oldPosition,
            position
          );
        }
      } catch (error) {
        console.error("Failed to move group:", error);
        toast.error("Failed to move group");
      }
    },
    [affinityMap, moveCluster, activity]
  );

  const handleClusterResize = useCallback(
    async (clusterId: string, size: { width: number; height: number }) => {
      if (!affinityMap) return;

      try {
        await resizeCluster({
          mapId: affinityMap._id,
          clusterId,
          size,
        });
      } catch (error) {
        console.error("Failed to resize group:", error);
        toast.error("Failed to resize section");
      }
    },
    [affinityMap, resizeCluster]
  );

  const handleInsightDrop = useCallback(
    async (insightId: string, targetGroupId: string) => {
      if (!affinityMap || !userId) return;

      const targetGroup = affinityMap.clusters.find(
        (g) => g.id === targetGroupId
      );
      const sourceGroup = affinityMap.clusters.find((g) =>
        g.insightIds.includes(insightId)
      );

      try {
        await addInsightToCluster({
          mapId: affinityMap._id,
          clusterId: targetGroupId,
          insightId: insightId as Id<"insights">,
        });

        if (targetGroup) {
          if (sourceGroup && sourceGroup.id !== targetGroupId) {
            activity.logInsightMoved(
              affinityMap._id,
              sourceGroup.id,
              targetGroupId,
              sourceGroup.title,
              targetGroup.title,
              insightId
            );

            await broadcastInsightMoved({
              mapId: affinityMap._id,
              fromGroupId: sourceGroup.id,
              toGroupId: targetGroupId,
              fromGroupTitle: sourceGroup.title,
              toGroupTitle: targetGroup.title,
              movedByUserId: userId,
              movedByUserName: userName,
            });
          } else {
            activity.logInsightAdded(
              affinityMap._id,
              targetGroupId,
              targetGroup.title,
              insightId
            );
          }
        }
      } catch (error) {
        console.error("Failed to add insight to group:", error);
        toast.error("Failed to add insight to group");
      }
    },
    [
      affinityMap,
      userId,
      userName,
      addInsightToCluster,
      activity,
      broadcastInsightMoved,
    ]
  );

  const handleManualInsightCreate = useCallback(
    async (text: string, type: Insight["type"], position?: { x: number; y: number }) => {
      if (!affinityMap) return;
      
      try {
        // Create the insight
        const insightId = await createManualInsight({
          projectId: projectId as Id<"projects">,
          text,
          type,
        }) as string;

        // If position provided, save it in stickyPositions
        if (position && insightId) {
          // Get current stickyPositions from the map
          const currentPositions = affinityMap.stickyPositions || {};
          await replaceAllClusters({
            mapId: affinityMap._id,
            clusters: affinityMap.clusters.map(g => ({ ...g })),
            stickyPositions: {
              ...currentPositions,
              [insightId]: position,
            },
          });
        }
        
        toast.success("Manual insight created!");
      } catch (error) {
        console.error("Failed to create manual insight:", error);
        toast.error("Failed to create insight");
      }
    },
    [projectId, createManualInsight, affinityMap, replaceAllClusters]
  );

  const handleClusterTitleUpdate = useCallback(
    async (clusterId: string, title: string) => {
      if (!affinityMap) return;

      const group = affinityMap.clusters.find((g) => g.id === clusterId);
      const oldTitle = group?.title;

      try {
        await updateClusterTitle({
          mapId: affinityMap._id,
          clusterId,
          title,
        });

        if (oldTitle && oldTitle !== title) {
          activity.logGroupRenamed(
            affinityMap._id,
            clusterId,
            oldTitle,
            title
          );
        }
      } catch (error) {
        console.error("Failed to update group title:", error);
      }
    },
    [affinityMap, updateClusterTitle, activity]
  );

  const handleClusterDelete = useCallback(
    async (clusterId: string) => {
      if (!affinityMap) return;

      const group = affinityMap.clusters.find((g) => g.id === clusterId);

      try {
        if (group) {
          activity.logGroupDeleted(
            affinityMap._id,
            clusterId,
            group.title
          );
        }

        await removeCluster({
          mapId: affinityMap._id,
          clusterId,
        });
      } catch (error) {
        console.error("Failed to delete group:", error);
      }
    },
    [affinityMap, removeCluster, activity]
  );

  const handleInsightRemoveFromCluster = useCallback(
    async (insightId: string, clusterId: string) => {
      if (!affinityMap) return;

      const group = affinityMap.clusters.find((g) => g.id === clusterId);

      try {
        await removeInsightFromCluster({
          mapId: affinityMap._id,
          clusterId,
          insightId: insightId as Id<"insights">,
        });

        if (group) {
          activity.logInsightRemoved(
            affinityMap._id,
            clusterId,
            group.title,
            insightId
          );
        }
      } catch (error) {
        console.error("Failed to remove insight from group:", error);
      }
    },
    [affinityMap, removeInsightFromCluster, activity]
  );

  const handleClustersReplace = useCallback(
    async (newGroups: AffinityCluster[]) => {
      if (!affinityMap) return;

      try {
        const convexGroups = newGroups.map((group) => ({
          ...group,
          insightIds: group.insightIds as string[],
        }));

        await replaceAllClusters({
          mapId: affinityMap._id,
          clusters: convexGroups,
        });
      } catch (error) {
        console.error("Failed to replace clusters:", error);
        toast.error("Failed to undo/redo");
      }
    },
    [affinityMap, replaceAllClusters]
  );

  const handleInsightDelete = useCallback(
    async (insightId: string) => {
      if (!affinityMap) return;

      try {
        await deleteInsight({
          insightId: insightId as Id<"insights">,
        });
      } catch (error) {
        console.error("Failed to delete insight:", error);
        toast.error("Failed to delete note");
      }
    },
    [affinityMap, deleteInsight]
  );

  return {
    handleClusterCreate,
    handleClusterMove,
    handleClusterResize,
    handleInsightDrop,
    handleManualInsightCreate,
    handleClusterTitleUpdate,
    handleClusterDelete,
    handleInsightRemoveFromCluster,
    handleInsightDelete,
    handleClustersReplace,
  };
}
