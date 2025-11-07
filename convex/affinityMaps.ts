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
export const moveGroup = mutation({
  args: {
    mapId: v.id("affinityMaps"),
    groupId: v.string(),
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

    console.log("🔄 Moving group:", args.groupId, "to", args.position);

    // 🆕 VÉRIFICATION QUE LE GROUPE EXISTE
    const groupExists = map.groups.some(g => g.id === args.groupId);
    if (!groupExists) {
      console.error("❌ Group not found:", args.groupId);
      throw new Error("Group not found");
    }

    const updatedGroups = map.groups.map(group =>
      group.id === args.groupId
        ? { ...group, position: args.position }
        : group
    );

    await ctx.db.patch(args.mapId, {
      groups: updatedGroups,
      updatedAt: Date.now(),
    });

    console.log("✅ Group moved successfully");
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
        ? { ...group }
        : group
    );

    // On stocke la taille dans l'état local pour l'instant
    // Si tu veux la persister, ajoute un champ `size` dans le schema
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
      insightIds: v.array(v.string()), // ← CHANGÉ: string[] 
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

// 🆕 AJOUTER CETTE MUTATION
export const replaceAllGroups = mutation({
  args: {
    mapId: v.id("affinityMaps"),
    groups: v.array(v.object({
      id: v.string(),
      title: v.string(),
      color: v.string(),
      position: v.object({ x: v.number(), y: v.number() }),
      insightIds: v.array(v.string()), // ← CHANGÉ: string[] au lieu de v.id("insights")
    })),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    await ctx.db.patch(args.mapId, {
      groups: args.groups,
      updatedAt: Date.now(),
    });
  },
});