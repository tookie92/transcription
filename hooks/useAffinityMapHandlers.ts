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

  broadcastGroupCreated: (args: {
    mapId: Id<"affinityMaps">;
    groupId: string;
    groupTitle: string;
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

  activity: {
    logGroupCreated: (mapId: Id<"affinityMaps">, groupId: string, groupTitle: string) => void;
    logGroupMoved: (mapId: Id<"affinityMaps">, groupId: string, groupTitle: string, fromPos: { x: number; y: number }, toPos: { x: number; y: number }) => void;
    logGroupRenamed: (mapId: Id<"affinityMaps">, groupId: string, oldTitle: string, newTitle: string) => void;
    logGroupDeleted: (mapId: Id<"affinityMaps">, groupId: string, groupTitle: string) => void;
    logInsightAdded: (mapId: Id<"affinityMaps">, groupId: string, groupTitle: string, insightId: string) => void;
    logInsightRemoved: (mapId: Id<"affinityMaps">, groupId: string, groupTitle: string, insightId: string) => void;
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
  broadcastGroupCreated,
  broadcastInsightMoved,
  activity,
  projectId,
}: UseAffinityMapHandlersProps) {
  const handleGroupCreate = useCallback(
    async (position: { x: number; y: number }, title?: string) => {
      if (!affinityMap || !userId) return "";

      const groupTitle = title || "New Theme";
      const groupColor = "#F59E0B";

      try {
        const groupId = await addCluster({
          mapId: affinityMap._id,
          title: groupTitle,
          color: groupColor,
          position,
        });

        activity.logGroupCreated(affinityMap._id, groupId, groupTitle);

        await broadcastGroupCreated({
          mapId: affinityMap._id,
          groupId,
          groupTitle: groupTitle,
          createdByUserId: userId,
          createdByUserName: userName,
        });

        return groupId;
      } catch (error) {
        console.error("Failed to create cluster:", error);
        return "";
      }
    },
    [affinityMap, userId, userName, addCluster, activity, broadcastGroupCreated]
  );

  const handleGroupMove = useCallback(
    async (groupId: string, position: { x: number; y: number }) => {
      if (!affinityMap) return;

      const group = affinityMap.clusters.find((c) => c.id === groupId);
      const oldPosition = group?.position;

      try {
        await moveCluster({
          mapId: affinityMap._id,
          clusterId: groupId,
          position,
        });

        if (group && oldPosition) {
          activity.logGroupMoved(
            affinityMap._id,
            groupId,
            group.title,
            oldPosition,
            position
          );
        }
      } catch (error) {
        console.error("Failed to move cluster:", error);
        toast.error("Failed to move cluster");
      }
    },
    [affinityMap, moveCluster, activity]
  );

  const handleGroupResize = useCallback(
    async (groupId: string, size: { width: number; height: number }) => {
      if (!affinityMap) return;

      try {
        await resizeCluster({
          mapId: affinityMap._id,
          clusterId: groupId,
          size,
        });
      } catch (error) {
        console.error("Failed to resize cluster:", error);
        toast.error("Failed to resize section");
      }
    },
    [affinityMap, resizeCluster]
  );

  const handleInsightDrop = useCallback(
    async (insightId: string, targetGroupId: string) => {
      if (!affinityMap || !userId) return;

      const targetGroup = affinityMap.clusters.find(
        (c) => c.id === targetGroupId
      );
      const sourceGroup = affinityMap.clusters.find((c) =>
        c.insightIds.includes(insightId)
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
        console.error("Failed to add insight to cluster:", error);
        toast.error("Failed to add insight to cluster");
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
        const insightId = await createManualInsight({
          projectId: projectId as Id<"projects">,
          text,
          type,
        }) as string;

        if (position && insightId) {
          const currentPositions = affinityMap.stickyPositions || {};
          await replaceAllClusters({
            mapId: affinityMap._id,
            clusters: affinityMap.clusters.map(c => ({ ...c })),
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

  const handleGroupTitleUpdate = useCallback(
    async (groupId: string, title: string) => {
      if (!affinityMap) return;

      const group = affinityMap.clusters.find((c) => c.id === groupId);
      const oldTitle = group?.title;

      try {
        await updateClusterTitle({
          mapId: affinityMap._id,
          clusterId: groupId,
          title,
        });

        if (oldTitle && oldTitle !== title) {
          activity.logGroupRenamed(
            affinityMap._id,
            groupId,
            oldTitle,
            title
          );
        }
      } catch (error) {
        console.error("Failed to update cluster title:", error);
      }
    },
    [affinityMap, updateClusterTitle, activity]
  );

  const handleGroupDelete = useCallback(
    async (groupId: string) => {
      if (!affinityMap) return;

      const group = affinityMap.clusters.find((c) => c.id === groupId);

      try {
        if (group) {
          activity.logGroupDeleted(
            affinityMap._id,
            groupId,
            group.title
          );
        }

        await removeCluster({
          mapId: affinityMap._id,
          clusterId: groupId,
        });
      } catch (error) {
        console.error("Failed to delete cluster:", error);
      }
    },
    [affinityMap, removeCluster, activity]
  );

  const handleInsightRemoveFromGroup = useCallback(
    async (insightId: string, groupId: string) => {
      if (!affinityMap) return;

      const group = affinityMap.clusters.find((c) => c.id === groupId);

      try {
        await removeInsightFromCluster({
          mapId: affinityMap._id,
          clusterId: groupId,
          insightId: insightId as Id<"insights">,
        });

        if (group) {
          activity.logInsightRemoved(
            affinityMap._id,
            groupId,
            group.title,
            insightId
          );
        }
      } catch (error) {
        console.error("Failed to remove insight from cluster:", error);
      }
    },
    [affinityMap, removeInsightFromCluster, activity]
  );

  const handleGroupsReplace = useCallback(
    async (newGroups: AffinityCluster[]) => {
      if (!affinityMap) return;

      try {
        const convexClusters = newGroups.map((cluster) => ({
          ...cluster,
          insightIds: cluster.insightIds as string[],
        }));

        await replaceAllClusters({
          mapId: affinityMap._id,
          clusters: convexClusters,
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
    handleGroupCreate,
    handleGroupMove,
    handleGroupResize,
    handleInsightDrop,
    handleManualInsightCreate,
    handleGroupTitleUpdate,
    handleGroupDelete,
    handleInsightRemoveFromGroup,
    handleInsightDelete,
    handleGroupsReplace,
  };
}
