"use client";

import { useCallback } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { AffinityGroup, Insight } from "@/types";
import { toast } from "sonner";

interface UseAffinityMapHandlersProps {
  affinityMap: {
    _id: Id<"affinityMaps">;
    groups: AffinityGroup[];
  } | null | undefined;

  userId: string | null | undefined;
  userName: string;

  // Mutations
  addGroup: (args: { mapId: Id<"affinityMaps">; title: string; color: string; position: { x: number; y: number } }) => Promise<string>;
  moveGroup: (args: { mapId: Id<"affinityMaps">; groupId: string; position: { x: number; y: number } }) => Promise<unknown>;
  addInsightToGroup: (args: { mapId: Id<"affinityMaps">; groupId: string; insightId: Id<"insights"> }) => Promise<unknown>;
  updateGroupTitle: (args: { mapId: Id<"affinityMaps">; groupId: string; title: string }) => Promise<unknown>;
  removeGroup: (args: { mapId: Id<"affinityMaps">; groupId: string }) => Promise<unknown>;
  removeInsightFromGroup: (args: { mapId: Id<"affinityMaps">; groupId: string; insightId: Id<"insights"> }) => Promise<unknown>;
  replaceAllGroups: (args: { mapId: Id<"affinityMaps">; groups: AffinityGroup[] }) => Promise<unknown>;
  createManualInsight: (args: { projectId: Id<"projects">; text: string; type: string }) => Promise<unknown>;

  // Notifications
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

  // Activity
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
  projectId,
}: UseAffinityMapHandlersProps) {
  const handleGroupCreate = useCallback(
    async (position: { x: number; y: number }) => {
      if (!affinityMap || !userId) return;

      try {
        const groupId = await addGroup({
          mapId: affinityMap._id,
          title: "New Theme",
          color: "#F59E0B",
          position,
        });

        activity.logGroupCreated(affinityMap._id, groupId, "New Theme");

        await broadcastGroupCreated({
          mapId: affinityMap._id,
          groupId,
          groupTitle: "New Theme",
          createdByUserId: userId,
          createdByUserName: userName,
        });
      } catch (error) {
        console.error("Failed to create group:", error);
      }
    },
    [affinityMap, userId, userName, addGroup, activity, broadcastGroupCreated]
  );

  const handleGroupMove = useCallback(
    async (groupId: string, position: { x: number; y: number }) => {
      if (!affinityMap) return;

      const group = affinityMap.groups.find((g) => g.id === groupId);
      const oldPosition = group?.position;

      try {
        await moveGroup({
          mapId: affinityMap._id,
          groupId,
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
        console.error("Failed to move group:", error);
        toast.error("Failed to move group");
      }
    },
    [affinityMap, moveGroup, activity]
  );

  const handleInsightDrop = useCallback(
    async (insightId: string, targetGroupId: string) => {
      if (!affinityMap || !userId) return;

      const targetGroup = affinityMap.groups.find(
        (g) => g.id === targetGroupId
      );
      const sourceGroup = affinityMap.groups.find((g) =>
        g.insightIds.includes(insightId)
      );

      try {
        await addInsightToGroup({
          mapId: affinityMap._id,
          groupId: targetGroupId,
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
      addInsightToGroup,
      activity,
      broadcastInsightMoved,
    ]
  );

  const handleManualInsightCreate = useCallback(
    async (text: string, type: Insight["type"]) => {
      try {
        await createManualInsight({
          projectId: projectId as Id<"projects">,
          text,
          type,
        });
        toast.success("Manual insight created!");
      } catch (error) {
        console.error("Failed to create manual insight:", error);
        toast.error("Failed to create insight");
      }
    },
    [projectId, createManualInsight]
  );

  const handleGroupTitleUpdate = useCallback(
    async (groupId: string, title: string) => {
      if (!affinityMap) return;

      const group = affinityMap.groups.find((g) => g.id === groupId);
      const oldTitle = group?.title;

      try {
        await updateGroupTitle({
          mapId: affinityMap._id,
          groupId,
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
        console.error("Failed to update group title:", error);
      }
    },
    [affinityMap, updateGroupTitle, activity]
  );

  const handleGroupDelete = useCallback(
    async (groupId: string) => {
      if (!affinityMap) return;

      const group = affinityMap.groups.find((g) => g.id === groupId);

      try {
        if (group) {
          activity.logGroupDeleted(
            affinityMap._id,
            groupId,
            group.title
          );
        }

        await removeGroup({
          mapId: affinityMap._id,
          groupId,
        });
      } catch (error) {
        console.error("Failed to delete group:", error);
      }
    },
    [affinityMap, removeGroup, activity]
  );

  const handleInsightRemoveFromGroup = useCallback(
    async (insightId: string, groupId: string) => {
      if (!affinityMap) return;

      const group = affinityMap.groups.find((g) => g.id === groupId);

      try {
        await removeInsightFromGroup({
          mapId: affinityMap._id,
          groupId,
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
        console.error("Failed to remove insight from group:", error);
      }
    },
    [affinityMap, removeInsightFromGroup, activity]
  );

  const handleGroupsReplace = useCallback(
    async (newGroups: AffinityGroup[]) => {
      if (!affinityMap) return;

      try {
        const convexGroups = newGroups.map((group) => ({
          ...group,
          insightIds: group.insightIds as string[],
        }));

        await replaceAllGroups({
          mapId: affinityMap._id,
          groups: convexGroups,
        });
      } catch (error) {
        console.error("Failed to replace groups:", error);
        toast.error("Failed to undo/redo");
      }
    },
    [affinityMap, replaceAllGroups]
  );

  return {
    handleGroupCreate,
    handleGroupMove,
    handleInsightDrop,
    handleManualInsightCreate,
    handleGroupTitleUpdate,
    handleGroupDelete,
    handleInsightRemoveFromGroup,
    handleGroupsReplace,
  };
}
