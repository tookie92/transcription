import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getBubblesByMap = query({
  args: { mapId: v.id("affinityMaps") },
  handler: async (ctx, args) => {
    const bubbles = await ctx.db
      .query("commentBubbles")
      .withIndex("by_map", (q) => q.eq("mapId", args.mapId))
      .collect();
    return bubbles;
  },
});

export const createBubble = mutation({
  args: {
    mapId: v.id("affinityMaps"),
    position: v.object({
      x: v.number(),
      y: v.number(),
    }),
    targetId: v.optional(v.string()),
    targetType: v.optional(v.union(
      v.literal("sticky"),
      v.literal("label"),
      v.literal("canvas")
    )),
    createdBy: v.string(),
    createdByName: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const bubbleId = await ctx.db.insert("commentBubbles", {
      mapId: args.mapId,
      position: args.position,
      targetId: args.targetId,
      targetType: args.targetType,
      resolved: false,
      createdBy: args.createdBy,
      createdByName: args.createdByName,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return bubbleId;
  },
});

export const updateBubblePosition = mutation({
  args: {
    bubbleId: v.id("commentBubbles"),
    position: v.object({
      x: v.number(),
      y: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const bubble = await ctx.db.get(args.bubbleId);
    if (!bubble) throw new Error("Bubble not found");

    await ctx.db.patch(args.bubbleId, {
      position: args.position,
      updatedAt: Date.now(),
    });

    return args.bubbleId;
  },
});

export const deleteBubble = mutation({
  args: {
    bubbleId: v.id("commentBubbles"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const bubble = await ctx.db.get(args.bubbleId);
    if (!bubble) throw new Error("Bubble not found");

    await ctx.db.delete(args.bubbleId);
    return args.bubbleId;
  },
});

export const resolveBubble = mutation({
  args: {
    bubbleId: v.id("commentBubbles"),
    resolved: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    await ctx.db.patch(args.bubbleId, {
      resolved: args.resolved,
      updatedAt: Date.now(),
    });

    return args.bubbleId;
  },
});

export const linkBubbleToTarget = mutation({
  args: {
    bubbleId: v.id("commentBubbles"),
    targetId: v.optional(v.string()),
    targetType: v.optional(v.union(
      v.literal("sticky"),
      v.literal("label"),
      v.literal("canvas")
    )),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    await ctx.db.patch(args.bubbleId, {
      targetId: args.targetId,
      targetType: args.targetType,
      updatedAt: Date.now(),
    });

    return args.bubbleId;
  },
});
