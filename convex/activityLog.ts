// convex/activityLog.ts - VERSION AVEC TYPES STRICTS

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ActivityAction, ActivityDetails, ConvexActivityLog } from "@/types";

// 🎯 SCHÉMA VALIDATION POUR LES DÉTAILS
const activityDetailsSchema = v.optional(v.object({
  from: v.optional(v.union(
    v.object({ x: v.number(), y: v.number() }),
    v.string()
  )),
  to: v.optional(v.union(
    v.object({ x: v.number(), y: v.number() }),
    v.string()
  )),
  insightId: v.optional(v.string()),
  mentionedUserId: v.optional(v.string()),
  color: v.optional(v.string()),
  content: v.optional(v.string()),
  elementIds: v.optional(v.array(v.string())),
}));

export const logActivity = mutation({
  args: {
    mapId: v.id("affinityMaps"),
    action: v.union(
      // Legacy affinity map actions
      v.literal("group_created"),
      v.literal("group_moved"),
      v.literal("group_renamed"),
      v.literal("group_deleted"),
      v.literal("insight_added"),
      v.literal("insight_removed"),
      v.literal("insight_moved"),
      v.literal("comment_added"),
      v.literal("user_mentioned"),
      // FigJam board actions
      v.literal("sticky_created"),
      v.literal("sticky_moved"),
      v.literal("sticky_resized"),
      v.literal("sticky_updated"),
      v.literal("sticky_deleted"),
      v.literal("sticky_duplicated"),
      v.literal("section_created"),
      v.literal("section_moved"),
      v.literal("section_resized"),
      v.literal("section_renamed"),
      v.literal("section_deleted"),
      v.literal("elements_grouped"),
      // AI Grouping actions
      v.literal("ai_cluster_created"),
      v.literal("ai_suggestions_generated"),
      v.literal("ai_rename_applied"),
    ),
    targetId: v.string(),
    targetName: v.optional(v.string()),
    details: activityDetailsSchema,
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    
    // Allow logging without authentication for testing, but try to get user info if available
    const userId = identity?.subject || "anonymous";
    const userName = identity?.name || identity?.email || "Anonymous User";

    await ctx.db.insert("activityLog", {
      mapId: args.mapId,
      userId,
      userName,
      action: args.action,
      targetId: args.targetId,
      targetName: args.targetName,
      details: args.details,
      timestamp: Date.now(),
    });
  },
});

export const getActivityForMap = query({
  args: {
    mapId: v.id("affinityMaps"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const activities = await ctx.db
      .query("activityLog")
      .withIndex("by_map", (q) => q.eq("mapId", args.mapId))
      .order("desc")
      .take(args.limit || 50);

    return activities;
  },
});