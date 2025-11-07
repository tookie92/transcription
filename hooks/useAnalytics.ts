// hooks/useAnalytics.ts
import { useMemo } from "react";
import { AffinityGroup, Insight } from "@/types";

export function useAnalytics(groups: AffinityGroup[], insights: Insight[]) {
  const metrics = useMemo(() => {
    const totalInsights = insights.length;
    const groupedInsights = groups.reduce((sum, group) => sum + group.insightIds.length, 0);
    const ungroupedInsights = totalInsights - groupedInsights;

    // Distribution par type
    const insightTypes = insights.reduce((acc, insight) => {
      acc[insight.type] = (acc[insight.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Taille des groupes
    const groupSizes = groups.reduce((acc, group) => {
      const size = group.insightIds.length;
      if (size <= 3) acc.small++;
      else if (size <= 7) acc.medium++;
      else acc.large++;
      return acc;
    }, { small: 0, medium: 0, large: 0 });

    // Densité spatiale
    const spatialDensity = calculateSpatialDensity(groups);

    return {
      totalInsights,
      groupedInsights,
      ungroupedInsights,
      completionRate: totalInsights > 0 ? (groupedInsights / totalInsights) * 100 : 0,
      insightTypes,
      groupSizes,
      groupCount: groups.length,
      avgGroupSize: groups.length > 0 ? groupedInsights / groups.length : 0,
      spatialDensity
    };
  }, [groups, insights]);

  return metrics;
}

function calculateSpatialDensity(groups: AffinityGroup[]): number {
  if (groups.length < 2) return 0;
  
  // Calcul simple de la densité basée sur la distance moyenne
  let totalDistance = 0;
  let pairCount = 0;

  for (let i = 0; i < groups.length; i++) {
    for (let j = i + 1; j < groups.length; j++) {
      const dx = groups[i].position.x - groups[j].position.x;
      const dy = groups[i].position.y - groups[j].position.y;
      totalDistance += Math.sqrt(dx * dx + dy * dy);
      pairCount++;
    }
  }

  const avgDistance = totalDistance / pairCount;
  // Densité inversement proportionnelle à la distance moyenne
  return avgDistance > 0 ? 1000 / avgDistance : 100;
}