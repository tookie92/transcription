// convex/dotVoting.ts - VERSION AVEC TYPES STRICTS

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { DotVotingSession, Vote, SessionResults, GroupVoteResult, VoteDetail } from "@/types";
import { Id } from "@/convex/_generated/dataModel";

// 🎯 INTERFACE POUR LES MISES À JOUR DE SESSION
interface SessionUpdates {
  votingPhase?: "setup" | "voting" | "revealed" | "completed";
  revealAt?: number;
  updatedAt: number;
}


// 🎯 CRÉER UN DOT INDIVIDUEL (DRAG & DROP)
export const createDot = mutation({
  args: {
    sessionId: v.id("dotVotingSessions"),
    groupId: v.string(),
    position: v.object({ x: v.number(), y: v.number() }),
    color: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; voteId?: Id<"votes"> }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");

    if (session.votingPhase !== "voting" && session.votingPhase !== "setup") {
      throw new Error("Voting phase is not active");
    }

    const userDots = await ctx.db
      .query("votes")
      .withIndex("by_session", q => q.eq("sessionId", args.sessionId))
      .filter(q => q.eq(q.field("userId"), identity.subject))
      .collect();

    const totalDots = userDots.reduce((sum, dot) => sum + dot.votes, 0);

    if (totalDots >= session.maxVotesPerUser) {
      return { success: false };
    }

    const voteId = await ctx.db.insert("votes", {
      sessionId: args.sessionId,
      userId: identity.subject,
      groupId: args.groupId,
      votes: 1,
      color: args.color,
      isVisible: session.votingPhase === "voting" ? false : true,
      position: args.position,
      dotSize: 24, // 🎯 BIEN DÉFINI
      zIndex: Date.now(), // 🎯 BIEN DÉFINI
      isDragging: false, // 🎯 BIEN DÉFINI
      createdAt: Date.now(),
    });

    await ctx.db.patch(args.sessionId, {
      updatedAt: Date.now(),
    });

    return { success: true, voteId };
  },
});


