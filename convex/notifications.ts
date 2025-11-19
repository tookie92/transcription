// convex/notifications.ts - NOUVEAU FICHIER

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexNotification, NotificationType } from "@/types";

export const createNotification = mutation({
  args: {
    userId: v.string(),
    type: v.union(
      v.literal("group_created"),
      v.literal("group_moved"),
      v.literal("group_renamed"),
      v.literal("group_deleted"),
      v.literal("insight_added"),
      v.literal("insight_moved"),
      v.literal("insight_removed"),
      v.literal("comment_added"),
      v.literal("user_mentioned"),
      v.literal("invite_accepted")
    ),
    title: v.string(),
    message: v.string(),
    relatedId: v.optional(v.string()),
    relatedType: v.optional(v.union(
      v.literal("group"),
      v.literal("comment"),
      v.literal("insight"),
      v.literal("project")
    )),
    actionUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Vérifier que l'utilisateur a le droit de créer des notifications
    // (seulement pour les actions qu'il a lui-même effectuées)
    
    await ctx.db.insert("notifications", {
      userId: args.userId,
      type: args.type,
      title: args.title,
      message: args.message,
      relatedId: args.relatedId,
      relatedType: args.relatedType,
      read: false,
      actionUrl: args.actionUrl,
      createdAt: Date.now(),
    });
  },
});

export const getUserNotifications = query({
  args: { 
    limit: v.optional(v.number()),
    unreadOnly: v.optional(v.boolean())
  },
  handler: async (ctx, args): Promise<ConvexNotification[]> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    let query = ctx.db
      .query("notifications")
      .withIndex("by_user", q => q.eq("userId", identity.subject))
      .order("desc");

    if (args.unreadOnly) {
      query = query.filter(q => q.eq(q.field("read"), false));
    }

    const notifications = await query.take(args.limit || 50);
    return notifications as ConvexNotification[];
  },
});

export const getUnreadCount = query({
  args: {},
  handler: async (ctx): Promise<number> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return 0;

    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", q => 
        q.eq("userId", identity.subject).eq("read", false)
      )
      .collect();

    return unreadNotifications.length;
  },
});



export const markAsRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const notification = await ctx.db.get(args.notificationId);
    
    // 🆕 DEBUG
    console.log("📨 Marking as read:", {
      notificationId: args.notificationId,
      currentUser: identity.subject,
      notificationUserId: notification?.userId,
      currentlyRead: notification?.read
    });

    if (!notification || notification.userId !== identity.subject) {
      throw new Error("Notification not found or access denied");
    }

    // 🆕 VÉRIFIER QU'ELLE N'EST PAS DÉJÀ LUE
    if (notification.read) {
      console.log("ℹ️ Notification already read");
      return;
    }

    await ctx.db.patch(args.notificationId, { 
      read: true 
    });

    console.log("✅ Notification marked as read");
  },
});

export const markAllAsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", q => 
        q.eq("userId", identity.subject).eq("read", false)
      )
      .collect();

    for (const notification of unreadNotifications) {
      await ctx.db.patch(notification._id, { read: true });
    }
  },
});

export const createMentionNotification = mutation({
  args: {
    mentionedUserId: v.string(),
    mentionedByUserId: v.string(),
    mentionedByUserName: v.string(),
    groupId: v.string(),
    groupTitle: v.string(),
    projectId: v.string(), // 🆕 AJOUTER POUR CONSTRUIRE L'URL
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    if (identity.subject !== args.mentionedByUserId) {
      throw new Error("Cannot create mention notification for another user");
    }

    await ctx.db.insert("notifications", {
      userId: args.mentionedUserId,
      type: "user_mentioned",
      title: "Vous avez été mentionné",
      message: `${args.mentionedByUserName} vous a mentionné dans le groupe "${args.groupTitle}"`,
      relatedId: args.groupId,
      relatedType: "group",
      actionUrl: `/project/${args.projectId}/affinity?focus=${args.groupId}`,
      read: false,
      createdAt: Date.now(),
    });
  },
});
