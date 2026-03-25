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
      groups: [],
      createdBy: identity.subject,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return mapId;
  },
});


// 
export const addGroup = mutation({
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

    const newGroup = {
      id: `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: args.title,
      color: args.color,
      position: args.position,
      insightIds: [],
      size: { width: 400, height: 300 },
    };

    const updatedGroups = [...map.groups, newGroup];

    await ctx.db.patch(args.mapId, {
      groups: updatedGroups,
      updatedAt: Date.now(),
    });

    return newGroup.id;
  },
});

// convex/affinityMaps.ts - VÉRIFIER moveGroup
// convex/affinityMaps.ts
export const moveGroup = mutation({
  args: { mapId: v.id("affinityMaps"), groupId: v.string(), position: v.object({ x: v.number(), y: v.number() }) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const map = await ctx.db.get(args.mapId);
    if (!map) throw new Error("Affinity map not found");

    // 🔒 on récupère la position actuelle
    const group = map.groups.find((g) => g.id === args.groupId);
    if (!group) throw new Error("Group not found");

    const oldPos = group.position; // ← oldPos

    // on met à jour
    const updatedGroups = map.groups.map((g) =>
      g.id === args.groupId ? { ...g, position: args.position } : g
    );

    await ctx.db.patch(args.mapId, { groups: updatedGroups, updatedAt: Date.now() });

    // // 🔒 on log l’action
    // await ctx.db.insert("activityLog", {
    //   mapId: args.mapId,
    //   userId: identity.subject,
    //   action: "group_moved",
    //   payload: { groupId: args.groupId, oldValue: oldPos, newValue: args.position },
    //   timestamp: Date.now(),
    // });

    return { success: true };
  },
});

export const addInsightToGroup = mutation({
  args: {
    mapId: v.id("affinityMaps"),
    groupId: v.string(),
    insightId: v.id("insights"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const map = await ctx.db.get(args.mapId);
    if (!map) throw new Error("Affinity map not found");

    // Retirer l'insight de tous les autres groupes d'abord
    const updatedGroups = map.groups.map(group => {
      // Retirer l'insight de tous les groupes
      const filteredInsightIds = group.insightIds.filter(id => id !== args.insightId);
      
      // Si c'est le groupe cible, ajouter l'insight
      if (group.id === args.groupId && !filteredInsightIds.includes(args.insightId)) {
        return {
          ...group,
          insightIds: [...filteredInsightIds, args.insightId]
        };
      }
      
      return {
        ...group,
        insightIds: filteredInsightIds
      };
    });

    await ctx.db.patch(args.mapId, {
      groups: updatedGroups,
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

    // Créer un nouveau groupe pour cet insight indépendant
    const newGroup = {
      id: `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: "Note", // Titre plus court
      color: "#6B7280",
      position: args.position,
      insightIds: [insightId],
      size: { width: 200, height: 120 },
    };

    const updatedGroups = [...map.groups, newGroup];

    await ctx.db.patch(args.mapId, {
      groups: updatedGroups,
      updatedAt: Date.now(),
    });

    return { groupId: newGroup.id, insightId };
  },
});

export const removeGroup = mutation({
  args: {
    mapId: v.id("affinityMaps"),
    groupId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const map = await ctx.db.get(args.mapId);
    if (!map) throw new Error("Affinity map not found");

    // Filtrer les groupes pour retirer celui spécifié
    const updatedGroups = map.groups.filter(group => group.id !== args.groupId);

    await ctx.db.patch(args.mapId, {
      groups: updatedGroups,
      updatedAt: Date.now(),
    });
  },
});

export const removeInsightFromGroup = mutation({
  args: {
    mapId: v.id("affinityMaps"),
    groupId: v.string(),
    insightId: v.id("insights"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const map = await ctx.db.get(args.mapId);
    if (!map) throw new Error("Affinity map not found");

    // Retirer l'insight du groupe spécifié
    const updatedGroups = map.groups.map(group => {
      if (group.id === args.groupId) {
        return {
          ...group,
          insightIds: group.insightIds.filter(id => id !== args.insightId)
        };
      }
      return group;
    });

    await ctx.db.patch(args.mapId, {
      groups: updatedGroups,
      updatedAt: Date.now(),
    });
  },
});

export const resizeGroup = mutation({
  args: {
    mapId: v.id("affinityMaps"),
    groupId: v.string(),
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

    const updatedGroups = map.groups.map(group =>
      group.id === args.groupId
        ? { ...group, size: args.size }
        : group
    );

    await ctx.db.patch(args.mapId, {
      groups: updatedGroups,
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
    groupId: v.string(),
    insightIds: v.array(v.id("insights")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const map = await ctx.db.get(args.mapId);
    if (!map) throw new Error("Affinity map not found");

    const updatedGroups = map.groups.map(group =>
      group.id === args.groupId
        ? { ...group, insightIds: args.insightIds }
        : group
    );

    await ctx.db.patch(args.mapId, {
      groups: updatedGroups,
      updatedAt: Date.now(),
    });
  },
});

export const updateGroupTitle = mutation({
  args: {
    mapId: v.id("affinityMaps"),
    groupId: v.string(),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const map = await ctx.db.get(args.mapId);
    if (!map) throw new Error("Affinity map not found");

    const updatedGroups = map.groups.map(group =>
      group.id === args.groupId
        ? { ...group, title: args.title }
        : group
    );

    await ctx.db.patch(args.mapId, {
      groups: updatedGroups,
      updatedAt: Date.now(),
    });
  },
});

// Dans affinityMaps.ts - juste AJOUTER ça :
export const updateGroups = mutation({
  args: {
    mapId: v.id("affinityMaps"),
    groups: v.array(v.object({
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
      groups: args.groups,
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
export const replaceAllGroups = mutation({
  args: {
    mapId: v.id("affinityMaps"),
    groups: v.array(v.object({
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
      groups: args.groups,
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
    elementType: v.union(v.literal("sticky"), v.literal("section"), v.literal("dot")),
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