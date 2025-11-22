// convex/dotVoting.ts - SYSTÈME COMPLET

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { DotVotingSession, DotVote, VotingHistoryItem } from "@/types";
import { Id } from "@/convex/_generated/dataModel";

// 🎯 PALETTE DE COULEURS PAR DÉFAUT
const DEFAULT_COLORS = [
  "#EF4444", "#F59E0B", "#10B981", "#3B82F6", 
  "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16"
];

// 🎯 CRÉER UNE SESSION DE VOTE
export const createSession = mutation({
  args: {
    projectId: v.id("projects"),
    mapId: v.id("affinityMaps"),
    name: v.string(),
    maxDotsPerUser: v.number(),
    isSilentMode: v.boolean(),
  },
  handler: async (ctx, args): Promise<Id<"dotVotingSessions">> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const sessionId = await ctx.db.insert("dotVotingSessions", {
      projectId: args.projectId,
      mapId: args.mapId,
      name: args.name,
      maxDotsPerUser: args.maxDotsPerUser,
      isActive: true,
      votingPhase: "voting",
      isSilentMode: args.isSilentMode,
      createdBy: identity.subject,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return sessionId;
  },
});

// 🎯 PLACER UN DOT
// convex/dotVoting.ts - CORRECTION DE placeDot
// convex/dotVoting.ts - CORRECTION DU TYPE DE RETOUR

// convex/dotVoting.ts - CORRECTION DE getDotsByTarget
export const getDotsByTarget = query({
  args: {
    sessionId: v.id("dotVotingSessions"),
    targetType: v.union(v.literal("group"), v.literal("insight")),
    targetId: v.string(),
  },
  handler: async (ctx, args): Promise<DotVote[]> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    // 🎯 UTILISER L'INDEX EXISTANT by_session ET FILTRER MANUELLEMENT
    const allSessionDots = await ctx.db
      .query("dotVotes")
      .withIndex("by_session", q => q.eq("sessionId", args.sessionId))
      .collect();

    // 🎯 FILTRER PAR TARGET
    const filteredDots = allSessionDots.filter(dot => 
      dot.targetType === args.targetType && dot.targetId === args.targetId
    );

    return filteredDots as DotVote[];
  },
});
export const placeDot = mutation({
  args: {
    sessionId: v.id("dotVotingSessions"),
    targetType: v.union(v.literal("group"), v.literal("insight")),
    targetId: v.string(),
    position: v.object({ x: v.number(), y: v.number() }),
  },
  handler: async (ctx, args): Promise<{ success: boolean; dotId?: Id<"dotVotes"> }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    console.log('🟢 placeDot called with:', args);

    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      console.log('❌ Session not found:', args.sessionId);
      throw new Error("Session not found");
    }

    if (session.votingPhase !== "voting") {
      console.log('❌ Voting phase not active:', session.votingPhase);
      throw new Error("Voting phase is not active");
    }

    // 🎯 COMPTER LES DOTS EXISTANTS
    const userDots = await ctx.db
      .query("dotVotes")
      .withIndex("by_user_session", q => 
        q.eq("userId", identity.subject)
         .eq("sessionId", args.sessionId)
      )
      .collect();

    console.log('📊 User dots count:', userDots.length, 'Max:', session.maxDotsPerUser);

    if (userDots.length >= session.maxDotsPerUser) {
      console.log('❌ Max dots reached');
      return { success: false }; // 🎯 PAS de dotId ici
    }

    // 🎯 GÉNÉRER UNE COULEUR
    const userHash = identity.subject.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    const userColor = DEFAULT_COLORS[userHash % DEFAULT_COLORS.length];

    console.log('🎨 User color:', userColor);

    // 🎯 CRÉER LE DOT
    try {
      const dotId = await ctx.db.insert("dotVotes", {
        sessionId: args.sessionId,
        userId: identity.subject,
        targetType: args.targetType,
        targetId: args.targetId,
        color: userColor,
        position: args.position,
        createdAt: Date.now(),
      });

      console.log('✅ Dot created successfully:', dotId);

      await ctx.db.patch(args.sessionId, {
        updatedAt: Date.now(),
      });

      return { success: true, dotId }; // 🎯 AJOUTER dotId ICI
    } catch (error) {
      console.error('❌ Error creating dot:', error);
      throw error;
    }
  },
});

