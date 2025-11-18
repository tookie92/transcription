import { Comment } from "@/types";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const addComment = mutation({
  args: {
    mapId: v.id("affinityMaps"),
    groupId: v.string(),
    text: v.string(),
    userName: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const id = await ctx.db.insert("comments", {
      mapId: args.mapId,
      groupId: args.groupId,
      userId: identity.subject,
      text: args.text,
      resolved: false,
      userName: args.userName,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return id;
  },
});


// convex/comments.ts
export const getMentionsForUser = query({
  args: { mapId: v.id("affinityMaps"), userName: v.string() },
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_map", q => q.eq("mapId", args.mapId))
      .collect();

    // on retourne les groupId où l’user est mentionné
    const mentionedGroupIds = new Set<string>();
    for (const c of comments) {
      if (c.text.includes(`@${args.userName}`)) {
        mentionedGroupIds.add(c.groupId);
      }
    }
    return Array.from(mentionedGroupIds);
  },
});

export const getCommentCountsByMap = query({
  args: { mapId: v.id("affinityMaps") },
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_map", q => q.eq("mapId", args.mapId))
      .collect();

    // ✅ Compte par groupe
    const counts: Record<string, number> = {};
    for (const comment of comments) {
      counts[comment.groupId] = (counts[comment.groupId] || 0) + 1;
    }
    return counts;
  },
});

export const getCommentsByGroup = query({
  args: { groupId: v.string(), mapId: v.id("affinityMaps") },
  handler: async (ctx, args): Promise<Comment[]> => {
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_group", q => q.eq("groupId", args.groupId))
      .filter(q => q.eq(q.field("mapId"), args.mapId))
      .order("desc")
      .collect();

    return comments as Comment[];
  },
});

export const markAsViewed = mutation({
  args: {
    commentIds: v.array(v.id("comments")),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    for (const commentId of args.commentIds) {
      await ctx.db.insert("commentViews", {
        commentId,
        userId: args.userId,
        viewedAt: Date.now(),
      });
    }
  },
});

export const getUnreadCount = query({
  args: { groupId: v.string(), userId: v.string(), mapId: v.id("affinityMaps") },
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_group", q => q.eq("groupId", args.groupId))
      .filter(q => q.eq(q.field("mapId"), args.mapId))
      .collect();

    let unread = 0;

    for (const comment of comments) {
      const viewed = await ctx.db
        .query("commentViews")
        .withIndex("by_user_comment", q => q.eq("userId", args.userId).eq("commentId", comment._id))
        .first();

      if (!viewed) unread++;
    }

    return unread;
  },
});