// convex/analytics.ts - VERSION SIMPLIFIÉE
import { query } from "./_generated/server";
import { v } from "convex/values";

// 🎯 QUERIES ANALYTIQUES DE BASE
export const getMapAnalytics = query({
  args: {
    mapId: v.id("affinityMaps"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const map = await ctx.db.get(args.mapId);
    if (!map) return null;

    // Récupérer tous les insights du projet
    const insights = await ctx.db
      .query("insights")
      .filter(q => q.eq(q.field("projectId"), map.projectId))
      .collect();

    // Calculer les métriques de base
    const totalInsights = insights.length;
    const groupedInsights = (map.clusters || []).reduce((sum: number, cluster) => sum + cluster.insightIds.length, 0);
    
    // Distribution par type
    const insightTypes = insights.reduce((acc, insight) => {
      acc[insight.type] = (acc[insight.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Taille moyenne des clusters
    const avgClusterSize = (map.clusters || []).length > 0 ? groupedInsights / (map.clusters || []).length : 0;

    // Clusters par taille
    const clusterSizes = (map.clusters || []).reduce((acc, cluster) => {
      const size = cluster.insightIds.length;
      if (size <= 3) acc.small++;
      else if (size <= 7) acc.medium++;
      else acc.large++;
      return acc;
    }, { small: 0, medium: 0, large: 0 });

    return {
      basicMetrics: {
        totalInsights,
        groupedInsights,
        ungroupedInsights: totalInsights - groupedInsights,
        clusterCount: (map.clusters || []).length,
        completionRate: totalInsights > 0 ? (groupedInsights / totalInsights) * 100 : 0,
        avgClusterSize,
      },
      insightTypes,
      clusterSizes,
      generatedAt: Date.now(),
    };
  },
});

export const getVotingAnalytics = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    // Récupérer les sessions de voting actives
    const sessions = await ctx.db
      .query("dotVotingSessions")
      .withIndex("by_project", q => q.eq("projectId", args.projectId))
      .filter(q => q.eq(q.field("isActive"), true))
      .collect();

    if (sessions.length === 0) return null;

    const session = sessions[0];
    const votes = await ctx.db
      .query("votes")
      .withIndex("by_session", q => q.eq("sessionId", session._id))
      .collect();

    // Calculer les métriques de voting
    const totalVotes = votes.reduce((sum, vote) => sum + vote.votes, 0);
    const uniqueVoters = new Set(votes.map(vote => vote.userId)).size;
    
    // Top groupes votés
    const groupVotes = votes.reduce((acc, vote) => {
      acc[vote.targetId] = (acc[vote.targetId] || 0) + vote.votes;
      return acc;
    }, {} as Record<string, number>);

    const topGroups = Object.entries(groupVotes)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([groupId, votes]) => ({ groupId, votes }));

    return {
      totalVotes,
      uniqueVoters,
      topGroups,
      sessionName: session.name,
    };
  },
});