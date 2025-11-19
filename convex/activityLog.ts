// convex/activityLog.ts - NOUVEAU FICHIER

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const logActivity = mutation({
  args: {
    mapId: v.id("affinityMaps"),
    action: v.union(
      v.literal("group_created"),
      v.literal("group_moved"),
      v.literal("group_renamed"),
      v.literal("group_deleted"),
      v.literal("insight_added"), 
      v.literal("insight_removed"),
      v.literal("insight_moved"),
      v.literal("comment_added"),
      v.literal("user_mentioned")
    ),
    targetId: v.string(),
    targetName: v.optional(v.string()),
    details: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    await ctx.db.insert("activityLog", {
      mapId: args.mapId,
      userId: identity.subject,
      userName: identity.name || identity.email || "Unknown User",
      action: args.action,
      targetId: args.targetId,
      targetName: args.targetName,
      details: args.details,
      timestamp: Date.now(),
    });
  },
});

export const getActivityForMap = query({
  args: { mapId: v.id("affinityMaps"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const activities = await ctx.db
      .query("activityLog")
      .withIndex("by_map", q => q.eq("mapId", args.mapId))
      .order("desc")
      .take(args.limit || 50);

    return activities;
  },
});