// 🎯 DÉPLACER UN DOT
export const moveDot = mutation({
  args: {
    dotId: v.id("dotVotes"),
    newPosition: v.object({ x: v.number(), y: v.number() }),
    newTargetType: v.optional(v.union(v.literal("group"), v.literal("insight"))),
    newTargetId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const dot = await ctx.db.get(args.dotId);
    if (!dot) throw new Error("Dot not found");

    if (dot.userId !== identity.subject) {
      throw new Error("Can only move your own dots");
    }

    const session = await ctx.db.get(dot.sessionId);
    if (!session) throw new Error("Session not found");

    if (session.votingPhase !== "voting") {
      throw new Error("Cannot move dots in current phase");
    }

    const updates: {
      position: { x: number; y: number };
      targetType?: "group" | "insight";
      targetId?: string;
    } = {
      position: args.newPosition,
    };

    if (args.newTargetType && args.newTargetId) {
      updates.targetType = args.newTargetType;
      updates.targetId = args.newTargetId;
    }

    await ctx.db.patch(args.dotId, updates);

    await ctx.db.patch(dot.sessionId, {
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// 🎯 SUPPRIMER UN DOT
export const removeDot = mutation({
  args: {
    dotId: v.id("dotVotes"),
  },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const dot = await ctx.db.get(args.dotId);
    if (!dot) throw new Error("Dot not found");

    if (dot.userId !== identity.subject) {
      throw new Error("Can only remove your own dots");
    }

    await ctx.db.delete(args.dotId);

    const session = await ctx.db.get(dot.sessionId);
    if (session) {
      await ctx.db.patch(dot.sessionId, {
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

// 🎯 RÉVÉLER LES VOTES
export const revealVotes = mutation({
  args: {
    sessionId: v.id("dotVotingSessions"),
  },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");

    if (session.createdBy !== identity.subject) {
      throw new Error("Only session creator can reveal votes");
    }

    await ctx.db.patch(args.sessionId, {
      votingPhase: "revealed",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// 🎯 TERMINER LA SESSION

export const endSession = mutation({
  args: {
    sessionId: v.id("dotVotingSessions"),
  },
  handler: async (ctx, args): Promise<{ success: boolean; historyId?: Id<"votingHistory"> }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");

    if (session.createdBy !== identity.subject) {
      throw new Error("Only session creator can end session");
    }

    // 🎯 RÉCUPÉRER TOUS LES DOTS DE LA SESSION
    const dots = await ctx.db
      .query("dotVotes")
      .withIndex("by_session", q => q.eq("sessionId", args.sessionId))
      .collect();

    // 🎯 CALCULER LES RÉSULTATS PAR GROUPE
    const groupResults = new Map<string, {
      groupId: string;
      totalVotes: number;
      voteDetails: Array<{ userId: string; votes: number; color: string }>;
    }>();

    dots.forEach(dot => {
      if (!groupResults.has(dot.targetId)) {
        groupResults.set(dot.targetId, {
          groupId: dot.targetId,
          totalVotes: 0,
          voteDetails: []
        });
      }
      
      const result = groupResults.get(dot.targetId)!;
      result.totalVotes += 1;
      
      // 🎯 COMPTER LES VOTES PAR UTILISATEUR
      const userVote = result.voteDetails.find(v => v.userId === dot.userId);
      if (userVote) {
        userVote.votes += 1;
      } else {
        result.voteDetails.push({
          userId: dot.userId,
          votes: 1,
          color: dot.color
        });
      }
    });

    // 🎯 RÉCUPÉRER LES TITRES DES GROUPES
    const map = await ctx.db.get(session.mapId);
    if (!map) throw new Error("Affinity map not found");

    const results = Array.from(groupResults.values()).map(result => {
      const group = map.groups.find(g => g.id === result.groupId);
      return {
        groupId: result.groupId,
        groupTitle: group?.title || "Unknown Group",
        totalVotes: result.totalVotes,
        voteDetails: result.voteDetails
      };
    });

    // 🎯 SAUVEGARDER L'HISTORIQUE
    let historyId: Id<"votingHistory"> | undefined;
    if (results.length > 0) {
      historyId = await ctx.db.insert("votingHistory", {
        sessionId: args.sessionId,
        results: results,
        savedBy: identity.subject,
        savedAt: Date.now(),
      });
    }

    // 🎯 TERMINER LA SESSION
    await ctx.db.patch(args.sessionId, {
      votingPhase: "completed",
      isActive: false,
      updatedAt: Date.now(),
    });

    return { success: true, historyId };
  },
});

// 🎯 BASculer LE MODE DISCRET
export const toggleSilentMode = mutation({
  args: {
    sessionId: v.id("dotVotingSessions"),
    isSilentMode: v.boolean(),
  },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");

    if (session.createdBy !== identity.subject) {
      throw new Error("Only session creator can toggle silent mode");
    }

    await ctx.db.patch(args.sessionId, {
      isSilentMode: args.isSilentMode,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// 🎯 RÉCUPÉRER LES DOTS D'UNE SESSION
export const getSessionDots = query({
  args: {
    sessionId: v.id("dotVotingSessions"),
  },
  handler: async (ctx, args): Promise<DotVote[]> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const dots = await ctx.db
      .query("dotVotes")
      .withIndex("by_session", q => q.eq("sessionId", args.sessionId))
      .collect();

    return dots as DotVote[];
  },
});

// 🎯 RÉCUPÉRER MES DOTS
export const getMyDots = query({
  args: {
    sessionId: v.id("dotVotingSessions"),
  },
  handler: async (ctx, args): Promise<DotVote[]> => {
    const identity = await ctx.auth.getUserIdentity();
    
    console.log('🔍 getMyDots called:', {
      hasIdentity: !!identity,
      userId: identity?.subject,
      sessionId: args.sessionId
    });

    if (!identity) {
      console.log('❌ No identity in getMyDots');
      return [];
    }

    const dots = await ctx.db
      .query("dotVotes")
      .withIndex("by_user_session", q => 
        q.eq("userId", identity.subject)
         .eq("sessionId", args.sessionId)
      )
      .collect();

    console.log('📊 getMyDots found:', dots.length, 'dots for user', identity.subject);
    
    return dots as DotVote[];
  },
});

// 🎯 RÉCUPÉRER LES SESSIONS ACTIVES
export const getActiveSessions = query({
  args: {
    mapId: v.id("affinityMaps"),
  },
  handler: async (ctx, args): Promise<DotVotingSession[]> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const sessions = await ctx.db
      .query("dotVotingSessions")
      .withIndex("by_map", q => q.eq("mapId", args.mapId))
      .filter(q => q.eq(q.field("isActive"), true))
      .collect();

    return sessions as DotVotingSession[];
  },
});

// 🎯 RÉCUPÉRER UNE SESSION
export const getSession = query({
  args: {
    sessionId: v.id("dotVotingSessions"),
  },
  handler: async (ctx, args): Promise<DotVotingSession | null> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const session = await ctx.db.get(args.sessionId);
    return session as DotVotingSession | null;
  },
});

export const saveVotingResults = mutation({
  args: {
    sessionId: v.id("dotVotingSessions"),
    results: v.array(v.object({
      groupId: v.string(),
      groupTitle: v.string(),
      totalVotes: v.number(),
      voteDetails: v.array(v.object({
        userId: v.string(),
        votes: v.number(),
        color: v.string(),
      }))
    }))
  },
  handler: async (ctx, args): Promise<Id<"votingHistory">> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // 🎯 VÉRIFIER QUE LA SESSION EXISTE
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");

    // 🎯 CRÉER UN DOCUMENT D'HISTORIQUE
    const historyId = await ctx.db.insert("votingHistory", {
      sessionId: args.sessionId,
      results: args.results,
      savedBy: identity.subject,
      savedAt: Date.now(),
    });

    return historyId;
  },
});

export const getVotingHistory = query({
  args: {
    mapId: v.id("affinityMaps"),
  },
  handler: async (ctx, args): Promise<VotingHistoryItem[]> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    // 🎯 RÉCUPÉRER LES SESSIONS DU MAP
    const sessions = await ctx.db
      .query("dotVotingSessions")
      .withIndex("by_map", q => q.eq("mapId", args.mapId))
      .collect();

    const sessionIds = sessions.map(session => session._id);

    // 🎯 RÉCUPÉRER L'HISTORIQUE DE CES SESSIONS
    const history = await ctx.db
      .query("votingHistory")
      .filter(q => q.or(...sessionIds.map(id => q.eq(q.field("sessionId"), id))))
      .order("desc")
      .collect();

    return history as VotingHistoryItem[];
  },
});