"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { AffinityGroup, Insight } from "@/types";
import { useEffect } from "react";

export function useAffinityMapData(projectId: Id<"projects">) {
  // Queries
  const project = useQuery(api.projects.getById, { projectId });
  const insightsData = useQuery(api.insights.getByProject, { projectId });
  const affinityMap = useQuery(api.affinityMaps.getCurrent, { projectId });

  // Mutations
  const createAffinityMap = useMutation(api.affinityMaps.create);
  const addGroup = useMutation(api.affinityMaps.addGroup);
  const moveGroup = useMutation(api.affinityMaps.moveGroup);
  const resizeGroup = useMutation(api.affinityMaps.resizeGroup);
  const addInsightToGroup = useMutation(api.affinityMaps.addInsightToGroup);
  const updateGroupTitle = useMutation(api.affinityMaps.updateGroupTitle);
  const removeGroup = useMutation(api.affinityMaps.removeGroup);
  const removeInsightFromGroup = useMutation(api.affinityMaps.removeInsightFromGroup);
  const replaceAllGroups = useMutation(api.affinityMaps.replaceAllGroups);
  const createManualInsight = useMutation(api.affinityMaps.createManualInsight);
  const deleteInsight = useMutation(api.insights.deleteInsight);

  // Activities query
  const activities = useQuery(
    api.activityLog.getActivityForMap,
    affinityMap ? { mapId: affinityMap._id, limit: 10 } : "skip"
  );

  // Notification mutations
  const broadcastGroupCreated = useMutation(api.notificationService.broadcastGroupCreated);
  const broadcastInsightMoved = useMutation(api.notificationService.broadcastInsightMoved);

  // Auto-create map
  useEffect(() => {
    if (project && !affinityMap) {
      createAffinityMap({
        projectId: projectId as Id<"projects">,
        name: `${project.name} Affinity Map`,
        description: `Affinity map for ${project.name}`,
      }).catch(console.error);
    }
  }, [project, affinityMap, projectId, createAffinityMap]);

  // Mutations
  const updateStickyPositionsMutation = useMutation(api.affinityMaps.updateStickyPositions);

  // Transform data
  const groups: AffinityGroup[] =
    affinityMap?.groups.map((group) => ({
      id: group.id,
      title: group.title,
      color: group.color,
      position: group.position,
      insightIds: group.insightIds as string[],
      size: group.size || { width: 400, height: 300 },
    })) || [];

  // Sticky positions on canvas
  const stickyPositions: Record<string, { x: number; y: number }> =
    affinityMap?.stickyPositions || {};

  const insights: Insight[] =
    insightsData?.map((insight) => ({
      id: insight._id,
      interviewId: insight.interviewId,
      projectId: insight.projectId,
      type: insight.type,
      text: insight.text,
      timestamp: insight.timestamp,
      source: insight.source,
      createdBy: insight.createdBy,
      createdByName: insight.createdByName,
      createdAt: new Date(insight.createdAt).toISOString(),
      tags: insight.tags,
      priority: insight.priority,
    })) || [];

  return {
    project,
    affinityMap,
    groups,
    insights,
    activities,
    insightsData,
    stickyPositions,

    // Mutations
    addGroup,
    moveGroup,
    resizeGroup,
    addInsightToGroup,
    updateGroupTitle,
    removeGroup,
    removeInsightFromGroup,
    replaceAllGroups,
    createManualInsight,
    deleteInsight,
    updateStickyPositions: updateStickyPositionsMutation,

    // Notifications
    broadcastGroupCreated,
    broadcastInsightMoved,
  };
}
