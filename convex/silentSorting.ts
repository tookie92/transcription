// convex/silentSorting.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const startSilentSorting = mutation({
  args: {
    mapId: v.id("affinityMaps"),
    duration: v.number(), // en secondes
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // 🎯 ARRÊTER TOUTES LES SESSIONS ACTIVES POUR CE MAP
    const activeSessions = await ctx.db
      .query("silentSortingSessions")
      .withIndex("by_map", q => q.eq("mapId", args.mapId))
      .filter(q => q.eq(q.field("isActive"), true))
      .collect();

    for (const session of activeSessions) {
      await ctx.db.patch(session._id, { isActive: false });
    }

    // 🎯 CRÉER UNE NOUVELLE SESSION
    const startTime = Date.now();
    const sessionId = await ctx.db.insert("silentSortingSessions", {
      mapId: args.mapId,
      isActive: true,
      duration: args.duration,
      startTime: startTime,
      endTime: startTime + (args.duration * 1000),
      createdBy: identity.subject,
      participants: [identity.subject],
    });

    return sessionId;
  },
});

export const joinSilentSorting = mutation({
  args: {
    sessionId: v.id("silentSortingSessions"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");

    if (!session.participants.includes(identity.subject)) {
      await ctx.db.patch(args.sessionId, {
        participants: [...session.participants, identity.subject],
      });
    }

    return { success: true };
  },
});

export const endSilentSorting = mutation({
  args: {
    sessionId: v.id("silentSortingSessions"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");

    await ctx.db.patch(args.sessionId, {
      isActive: false,
    });

    return { success: true };
  },
});

export const getActiveSilentSorting = query({
  args: {
    mapId: v.id("affinityMaps"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const session = await ctx.db
      .query("silentSortingSessions")
      .withIndex("by_map", q => q.eq("mapId", args.mapId))
      .filter(q => q.eq(q.field("isActive"), true))
      .first();

    return session;
  },
});