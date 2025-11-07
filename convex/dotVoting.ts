// convex/dotVoting.ts - NOUVEAU FICHIER
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Créer une session de vote
export const createSession = mutation({
  args: {
    projectId: v.id("projects"),
    mapId: v.id("affinityMaps"),
    name: v.string(),
    maxVotesPerUser: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const sessionId = await ctx.db.insert("dotVotingSessions", {
      projectId: args.projectId,
      mapId: args.mapId,
      name: args.name,
      maxVotesPerUser: args.maxVotesPerUser,
      isActive: true,
      createdBy: identity.subject,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return sessionId;
  },
});

// Voter pour un groupe
export const castVote = mutation({
  args: {
    sessionId: v.id("dotVotingSessions"),
    groupId: v.string(),
    votes: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // 🔍 UTILISER L'INDEX pour trouver le vote existant
    const existingVotes = await ctx.db
      .query("votes")
      .withIndex("by_user_group_session", q => 
        q.eq("userId", identity.subject)
         .eq("groupId", args.groupId)
         .eq("sessionId", args.sessionId)
      )
      .collect();

    if (existingVotes.length > 0) {
      // Mettre à jour le vote existant
      await ctx.db.patch(existingVotes[0]._id, {
        votes: args.votes,
        createdAt: Date.now(),
      });
    } else {
      // Créer un nouveau vote
      await ctx.db.insert("votes", {
        sessionId: args.sessionId,
        userId: identity.subject,
        groupId: args.groupId,
        votes: args.votes,
        createdAt: Date.now(),
      });
    }

    // Mettre à jour la date de la session
    const session = await ctx.db.get(args.sessionId);
    if (session) {
      await ctx.db.patch(args.sessionId, {
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});


// Récupérer les résultats d'une session - VERSION CORRIGÉE
export const getSessionResults = query({
  args: {
    sessionId: v.id("dotVotingSessions"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const session = await ctx.db.get(args.sessionId);
    if (!session) return null;

    // Récupérer tous les votes de cette session AVEC INDEX
    const allVotes = await ctx.db
      .query("votes")
      .withIndex("by_session", q => q.eq("sessionId", args.sessionId))
      .collect();

    // Récupérer la map pour avoir les groupes
    const map = await ctx.db.get(session.mapId);
    if (!map) return null;

    // Calculer les totaux par groupe
    const groupTotals = new Map<string, number>();
    const userVotes = new Map<string, number>();

    allVotes.forEach(vote => {
      // Total général
      const currentTotal = groupTotals.get(vote.groupId) || 0;
      groupTotals.set(vote.groupId, currentTotal + vote.votes);

      // Votes de l'utilisateur courant
      if (vote.userId === identity.subject) {
        userVotes.set(vote.groupId, vote.votes);
      }
    });

    // Créer le résumé
    const results = map.groups.map(group => ({
      groupId: group.id,
      totalVotes: groupTotals.get(group.id) || 0,
      userVotes: userVotes.get(group.id) || 0,
      group: group,
    })).sort((a, b) => b.totalVotes - a.totalVotes);

    return {
      session,
      results,
      userTotalVotes: Array.from(userVotes.values()).reduce((sum, votes) => sum + votes, 0),
      maxVotesPerUser: session.maxVotesPerUser,
    };
  },
});

// Récupérer les sessions actives d'un projet - VERSION CORRIGÉE
export const getProjectSessions = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("dotVotingSessions")
      .withIndex("by_project", q => q.eq("projectId", args.projectId))
      .order("desc")
      .collect();
  },
});

// 🆕 Récupérer une session spécifique
export const getSession = query({
  args: {
    sessionId: v.id("dotVotingSessions"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db.get(args.sessionId);
  },
});