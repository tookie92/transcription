// hooks/useActivity.ts - VERSION AVEC TYPES STRICTS

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ActivityDetails } from "@/types";
import { useCallback } from "react";

interface UseActivityReturn {
  logGroupCreated: (mapId: Id<"affinityMaps">, groupId: string, groupTitle: string) => void;
  logGroupMoved: (mapId: Id<"affinityMaps">, groupId: string, groupTitle: string, fromPos: { x: number; y: number }, toPos: { x: number; y: number }) => void;
  logGroupRenamed: (mapId: Id<"affinityMaps">, groupId: string, oldTitle: string, newTitle: string) => void;
  logGroupDeleted: (mapId: Id<"affinityMaps">, groupId: string, groupTitle: string) => void;
  logInsightAdded: (mapId: Id<"affinityMaps">, groupId: string, groupTitle: string, insightId: string) => void;
  logInsightRemoved: (mapId: Id<"affinityMaps">, groupId: string, groupTitle: string, insightId: string) => void;
  logInsightMoved: (mapId: Id<"affinityMaps">, fromGroupId: string, toGroupId: string, fromGroupTitle: string, toGroupTitle: string, insightId: string) => void;
  logCommentAdded: (mapId: Id<"affinityMaps">, groupId: string, groupTitle: string) => void;
  logUserMentioned: (mapId: Id<"affinityMaps">, groupId: string, groupTitle: string, mentionedUserId: string, mentionedUserName: string) => void;
}

export function useActivity(): UseActivityReturn {
    const logActivity = useMutation(api.activityLog.logActivity);
  
  const logGroupCreated = useCallback((mapId: Id<"affinityMaps">, groupId: string, groupTitle: string) => {
    if (!mapId) return; // 🎯 IMPORTANT : vérifier que mapId est défini
    
    return logActivity({
      mapId,
      action: "group_created",
      targetId: groupId,
      targetName: groupTitle,
    });
  }, [logActivity]);
  


  const logGroupMoved = (
    mapId: Id<"affinityMaps">, 
    groupId: string, 
    groupTitle: string, 
    fromPos: { x: number; y: number }, 
    toPos: { x: number; y: number }
  ) => {
    const details: ActivityDetails = {
      from: fromPos,
      to: toPos,
    };

    logActivity({
      mapId,
      action: "group_moved",
      targetId: groupId,
      targetName: groupTitle,
      details,
    });
  };

  const logGroupRenamed = (
    mapId: Id<"affinityMaps">, 
    groupId: string, 
    oldTitle: string, 
    newTitle: string
  ) => {
    const details: ActivityDetails = {
      from: oldTitle,
      to: newTitle,
    };

    logActivity({
      mapId,
      action: "group_renamed",
      targetId: groupId,
      targetName: newTitle,
      details,
    });
  };

  const logGroupDeleted = (mapId: Id<"affinityMaps">, groupId: string, groupTitle: string) => {
    logActivity({
      mapId,
      action: "group_deleted",
      targetId: groupId,
      targetName: groupTitle,
    });
  };

  const logInsightAdded = (
    mapId: Id<"affinityMaps">, 
    groupId: string, 
    groupTitle: string, 
    insightId: string
  ) => {
    const details: ActivityDetails = {
      insightId,
    };

    logActivity({
      mapId,
      action: "insight_added",
      targetId: groupId,
      targetName: groupTitle,
      details,
    });
  };

  const logInsightRemoved = (
    mapId: Id<"affinityMaps">, 
    groupId: string, 
    groupTitle: string, 
    insightId: string
  ) => {
    const details: ActivityDetails = {
      insightId,
    };

    logActivity({
      mapId,
      action: "insight_removed",
      targetId: groupId,
      targetName: groupTitle,
      details,
    });
  };

  const logInsightMoved = (
    mapId: Id<"affinityMaps">, 
    fromGroupId: string, 
    toGroupId: string, 
    fromGroupTitle: string, 
    toGroupTitle: string, 
    insightId: string
  ) => {
    const details: ActivityDetails = {
      insightId,
      from: fromGroupTitle,
      to: toGroupTitle,
    };

    logActivity({
      mapId,
      action: "insight_moved",
      targetId: toGroupId,
      targetName: toGroupTitle,
      details,
    });
  };

  const logCommentAdded = (mapId: Id<"affinityMaps">, groupId: string, groupTitle: string) => {
    logActivity({
      mapId,
      action: "comment_added",
      targetId: groupId,
      targetName: groupTitle,
    });
  };

  const logUserMentioned = (
    mapId: Id<"affinityMaps">, 
    groupId: string, 
    groupTitle: string, 
    mentionedUserId: string, 
    mentionedUserName: string
  ) => {
    const details: ActivityDetails = {
      mentionedUserId,
    };

    logActivity({
      mapId,
      action: "user_mentioned",
      targetId: groupId,
      targetName: groupTitle,
      details,
    });
  };

  return {
    logGroupCreated,
    logGroupMoved,
    logGroupRenamed,
    logGroupDeleted,
    logInsightAdded,
    logInsightRemoved,
    logInsightMoved,
    logCommentAdded,
    logUserMentioned,
  };
}