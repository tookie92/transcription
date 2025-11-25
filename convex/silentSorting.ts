// convex/silentSorting.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const startSession = mutation({
  args: {
    mapId: v.id("affinityMaps"),
    duration: v.number(),
    participants: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const sessionId = await ctx.db.insert("silentSessions", {
      mapId: args.mapId,
      phase: "preparation",
      duration: args.duration,
      timeRemaining: args.duration * 60,
      participants: args.participants,
      startedAt: Date.now(),
      rules: {
        noTalking: true,
        independentSorting: true,
        moveFreely: true,
        createGroups: true,
      },
    });

    return sessionId;
  },
});

export const updatePhase = mutation({
  args: {
    sessionId: v.id("silentSessions"),
    phase: v.union(
      v.literal("preparation"),
      v.literal("idle"),
      v.literal("sorting"),
      v.literal("discussion"),
      v.literal("completed")
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    await ctx.db.patch(args.sessionId, {
      phase: args.phase,
    });
  },
});

export const updateTimer = mutation({
  args: {
    sessionId: v.id("silentSessions"),
    timeRemaining: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    await ctx.db.patch(args.sessionId, {
      timeRemaining: args.timeRemaining,
    });
  },
});

export const getActiveSession = query({
  args: {
    mapId: v.id("affinityMaps"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const session = await ctx.db
      .query("silentSessions")
      .withIndex("by_map", q => q.eq("mapId", args.mapId))
      .filter(q => q.neq(q.field("phase"), "completed"))
      .first();

    return session;
  },
});