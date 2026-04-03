import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getCurrent = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const maps = await ctx.db
      .query("affinityMaps")
      .filter(q => q.eq(q.field("projectId"), args.projectId))
      .filter(q => q.eq(q.field("isCurrent"), true))
      .collect();

    return maps[0] || null;
  },
});

export const getByProject = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("affinityMaps")
      .filter(q => q.eq(q.field("projectId"), args.projectId))
      .collect();
  },
});

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Vérifier l'accès au projet
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");
    
    const hasAccess = project.members.some(member => 
      member.userId === identity.subject
    ) || project.isPublic || project.ownerId === identity.subject;

    if (!hasAccess) throw new Error("No access to project");

    // Marquer les autres maps comme non-current
    const existingMaps = await ctx.db
      .query("affinityMaps")
      .filter(q => q.eq(q.field("projectId"), args.projectId))
      .collect();

    for (const map of existingMaps) {
      await ctx.db.patch(map._id, { isCurrent: false });
    }

    // Créer la nouvelle map
    const mapId = await ctx.db.insert("affinityMaps", {
      projectId: args.projectId,
      name: args.name,
      description: args.description,
      version: 1,
      isCurrent: true,
      clusters: [],
      createdBy: identity.subject,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return mapId;
  },
});


// 
export const addCluster = mutation({
  args: {
    mapId: v.id("affinityMaps"),
    title: v.string(),
    color: v.string(),
    position: v.object({
      x: v.number(),
      y: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const map = await ctx.db.get(args.mapId);
    if (!map) throw new Error("Affinity map not found");

    // Vérifier les permissions
    const project = await ctx.db.get(map.projectId);
    if (!project) throw new Error("Project not found");
    
    const hasAccess = project.members.some(member => 
      member.userId === identity.subject
    ) || project.ownerId === identity.subject;

    if (!hasAccess) throw new Error("No access to modify map");

    const newCluster = {
      id: `cluster-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: args.title,
      color: args.color,
      position: args.position,
      insightIds: [],
      size: { width: 400, height: 300 },
    };

    const updatedClusters = [...(map.clusters || []), newCluster];

    await ctx.db.patch(args.mapId, {
      clusters: updatedClusters,
      updatedAt: Date.now(),
    });

    return newCluster.id;
  },
});

// convex/affinityMaps.ts - VÉRIFIER moveCluster
// convex/affinityMaps.ts
export const moveCluster = mutation({
  args: { mapId: v.id("affinityMaps"), clusterId: v.string(), position: v.object({ x: v.number(), y: v.number() }) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const map = await ctx.db.get(args.mapId);
    if (!map) throw new Error("Affinity map not found");

    // 🔒 on récupère la position actuelle
    const cluster = (map.clusters || []).find((g) => g.id === args.clusterId);
    if (!cluster) throw new Error("Cluster not found");

    const oldPos = cluster.position; // ← oldPos

    // on met à jour
    const updatedClusters = (map.clusters || []).map((g) =>
      g.id === args.clusterId ? { ...g, position: args.position } : g
    );

    await ctx.db.patch(args.mapId, { clusters: updatedClusters, updatedAt: Date.now() });

    // // 🔒 on log l'action
    // await ctx.db.insert("activityLog", {
    //   mapId: args.mapId,
    //   userId: identity.subject,
    //   action: "cluster_moved",
    //   payload: { clusterId: args.clusterId, oldValue: oldPos, newValue: args.position },
    //   timestamp: Date.now(),
    // });

    return { success: true };
  },
});

export const addInsightToCluster = mutation({
  args: {
    mapId: v.id("affinityMaps"),
    clusterId: v.string(),
    insightId: v.id("insights"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const map = await ctx.db.get(args.mapId);
    if (!map) throw new Error("Affinity map not found");

    // Retirer l'insight de tous les autres clusters d'abord
    const updatedClusters = (map.clusters || []).map(cluster => {
      // Retirer l'insight de tous les clusters
      const filteredInsightIds = cluster.insightIds.filter((id: string) => id !== args.insightId);
      
      // Si c'est le cluster cible, ajouter l'insight
      if (cluster.id === args.clusterId && !filteredInsightIds.includes(args.insightId)) {
        return {
          ...cluster,
          insightIds: [...filteredInsightIds, args.insightId]
        };
      }
      
      return {
        ...cluster,
        insightIds: filteredInsightIds
      };
    });

    await ctx.db.patch(args.mapId, {
      clusters: updatedClusters,
      updatedAt: Date.now(),
    });
  },
});

export const createIndependentInsight = mutation({
  args: {
    mapId: v.id("affinityMaps"),
    position: v.object({ x: v.number(), y: v.number() }),
    text: v.string(),
    type: v.union(
      v.literal("pain-point"),
      v.literal("quote"), 
      v.literal("insight"),
      v.literal("follow-up"),
      v.literal("custom")
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const map = await ctx.db.get(args.mapId);
    if (!map) throw new Error("Affinity map not found");

    // Créer l'insight sans interviewId
    const insightId = await ctx.db.insert("insights", {
      projectId: map.projectId,
      type: args.type,
      text: args.text,
      timestamp: 0,
      source: "manual" as const,
      createdBy: identity.subject,
      createdByName: identity.name || identity.email?.split('@')[0] || "Unknown",
      createdAt: Date.now(),
      // interviewId est optionnel maintenant
    });

    // Créer un nouveau cluster pour cet insight indépendant
    const newCluster = {
      id: `cluster-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: "Note", // Titre plus court
      color: "#6B7280",
      position: args.position,
      insightIds: [insightId],
      size: { width: 200, height: 120 },
    };

    const updatedClusters = [...(map.clusters || []), newCluster];

    await ctx.db.patch(args.mapId, {
      clusters: updatedClusters,
      updatedAt: Date.now(),
    });

    return { clusterId: newCluster.id, insightId };
  },
});

export const removeCluster = mutation({
  args: {
    mapId: v.id("affinityMaps"),
    clusterId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const map = await ctx.db.get(args.mapId);
    if (!map) throw new Error("Affinity map not found");

    // Filtrer les clusters pour retirer celui spécifié
    const updatedClusters = (map.clusters || []).filter(cluster => cluster.id !== args.clusterId);

    await ctx.db.patch(args.mapId, {
      clusters: updatedClusters,
      updatedAt: Date.now(),
    });
  },
});

export const removeInsightFromCluster = mutation({
  args: {
    mapId: v.id("affinityMaps"),
    clusterId: v.string(),
    insightId: v.id("insights"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const map = await ctx.db.get(args.mapId);
    if (!map) throw new Error("Affinity map not found");

    // Retirer l'insight du cluster spécifié
    const updatedClusters = (map.clusters || []).map(cluster => {
      if (cluster.id === args.clusterId) {
        return {
          ...cluster,
          insightIds: cluster.insightIds.filter((id: string) => id !== args.insightId)
        };
      }
      return cluster;
    });

    await ctx.db.patch(args.mapId, {
      clusters: updatedClusters,
      updatedAt: Date.now(),
    });
  },
});

export const resizeCluster = mutation({
  args: {
    mapId: v.id("affinityMaps"),
    clusterId: v.string(),
    size: v.object({
      width: v.number(),
      height: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const map = await ctx.db.get(args.mapId);
    if (!map) throw new Error("Affinity map not found");

    const updatedClusters = (map.clusters || []).map(cluster =>
      cluster.id === args.clusterId
        ? { ...cluster, size: args.size }
        : cluster
    );

    await ctx.db.patch(args.mapId, {
      clusters: updatedClusters,
      updatedAt: Date.now(),
    });
  },
});

export const createManualInsight = mutation({
  args: {
    projectId: v.id("projects"),
    text: v.string(),
    type: v.union(
      v.literal("pain-point"),
      v.literal("quote"), 
      v.literal("insight"),
      v.literal("follow-up"),
      v.literal("custom")
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Créer l'insight manuel
    const insightId = await ctx.db.insert("insights", {
      projectId: args.projectId,
      type: args.type,
      text: args.text,
      timestamp: 0,
      source: "manual" as const,
      createdBy: identity.subject,
      createdByName: identity.name || identity.email?.split('@')[0] || "Unknown",
      createdAt: Date.now(),
    });

    return insightId;
  },
});

export const reorderInsights = mutation({
  args: {
    mapId: v.id("affinityMaps"),
    clusterId: v.string(),
    insightIds: v.array(v.id("insights")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const map = await ctx.db.get(args.mapId);
    if (!map) throw new Error("Affinity map not found");

    const updatedClusters = (map.clusters || []).map(cluster =>
      cluster.id === args.clusterId
        ? { ...cluster, insightIds: args.insightIds }
        : cluster
    );

    await ctx.db.patch(args.mapId, {
      clusters: updatedClusters,
      updatedAt: Date.now(),
    });
  },
});

export const updateClusterTitle = mutation({
  args: {
    mapId: v.id("affinityMaps"),
    clusterId: v.string(),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const map = await ctx.db.get(args.mapId);
    if (!map) throw new Error("Affinity map not found");

    const updatedClusters = (map.clusters || []).map(cluster =>
      cluster.id === args.clusterId
        ? { ...cluster, title: args.title }
        : cluster
    );

    await ctx.db.patch(args.mapId, {
      clusters: updatedClusters,
      updatedAt: Date.now(),
    });
  },
});

// Dans affinityMaps.ts - juste AJOUTER ça :
export const updateClusters = mutation({
  args: {
    mapId: v.id("affinityMaps"),
    clusters: v.array(v.object({
      id: v.string(),
      title: v.string(),
      color: v.string(),
      position: v.object({ x: v.number(), y: v.number() }),
      insightIds: v.array(v.string()),
      size: v.optional(v.object({
        width: v.number(),
        height: v.number(),
      })),
    })),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const map = await ctx.db.get(args.mapId);
    if (!map) throw new Error("Affinity map not found");

    await ctx.db.patch(args.mapId, {
      clusters: args.clusters,
      updatedAt: Date.now(),
    });
  },
});

// Update sticky positions on canvas
export const updateStickyPositions = mutation({
  args: {
    mapId: v.id("affinityMaps"),
    positions: v.record(v.string(), v.object({
      x: v.number(),
      y: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const map = await ctx.db.get(args.mapId);
    if (!map) throw new Error("Affinity map not found");

    await ctx.db.patch(args.mapId, {
      stickyPositions: args.positions,
      updatedAt: Date.now(),
    });
  },
});

// 🆕 AJOUTER CETTE MUTATION
export const replaceAllClusters = mutation({
  args: {
    mapId: v.id("affinityMaps"),
    clusters: v.array(v.object({
      id: v.string(),
      title: v.string(),
      color: v.string(),
      position: v.object({ x: v.number(), y: v.number() }),
      insightIds: v.array(v.string()),
      size: v.optional(v.object({
        width: v.number(),
        height: v.number(),
      })),
    })),
    stickyPositions: v.optional(v.record(v.string(), v.object({
      x: v.number(),
      y: v.number(),
    }))),
    preserveStickyPositions: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const map = await ctx.db.get(args.mapId);
    if (!map) throw new Error("Affinity map not found");

    // Determine sticky positions to save
    let stickyPositionsToSave: typeof map.stickyPositions;
    if (args.preserveStickyPositions === false) {
      stickyPositionsToSave = undefined;
    } else if (args.stickyPositions) {
      stickyPositionsToSave = args.stickyPositions;
    } else {
      stickyPositionsToSave = map.stickyPositions;
    }

    await ctx.db.patch(args.mapId, {
      clusters: args.clusters,
      stickyPositions: stickyPositionsToSave,
      updatedAt: Date.now(),
    });
  },
});

// ============================================
// FIGJAM BOARD SYNC - Phase 2
// ============================================

/**
 * Save FigJam board elements to Convex
 * Called when the board changes (debounced)
 */
export const saveFigJamElements = mutation({
  args: {
    mapId: v.id("affinityMaps"),
    elements: v.any(), // Record<string, FigJamElement>
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    await ctx.db.patch(args.mapId, {
      figJamElements: args.elements,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Load FigJam board elements from Convex
 * Called when the board mounts
 */
export const getFigJamElements = query({
  args: {
    mapId: v.id("affinityMaps"),
  },
  handler: async (ctx, args) => {
    const map = await ctx.db.get(args.mapId);
    if (!map) return null;
    return map.figJamElements;
  },
});

// ============================================
// PHASE 3: Real-time element movements
// ============================================

/**
 * Broadcast a real-time element movement
 * Called during drag/resize for live sync
 */
export const broadcastMovement = mutation({
  args: {
    mapId: v.id("affinityMaps"),
    elementId: v.string(),
    elementType: v.union(v.literal("sticky"), v.literal("section"), v.literal("dot"), v.literal("label")),
    action: v.union(v.literal("move"), v.literal("resize"), v.literal("update")),
    position: v.optional(v.object({ x: v.number(), y: v.number() })),
    size: v.optional(v.object({ width: v.number(), height: v.number() })),
    patch: v.optional(v.any()),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Insert movement record (will be cleaned up by a scheduled job or on read)
    await ctx.db.insert("elementMovements", {
      mapId: args.mapId,
      elementId: args.elementId,
      elementType: args.elementType,
      action: args.action,
      position: args.position,
      size: args.size,
      patch: args.patch,
      userId: args.userId,
      timestamp: Date.now(),
    });

    // Clean up old movements (keep only last 5 minutes) - simplified
    const cutoff = Date.now() - 5 * 60 * 1000;
    const allMovements = await ctx.db
      .query("elementMovements")
      .withIndex("by_map", q => q.eq("mapId", args.mapId))
      .collect();
    
    for (const movement of allMovements) {
      if (movement.timestamp < cutoff) {
        await ctx.db.delete(movement._id);
      }
    }
  },
});

/**
 * Get recent movements for real-time sync
 */
export const getRecentMovements = query({
  args: {
    mapId: v.id("affinityMaps"),
    since: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const since = args.since || (Date.now() - 5000); // Default: last 5 seconds
    
    const movements = await ctx.db
      .query("elementMovements")
      .withIndex("by_map", q => q.eq("mapId", args.mapId))
      .collect();
    
    // Filter by timestamp in JavaScript (Convex filter limitations)
    return movements.filter(m => m.timestamp >= since);
  },
});

// ============================================
// Element locking (prevent concurrent editing)
// ============================================

/**
 * Lock an element (when user selects it for editing)
 */
export const lockElement = mutation({
  args: {
    mapId: v.id("affinityMaps"),
    elementId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if already locked by someone else
    const existing = await ctx.db
      .query("elementLocks")
      .withIndex("by_element", q => q.eq("elementId", args.elementId))
      .first();
    
    if (existing && existing.userId !== args.userId) {
      // Already locked by another user - return false
      return { success: false, lockedBy: existing.userId };
    }
    
    if (existing) {
      // Already locked by same user - refresh lock
      await ctx.db.patch(existing._id, { lockedAt: Date.now() });
      return { success: true, lockedBy: null };
    }
    
    // Create new lock
    await ctx.db.insert("elementLocks", {
      mapId: args.mapId,
      elementId: args.elementId,
      userId: args.userId,
      lockedAt: Date.now(),
    });
    
    return { success: true, lockedBy: null };
  },
});

/**
 * Unlock an element (when user deselects or finishes editing)
 */
export const unlockElement = mutation({
  args: {
    mapId: v.id("affinityMaps"),
    elementId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("elementLocks")
      .withIndex("by_element", q => q.eq("elementId", args.elementId))
      .first();
    
    if (existing && existing.userId === args.userId) {
      await ctx.db.delete(existing._id);
    }
  },
});

/**
 * Get all locks for a map
 */
export const getElementLocks = query({
  args: {
    mapId: v.id("affinityMaps"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("elementLocks")
      .withIndex("by_map", q => q.eq("mapId", args.mapId))
      .collect();
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// VOTING SESSIONS (Synchronized & Silent)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get active voting session for a map
 */
export const getActiveVotingSession = query({
  args: {
    mapId: v.id("affinityMaps"),
  },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query("dotVotingSessions")
      .withIndex("by_map", q => q.eq("mapId", args.mapId))
      .collect();
    
    // Return the most recent active session
    return sessions
      .filter(s => s.votingPhase !== "completed")
      .sort((a, b) => b.createdAt - a.createdAt)[0] || null;
  },
});

/**
 * Get all votes for a session
 */
export const getSessionVotes = query({
  args: {
    sessionId: v.id("dotVotingSessions"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("dotVotes")
      .withIndex("by_session", q => q.eq("sessionId", args.sessionId))
      .collect();
  },
});

/**
 * Get votes for a specific user in a session (used to check remaining votes)
 */
export const getUserVotes = query({
  args: {
    sessionId: v.id("dotVotingSessions"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get all votes for this session and filter by user
    const allVotes = await ctx.db
      .query("dotVotes")
      .withIndex("by_session", q => q.eq("sessionId", args.sessionId))
      .collect();
    
    return allVotes.filter(v => v.userId === args.userId);
  },
});

/**
 * Start a new voting session
 */
export const startVotingSession = mutation({
  args: {
    projectId: v.id("projects"),
    mapId: v.id("affinityMaps"),
    name: v.string(),
    maxDotsPerUser: v.number(),
    isSilentMode: v.boolean(),
    durationMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const sessionId = await ctx.db.insert("dotVotingSessions", {
      projectId: args.projectId,
      mapId: args.mapId,
      name: args.name,
      maxDotsPerUser: args.maxDotsPerUser,
      isActive: true,
      votingPhase: "voting",
      isSilentMode: args.isSilentMode,
      durationMinutes: args.durationMinutes,
      startTime: Date.now(),
      createdBy: identity.subject,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return sessionId;
  },
});

/**
 * Cast a vote (one vote per cluster per user)
 */
export const castVote = mutation({
  args: {
    sessionId: v.id("dotVotingSessions"),
    userId: v.string(),
    targetId: v.string(),
    targetType: v.union(v.literal("group"), v.literal("insight")),
    color: v.string(),
    position: v.optional(v.object({ x: v.number(), y: v.number() })),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Check session is active
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.votingPhase !== "voting") {
      throw new Error("Voting is not active");
    }

    // Check if user already voted for this target - get all votes for this session
    const allSessionVotes = await ctx.db
      .query("dotVotes")
      .withIndex("by_session", q => q.eq("sessionId", args.sessionId))
      .collect();

    const userVotes = allSessionVotes.filter(v => v.userId === args.userId);
    const existingVote = userVotes.find(v => v.targetId === args.targetId);
    
    if (existingVote) {
      // Remove vote (toggle off)
      await ctx.db.delete(existingVote._id);
      return { action: "removed", voteId: existingVote._id };
    }

    // Check if user has remaining votes
    if (userVotes.length >= session.maxDotsPerUser) {
      throw new Error("No votes remaining");
    }

    // Create vote with provided position or at cluster center
    const voteId = await ctx.db.insert("dotVotes", {
      sessionId: args.sessionId,
      userId: args.userId,
      targetId: args.targetId,
      targetType: args.targetType,
      color: args.color,
      position: args.position || { x: 0, y: 0 },
      createdAt: Date.now(),
    });

    return { action: "added", voteId };
  },
});

/**
 * Stop voting and reveal results (creator only)
 */
export const stopVoting = mutation({
  args: {
    sessionId: v.id("dotVotingSessions"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");

    await ctx.db.patch(args.sessionId, {
      isActive: false,
      votingPhase: "revealed",
      updatedAt: Date.now(),
    });

    return true;
  },
});

/**
 * Complete and archive the session
 */
export const completeVoting = mutation({
  args: {
    sessionId: v.id("dotVotingSessions"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    await ctx.db.patch(args.sessionId, {
      votingPhase: "completed",
      updatedAt: Date.now(),
    });

    return true;
  },
});

/**
 * Delete a voting session and all its votes (cascade delete)
 */
export const deleteVotingSession = mutation({
  args: {
    sessionId: v.id("dotVotingSessions"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");

    // Delete all votes for this session first (cascade)
    const votes = await ctx.db
      .query("dotVotes")
      .withIndex("by_session", q => q.eq("sessionId", args.sessionId))
      .collect();

    for (const vote of votes) {
      await ctx.db.delete(vote._id);
    }

    // Delete the session
    await ctx.db.delete(args.sessionId);

    return true;
  },
});

/**
 * Start a new voting round (reset votes)
 */
export const startNewVoteRound = mutation({
  args: {
    sessionId: v.id("dotVotingSessions"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");

    // Delete all votes for this session
    const votes = await ctx.db
      .query("dotVotes")
      .withIndex("by_session", q => q.eq("sessionId", args.sessionId))
      .collect();

    for (const vote of votes) {
      await ctx.db.delete(vote._id);
    }

    // Reset session
    await ctx.db.patch(args.sessionId, {
      isActive: true,
      votingPhase: "voting",
      startTime: Date.now(),
      updatedAt: Date.now(),
    });

    return true;
  },
});