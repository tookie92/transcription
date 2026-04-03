import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// 🆕 CRÉER UNE CONNECTION
// 🆕 CRÉER UNE CONNECTION (avec messages d'erreur détaillés)
export const createConnection = mutation({
  args: {
    mapId: v.id("affinityMaps"),
    sourceGroupId: v.string(),
    targetGroupId: v.string(),
    type: v.union(
      v.literal("related"),
      v.literal("hierarchy"),
      v.literal("dependency"),
      v.literal("contradiction")
    ),
    label: v.optional(v.string()),
    strength: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Vérifier que la map existe
    const map = await ctx.db.get(args.mapId);
    if (!map) throw new Error("Affinity map not found");

    // Vérifier que les clusters existent dans la map
    const sourceGroup = (map.clusters || []).find((g: { id: string }) => g.id === args.sourceGroupId);
    const targetGroup = (map.clusters || []).find((g: { id: string }) => g.id === args.targetGroupId);
    
    if (!sourceGroup) throw new Error("Source group not found in this map");
    if (!targetGroup) throw new Error("Target group not found in this map");
    
    // 🎯 Empêcher une connection vers soi-même
    if (args.sourceGroupId === args.targetGroupId) {
      throw new Error("Cannot connect a group to itself");
    }

    // Vérifier qu'une connection n'existe pas déjà
    const existingConnections = await ctx.db
      .query("groupConnections")
      .withIndex("by_map", q => q.eq("mapId", args.mapId))
      .collect();

    const duplicate = existingConnections.find(
      conn => 
        (conn.sourceGroupId === args.sourceGroupId && conn.targetGroupId === args.targetGroupId) ||
        (conn.sourceGroupId === args.targetGroupId && conn.targetGroupId === args.sourceGroupId)
    );

    if (duplicate) {
      throw new Error(`Connection already exists between these groups (${duplicate.type})`);
    }

    // 🎯 Vérifier le nombre maximum de connections par groupe (optionnel)
    const sourceConnections = existingConnections.filter(
      conn => conn.sourceGroupId === args.sourceGroupId || conn.targetGroupId === args.sourceGroupId
    );
    
    const targetConnections = existingConnections.filter(
      conn => conn.sourceGroupId === args.targetGroupId || conn.targetGroupId === args.targetGroupId
    );

    if (sourceConnections.length >= 10) {
      throw new Error("Source group has too many connections (max: 10)");
    }
    
    if (targetConnections.length >= 10) {
      throw new Error("Target group has too many connections (max: 10)");
    }

    // Créer la connection
    const connectionId = await ctx.db.insert("groupConnections", {
      mapId: args.mapId,
      sourceGroupId: args.sourceGroupId,
      targetGroupId: args.targetGroupId,
      type: args.type,
      label: args.label,
      strength: args.strength,
      createdBy: identity.subject,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return connectionId;
  },
});

// 🆕 RÉCUPÉRER LES CONNECTIONS D'UNE MAP
export const getByMap = query({
  args: {
    mapId: v.id("affinityMaps"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const connections = await ctx.db
      .query("groupConnections")
      .withIndex("by_map", q => q.eq("mapId", args.mapId))
      .collect();

    return connections;
  },
});

// 🆕 METTRE À JOUR UNE CONNECTION
export const updateConnection = mutation({
  args: {
    connectionId: v.id("groupConnections"),
    updates: v.object({
      type: v.optional(v.union(
        v.literal("related"),
        v.literal("hierarchy"),
        v.literal("dependency"),
        v.literal("contradiction")
      )),
      label: v.optional(v.string()),
      strength: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const connection = await ctx.db.get(args.connectionId);
    if (!connection) throw new Error("Connection not found");

    // Vérifier les permissions (seul le créateur peut modifier)
    if (connection.createdBy !== identity.subject) {
      throw new Error("Only the connection creator can update it");
    }

    await ctx.db.patch(args.connectionId, {
      ...args.updates,
      updatedAt: Date.now(),
    });
  },
});

// 🆕 SUPPRIMER UNE CONNECTION
export const deleteConnection = mutation({
  args: {
    connectionId: v.id("groupConnections"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const connection = await ctx.db.get(args.connectionId);
    if (!connection) throw new Error("Connection not found");

    // Vérifier les permissions (seul le créateur peut supprimer)
    if (connection.createdBy !== identity.subject) {
      throw new Error("Only the connection creator can delete it");
    }

    await ctx.db.delete(args.connectionId);
  },
});

// 🆕 RÉCUPÉRER LES CONNECTIONS D'UN GROUPE
export const getByGroup = query({
  args: {
    groupId: v.string(),
    mapId: v.id("affinityMaps"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const connections = await ctx.db
      .query("groupConnections")
      .withIndex("by_map", q => q.eq("mapId", args.mapId))
      .collect();

    return connections.filter(
      conn => 
        conn.sourceGroupId === args.groupId || 
        conn.targetGroupId === args.groupId
    );
  },
});

