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
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || identity.subject !== args.userId) return;
    // console.log("🧪 Mutation upsert appelée avec :", args);
    // console.log("🧪 Ligne créée avec _id :", identity);

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
    if (!identity) return [];

    const presence = await ctx.db
      .query("presence")
      .withIndex("by_map", q => q.eq("mapId", args.mapId))
      .collect();

    return presence.filter(p => p.userId !== identity.subject);
  },
});