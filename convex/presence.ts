import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const upsert = mutation({
  args: {
    mapId: v.id("affinityMaps"),
    userId: v.string(),
    cursor: v.object({ x: v.number(), y: v.number() }),
    selection: v.array(v.string()),
    user: v.object({
      id: v.string(),
      name: v.string(),
      avatar: v.optional(v.string()),
    }),
    cursorColor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || identity.subject !== args.userId) {
      return;
    }

    const CURSOR_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6", "#3b82f6", "#8b5cf6", "#ec4899"];
    const randomColor = CURSOR_COLORS[Math.floor(Math.random() * CURSOR_COLORS.length)];

    const existing = await ctx.db
      .query("presence")
      .withIndex("by_user_map", q => q.eq("userId", args.userId).eq("mapId", args.mapId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        cursor: args.cursor,
        selection: args.selection,
        lastSeen: Date.now(),
      });
    } else {
      await ctx.db.insert("presence", {
        mapId: args.mapId,
        userId: args.userId,
        cursor: args.cursor,
        selection: args.selection,
        user: args.user,
        cursorColor: args.cursorColor || randomColor,
        lastSeen: Date.now(),
      });
    }
  },
});

export const remove = mutation({
  args: {
    mapId: v.id("affinityMaps"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("presence")
      .withIndex("by_user_map", q => q.eq("userId", args.userId).eq("mapId", args.mapId))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

export const getByMap = query({
  args: { mapId: v.id("affinityMaps") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    console.log("[getByMap] identity:", identity?.subject, "mapId:", args.mapId);
    if (!identity) return [];

    const presence = await ctx.db
      .query("presence")
      .withIndex("by_map", q => q.eq("mapId", args.mapId))
      .collect();

    console.log("[getByMap] raw presence:", presence.length, presence.map(p => p.userId));
    return presence.filter(p => p.userId !== identity.subject);
  },
});