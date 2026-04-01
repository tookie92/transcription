"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { AffinityGroup, Insight } from "@/types";
import { useEffect } from "react";

export function useAffinityMapData(projectId: Id<"projects">) {
  // Validate that projectId is not an affinityMap ID
  // This is a defensive check to prevent errors from wrong IDs in URL
  const isValidProjectId = projectId && !projectId.includes("affinity");
  
  // Queries - skip if projectId is invalid
  const project = useQuery(
    api.projects.getById, 
    isValidProjectId ? { projectId } : "skip"
  );
  const insightsData = useQuery(
    api.insights.getByProject, 
    isValidProjectId ? { projectId } : "skip"
  );
  const affinityMap = useQuery(
    api.affinityMaps.getCurrent, 
    isValidProjectId ? { projectId } : "skip"
  );

  // Mutations
  const createAffinityMap = useMutation(api.affinityMaps.create);
  const addCluster = useMutation(api.affinityMaps.addCluster);
  const moveCluster = useMutation(api.affinityMaps.moveCluster);
  const resizeCluster = useMutation(api.affinityMaps.resizeCluster);
  const addInsightToCluster = useMutation(api.affinityMaps.addInsightToCluster);
  const updateClusterTitle = useMutation(api.affinityMaps.updateClusterTitle);
  const removeCluster = useMutation(api.affinityMaps.removeCluster);
  const removeInsightFromCluster = useMutation(api.affinityMaps.removeInsightFromCluster);
  const replaceAllClusters = useMutation(api.affinityMaps.replaceAllClusters);
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
  const clusters: AffinityGroup[] =
    affinityMap?.clusters.map((cluster) => ({
      id: cluster.id,
      title: cluster.title,
      color: cluster.color,
      position: cluster.position,
      insightIds: cluster.insightIds as string[],
      size: cluster.size || { width: 400, height: 300 },
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
    clusters,
    insights,
    activities,
    insightsData,
    stickyPositions,

    // Mutations
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
    updateStickyPositions: updateStickyPositionsMutation,

    // Notifications
    broadcastGroupCreated,
    broadcastInsightMoved,
  };
}