// 🎯 DÉPLACER UN DOT EXISTANT
export const moveDot = mutation({
  args: {
    voteId: v.id("votes"),
    newGroupId: v.string(),
    newPosition: v.object({ x: v.number(), y: v.number() }),
  },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const vote = await ctx.db.get(args.voteId);
    if (!vote) throw new Error("Vote not found");

    if (vote.userId !== identity.subject) {
      throw new Error("Can only move your own dots");
    }

    const session = await ctx.db.get(vote.sessionId);
    if (!session) throw new Error("Session not found");

    if (session.votingPhase !== "voting" && session.votingPhase !== "setup") {
      throw new Error("Cannot move dots in current phase");
    }

    await ctx.db.patch(args.voteId, {
      groupId: args.newGroupId,
      position: args.newPosition,
      zIndex: Date.now(), // 🎯 METTRE À JOUR L'ORDRE D'AFFICHAGE
    });

    await ctx.db.patch(vote.sessionId, {
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});


// 🎯 SUPPRIMER UN DOT
export const removeDot = mutation({
  args: {
    voteId: v.id("votes"),
  },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const vote = await ctx.db.get(args.voteId);
    if (!vote) throw new Error("Vote not found");

    if (vote.userId !== identity.subject) {
      throw new Error("Can only remove your own dots");
    }

    await ctx.db.delete(args.voteId);

    const session = await ctx.db.get(vote.sessionId);
    if (session) {
      await ctx.db.patch(vote.sessionId, {
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

// 🎯 METTRE À JOUR LA POSITION D'UN DOT (DRAG EN COURS)
export const updateDotPosition = mutation({
  args: {
    voteId: v.id("votes"),
    position: v.object({ x: v.number(), y: v.number() }),
    isDragging: v.boolean(),
  },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const vote = await ctx.db.get(args.voteId);
    if (!vote || vote.userId !== identity.subject) {
      return { success: false };
    }

    await ctx.db.patch(args.voteId, {
      position: args.position,
      isDragging: args.isDragging,
      zIndex: Date.now(), // 🎯 TOUJOURS AU-DESSUS PENDANT LE DRAG
    });

    return { success: true };
  },
});

// 🎯 RÉCUPÉRER LES DOTS D'UN GROUPE (POUR L'AFFICHAGE)
export const getGroupDots = query({
  args: {
    sessionId: v.id("dotVotingSessions"),
    groupId: v.string(),
  },
  handler: async (ctx, args): Promise<Vote[]> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const dots = await ctx.db
      .query("votes")
      .withIndex("by_session_group", q => 
        q.eq("sessionId", args.sessionId)
         .eq("groupId", args.groupId)
      )
      .collect();

    // 🎯 FILTRER LA VISIBILITÉ
    const session = await ctx.db.get(args.sessionId);
    const visibleDots = session?.votingPhase === "voting" 
      ? dots.filter(dot => dot.userId === identity.subject || dot.isVisible)
      : dots.filter(dot => dot.isVisible);

    return visibleDots as Vote[];
  },
});




// fin new Dot

// 🎯 CRÉER UNE SESSION AVEC VOTE INVISIBLE
export const createSession = mutation({
  args: {
    projectId: v.id("projects"),
    mapId: v.id("affinityMaps"),
    name: v.string(),
    maxVotesPerUser: v.number(),
    allowRevoting: v.optional(v.boolean()),
    showResults: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<Id<"dotVotingSessions">> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const sessionId = await ctx.db.insert("dotVotingSessions", {
      projectId: args.projectId,
      mapId: args.mapId,
      name: args.name,
      maxVotesPerUser: args.maxVotesPerUser,
      isActive: true,
      votingPhase: "setup",
      allowRevoting: args.allowRevoting ?? true,
      showResults: args.showResults ?? true,
      createdBy: identity.subject,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return sessionId;
  },
});

// 🎯 DÉMARRER LA PHASE DE VOTE
export const startVotingPhase = mutation({
  args: {
    sessionId: v.id("dotVotingSessions"),
    revealAfterMs: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");

    if (session.createdBy !== identity.subject) {
      throw new Error("Only session creator can start voting");
    }

    const updates: SessionUpdates = {
      votingPhase: "voting",
      updatedAt: Date.now(),
    };

    if (args.revealAfterMs) {
      updates.revealAt = Date.now() + args.revealAfterMs;
    }

    await ctx.db.patch(args.sessionId, updates);
    
    const existingVotes = await ctx.db
      .query("votes")
      .withIndex("by_session", q => q.eq("sessionId", args.sessionId))
      .collect();

    for (const vote of existingVotes) {
      await ctx.db.patch(vote._id, { isVisible: false });
    }

    return { success: true };
  },
});

// 🎯 RÉVÉLER LES VOTES
export const revealVotes = mutation({
  args: {
    sessionId: v.id("dotVotingSessions"),
  },
  handler: async (ctx, args): Promise<{ success: boolean; votesRevealed: number }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");

    if (session.createdBy !== identity.subject && session.votingPhase !== "voting") {
      throw new Error("Not authorized to reveal votes");
    }

    const allVotes = await ctx.db
      .query("votes")
      .withIndex("by_session", q => q.eq("sessionId", args.sessionId))
      .collect();

    for (const vote of allVotes) {
      await ctx.db.patch(vote._id, { isVisible: true });
    }

    await ctx.db.patch(args.sessionId, {
      votingPhase: "revealed",
      updatedAt: Date.now(),
    });

    return { success: true, votesRevealed: allVotes.length };
  },
});

// 🎯 PLACER UN VOTE (VERSION INVISIBLE)
export const castVote = mutation({
  args: {
    sessionId: v.id("dotVotingSessions"),
    groupId: v.string(),
    votes: v.number(),
    color: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");

    if (session.votingPhase !== "voting" && session.votingPhase !== "setup") {
      throw new Error("Voting phase is not active");
    }

    const existingVotes = await ctx.db
      .query("votes")
      .withIndex("by_user_group_session", q => 
        q.eq("userId", identity.subject)
         .eq("groupId", args.groupId)
         .eq("sessionId", args.sessionId)
      )
      .collect();

    const userVotes = await ctx.db
      .query("votes")
      .withIndex("by_session", q => q.eq("sessionId", args.sessionId))
      .filter(q => q.eq(q.field("userId"), identity.subject))
      .collect();

    const currentUserTotal = userVotes.reduce((sum, vote) => sum + vote.votes, 0);
    const existingVoteCount = existingVotes.length > 0 ? existingVotes[0].votes : 0;
    const newTotal = currentUserTotal - existingVoteCount + args.votes;

    if (newTotal > session.maxVotesPerUser) {
      throw new Error(`Maximum ${session.maxVotesPerUser} votes allowed`);
    }

    if (existingVotes.length > 0) {
      await ctx.db.patch(existingVotes[0]._id, {
        votes: args.votes,
        color: args.color,
        isVisible: session.votingPhase === "voting" ? false : true,
        createdAt: Date.now(),
      });
    } else {
      await ctx.db.insert("votes", {
        sessionId: args.sessionId,
        userId: identity.subject,
        groupId: args.groupId,
        votes: args.votes,
        color: args.color,
        isVisible: session.votingPhase === "voting" ? false : true,
        position: {
          x: Math.random() * 100,
          y: Math.random() * 100
        },
        createdAt: Date.now(),
      });
    }

    await ctx.db.patch(args.sessionId, {
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// 🎯 RÉCUPÉRER LES RÉSULTATS AVEC VISIBILITÉ CONDITIONNELLE
export const getSessionResults = query({
  args: {
    sessionId: v.id("dotVotingSessions"),
  },
  handler: async (ctx, args): Promise<SessionResults | null> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const session = await ctx.db.get(args.sessionId);
    if (!session) return null;

    const visibleVotes = await ctx.db
      .query("votes")
      .withIndex("by_session_visible", q => 
        q.eq("sessionId", args.sessionId)
         .eq("isVisible", true)
      )
      .collect();

    const myVotes = await ctx.db
      .query("votes")
      .withIndex("by_session", q => q.eq("sessionId", args.sessionId))
      .filter(q => q.eq(q.field("userId"), identity.subject))
      .collect();

    const map = await ctx.db.get(session.mapId);
    if (!map) return null;

    const groupTotals = new Map<string, number>();
    const userVotes = new Map<string, number>();
    const voteDetails = new Map<string, VoteDetail[]>();

    visibleVotes.forEach(vote => {
      const currentTotal = groupTotals.get(vote.groupId) || 0;
      groupTotals.set(vote.groupId, currentTotal + vote.votes);

      if (!voteDetails.has(vote.groupId)) {
        voteDetails.set(vote.groupId, []);
      }
      
      const detail: VoteDetail = {
        userId: vote.userId,
        votes: vote.votes,
        color: vote.color,
        position: vote.position
      };
      
      voteDetails.get(vote.groupId)!.push(detail);
    });

    myVotes.forEach(vote => {
      userVotes.set(vote.groupId, vote.votes);
    });

    const results: GroupVoteResult[] = map.groups.map(group => ({
      groupId: group.id,
      totalVotes: groupTotals.get(group.id) || 0,
      userVotes: userVotes.get(group.id) || 0,
      group: group,
      voteDetails: voteDetails.get(group.id) || [],
    })).sort((a, b) => b.totalVotes - a.totalVotes);

    const sessionResults: SessionResults = {
      session: session as DotVotingSession,
      results,
      userTotalVotes: Array.from(userVotes.values()).reduce((sum, votes) => sum + votes, 0),
      maxVotesPerUser: session.maxVotesPerUser,
      myVotes: myVotes as Vote[],
    };

    return sessionResults;
  },
});

// 🎯 RÉCUPÉRER MES VOTES (TOUJOURS VISIBLES POUR MOI)
export const getMyVotes = query({
  args: {
    sessionId: v.id("dotVotingSessions"),
  },
  handler: async (ctx, args): Promise<Vote[]> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const votes = await ctx.db
      .query("votes")
      .withIndex("by_session", q => q.eq("sessionId", args.sessionId))
      .filter(q => q.eq(q.field("userId"), identity.subject))
      .collect();

    return votes as Vote[];
  },
});

// 🎯 RÉCUPÉRER LES SESSIONS AVEC STATUT
export const getProjectSessions = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args): Promise<DotVotingSession[]> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const sessions = await ctx.db
      .query("dotVotingSessions")
      .withIndex("by_project", q => q.eq("projectId", args.projectId))
      .order("desc")
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