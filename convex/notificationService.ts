// convex/notificationService.ts - NOUVEAU FICHIER

import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const broadcastGroupCreated = mutation({
  args: {
    mapId: v.id("affinityMaps"),
    clusterId: v.string(),
    clusterTitle: v.string(),
    createdByUserId: v.string(),
    createdByUserName: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // 🎯 RÉCUPÉRER TOUS LES MEMBRES DU PROJET (SAUF LE CRÉATEUR)
    const map = await ctx.db.get(args.mapId);
    if (!map) throw new Error("Map not found");

    const project = await ctx.db.get(map.projectId);
    if (!project) throw new Error("Project not found");

    const members = project.members.filter(member => 
      member.userId !== args.createdByUserId
    );

    // 🎯 CRÉER LES NOTIFICATIONS POUR CHAQUE MEMBRE
    for (const member of members) {
      await ctx.db.insert("notifications", {
        userId: member.userId,
        type: "group_created",
        title: "Nouveau groupe créé",
        message: `${args.createdByUserName} a créé le groupe "${args.clusterTitle}"`,
        relatedId: args.clusterId,
        relatedType: "group",
        actionUrl: `/project/${project._id}/affinity?focus=${args.clusterId}`,
        read: false,
        createdAt: Date.now(),
      });
    }
  },
});

export const broadcastCommentAdded = mutation({
  args: {
    mapId: v.id("affinityMaps"),
    groupId: v.string(),
    groupTitle: v.string(),
    commentByUserId: v.string(),
    commentByUserName: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const map = await ctx.db.get(args.mapId);
    if (!map) throw new Error("Map not found");

    const project = await ctx.db.get(map.projectId);
    if (!project) throw new Error("Project not found");

    const members = project.members.filter(member => 
      member.userId !== args.commentByUserId
    );

    for (const member of members) {
      await ctx.db.insert("notifications", {
        userId: member.userId,
        type: "comment_added",
        title: "Nouveau commentaire",
        message: `${args.commentByUserName} a commenté sur "${args.groupTitle}"`,
        relatedId: args.groupId,
        relatedType: "group",
        actionUrl: `/project/${project._id}/affinity?focus=${args.groupId}`,
        read: false,
        createdAt: Date.now(),
      });
    }
  },
});

export const broadcastInsightMoved = mutation({
  args: {
    mapId: v.id("affinityMaps"),
    fromGroupId: v.string(),
    toGroupId: v.string(),
    fromGroupTitle: v.string(),
    toGroupTitle: v.string(),
    movedByUserId: v.string(),
    movedByUserName: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const map = await ctx.db.get(args.mapId);
    if (!map) throw new Error("Map not found");

    const project = await ctx.db.get(map.projectId);
    if (!project) throw new Error("Project not found");

    const members = project.members.filter(member => 
      member.userId !== args.movedByUserId
    );

    for (const member of members) {
      await ctx.db.insert("notifications", {
        userId: member.userId,
        type: "insight_moved",
        title: "Insight déplacé",
        message: `${args.movedByUserName} a déplacé un insight de "${args.fromGroupTitle}" vers "${args.toGroupTitle}"`,
        relatedId: args.toGroupId,
        relatedType: "group",
        actionUrl: `/project/${project._id}/affinity?focus=${args.toGroupId}`,
        read: false,
        createdAt: Date.now(),
      });
    }
  },
});