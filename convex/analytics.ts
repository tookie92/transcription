import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Types pour l'analyse de clusters
interface ClusterGroup {
  id: string;
  title: string;
  color: string;
  position: { x: number; y: number };
  insightIds: Id<"insights">[];
}

interface Connection {
  _id: Id<"groupConnections">;
  sourceGroupId: string;
  targetGroupId: string;
  type: "related" | "hierarchy" | "dependency" | "contradiction";
  strength?: number;
}

interface ClusterAnalysis {
  groupIds: string[];
  size: number;
  connectionCount: number;
  centroid: { x: number; y: number };
}

interface ConnectionRecommendation {
  sourceGroupId: string;
  targetGroupId: string;
  score: number;
  reason: string;
  suggestedType: "related" | "hierarchy" | "dependency" | "contradiction";
}

// 🆕 QUERIES ANALYTIQUES POUR LES CONNECTIONS
export const getConnectionAnalytics = query({
  args: {
    mapId: v.id("affinityMaps"),
  },
  handler: async (ctx, args): Promise<{
    totalConnections: number;
    connectedGroups: number;
    connectionRate: number;
    typeDistribution: Record<string, number>;
    averageStrength: number;
    mostConnectedGroups: Array<{
      groupId: string;
      title: string;
      color: string;
      connectionCount: number;
      insightsCount: number;
    }>;
    clusters: ClusterAnalysis[];
    density: number;
  } | null> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    // Récupérer la map et ses connections
    const map = await ctx.db.get(args.mapId);
    if (!map) return null;

    const connections = await ctx.db
      .query("groupConnections")
      .withIndex("by_map", q => q.eq("mapId", args.mapId))
      .collect();

    // Métriques de base
    const totalConnections = connections.length;
    const connectedGroups = new Set(
      connections.flatMap(conn => [conn.sourceGroupId, conn.targetGroupId])
    ).size;

    // Distribution par type
    const typeDistribution = connections.reduce((acc, conn) => {
      acc[conn.type] = (acc[conn.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Force moyenne
    const averageStrength = connections.length > 0 
      ? connections.reduce((sum, conn) => sum + (conn.strength || 3), 0) / connections.length
      : 0;

    // Groupes les plus connectés
    const groupConnections = map.groups.map(group => {
      const connectionCount = connections.filter(
        conn => conn.sourceGroupId === group.id || conn.targetGroupId === group.id
      ).length;
      
      return {
        groupId: group.id,
        title: group.title,
        color: group.color,
        connectionCount,
        insightsCount: group.insightIds.length,
      };
    }).sort((a, b) => b.connectionCount - a.connectionCount);

    // Détection de clusters
    const clusters = detectClusters(map.groups, connections);

    return {
      totalConnections,
      connectedGroups,
      connectionRate: map.groups.length > 0 ? (connectedGroups / map.groups.length) * 100 : 0,
      typeDistribution,
      averageStrength: Math.round(averageStrength * 100) / 100,
      mostConnectedGroups: groupConnections.slice(0, 10),
      clusters,
      density: map.groups.length > 0 ? totalConnections / map.groups.length : 0,
    };
  },
});

// 🎯 ALGORITHME DE DÉTECTION DE CLUSTERS TYPÉ
function detectClusters(groups: ClusterGroup[], connections: Connection[]): ClusterAnalysis[] {
  const visited = new Set<string>();
  const clusters: ClusterAnalysis[] = [];

  for (const group of groups) {
    if (!visited.has(group.id)) {
      const clusterGroups = findConnectedComponents(group.id, groups, connections, visited);
      if (clusterGroups.length > 1) {
        const clusterIds = clusterGroups.map(g => g.id);
        const centroid = calculateCentroid(clusterGroups);
        
        clusters.push({
          groupIds: clusterIds,
          size: clusterGroups.length,
          connectionCount: countInternalConnections(clusterIds, connections),
          centroid,
        });
      }
    }
  }

  return clusters.sort((a, b) => b.size - a.size);
}

function findConnectedComponents(
  startId: string, 
  groups: ClusterGroup[], 
  connections: Connection[], 
  visited: Set<string>
): ClusterGroup[] {
  const stack = [startId];
  const component = new Set<string>([startId]);

  while (stack.length > 0) {
    const currentId = stack.pop()!;
    if (!visited.has(currentId)) {
      visited.add(currentId);
      
      // Trouver tous les groupes connectés
      const connectedGroups = connections
        .filter(conn => conn.sourceGroupId === currentId || conn.targetGroupId === currentId)
        .map(conn => conn.sourceGroupId === currentId ? conn.targetGroupId : conn.sourceGroupId);
      
      for (const connectedId of connectedGroups) {
        if (!visited.has(connectedId)) {
          stack.push(connectedId);
          component.add(connectedId);
        }
      }
    }
  }

  return Array.from(component)
    .map(id => groups.find(g => g.id === id))
    .filter((group): group is ClusterGroup => group !== undefined);
}

function countInternalConnections(clusterIds: string[], connections: Connection[]): number {
  const clusterIdsSet = new Set(clusterIds);
  return connections.filter(conn => 
    clusterIdsSet.has(conn.sourceGroupId) && clusterIdsSet.has(conn.targetGroupId)
  ).length;
}

function calculateCentroid(groups: ClusterGroup[]): { x: number; y: number } {
  const sumX = groups.reduce((sum, group) => sum + group.position.x, 0);
  const sumY = groups.reduce((sum, group) => sum + group.position.y, 0);
  
  return {
    x: sumX / groups.length,
    y: sumY / groups.length,
  };
}

// 🆕 RÉCUPÉRER LES RECOMMANDATIONS DE CONNECTIONS
export const getConnectionRecommendations = query({
  args: {
    mapId: v.id("affinityMaps"),
  },
  handler: async (ctx, args): Promise<ConnectionRecommendation[]> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const map = await ctx.db.get(args.mapId);
    if (!map) return [];

    const connections = await ctx.db
      .query("groupConnections")
      .withIndex("by_map", q => q.eq("mapId", args.mapId))
      .collect();

    const existingConnections = new Set(
      connections.map(conn => `${conn.sourceGroupId}-${conn.targetGroupId}`)
    );

    const recommendations: ConnectionRecommendation[] = [];

    // Algorithme de recommandation basé sur la similarité
    for (let i = 0; i < map.groups.length; i++) {
      for (let j = i + 1; j < map.groups.length; j++) {
        const groupA = map.groups[i];
        const groupB = map.groups[j];
        
        const connectionKey = `${groupA.id}-${groupB.id}`;
        const reverseKey = `${groupB.id}-${groupA.id}`;
        
        if (!existingConnections.has(connectionKey) && !existingConnections.has(reverseKey)) {
          let score = 0;
          let suggestedType: ConnectionRecommendation["suggestedType"] = "related";
          
          // Similarité par position
          const distance = Math.sqrt(
            Math.pow(groupA.position.x - groupB.position.x, 2) + 
            Math.pow(groupA.position.y - groupB.position.y, 2)
          );
          if (distance < 300) score += 2;
          
          // Similarité par nombre d'insights
          if (groupA.insightIds.length > 0 && groupB.insightIds.length > 0) {
            const insightSimilarity = Math.min(groupA.insightIds.length, groupB.insightIds.length);
            score += insightSimilarity * 0.1;
          }
          
          // Déterminer le type suggéré
          if (distance < 200) suggestedType = "hierarchy";
          if (groupA.insightIds.length > 5 && groupB.insightIds.length > 5) suggestedType = "dependency";
          
          if (score >= 2) {
            recommendations.push({
              sourceGroupId: groupA.id,
              targetGroupId: groupB.id,
              score,
              reason: getRecommendationReason(score, distance, suggestedType),
              suggestedType,
            });
          }
        }
      }
    }

    return recommendations.sort((a, b) => b.score - a.score).slice(0, 10);
  },
});

function getRecommendationReason(
  score: number, 
  distance: number, 
  suggestedType: ConnectionRecommendation["suggestedType"]
): string {
  if (score >= 4) return "High similarity and proximity";
  if (distance < 200) return "Groups are very close";
  if (suggestedType === "hierarchy") return "Potential parent-child relationship";
  if (suggestedType === "dependency") return "Both groups have many insights";
  return "Potential connection detected";
}

// 🆕 MUTATION POUR SAUVEGARDER LES ANALYTIQUES
export const saveAnalytics = mutation({
  args: {
    mapId: v.id("affinityMaps"),
    metrics: v.object({
      totalConnections: v.number(),
      connectedGroups: v.number(),
      connectionRate: v.number(),
      typeDistribution: v.object({
        related: v.number(),
        hierarchy: v.number(),
        dependency: v.number(),
        contradiction: v.number(),
      }),
      averageStrength: v.number(),
      density: v.number(),
    }),
    clusters: v.array(v.object({
      groupIds: v.array(v.string()),
      size: v.number(),
      connectionCount: v.number(),
      centroid: v.object({ x: v.number(), y: v.number() }),
    })),
    recommendations: v.array(v.object({
      sourceGroupId: v.string(),
      targetGroupId: v.string(),
      score: v.number(),
      reason: v.string(),
      suggestedType: v.union(
        v.literal("related"),
        v.literal("hierarchy"),
        v.literal("dependency"),
        v.literal("contradiction")
      ),
    })),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Supprimer les anciennes analyses
    const existingAnalytics = await ctx.db
      .query("affinityAnalytics")
      .withIndex("by_map", q => q.eq("mapId", args.mapId))
      .collect();

    for (const analytic of existingAnalytics) {
      await ctx.db.delete(analytic._id);
    }

    // Sauvegarder la nouvelle analyse (expire dans 24h)
    const analyticsId = await ctx.db.insert("affinityAnalytics", {
      mapId: args.mapId,
      metrics: args.metrics,
      clusters: args.clusters,
      recommendations: args.recommendations,
      generatedAt: Date.now(),
      expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 heures
    });

    return analyticsId;
  },
});