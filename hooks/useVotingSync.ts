"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAuth, useUser } from "@clerk/nextjs";

export interface ClusterVote {
  clusterId: string;
  votedBy: string;
  votedByName?: string;
  color: string;
  targetType: "group" | "insight";
}

export interface VotingSessionData {
  _id: Id<"dotVotingSessions">;
  projectId: Id<"projects">;
  mapId: Id<"affinityMaps">;
  name: string;
  maxDotsPerUser: number;
  isActive: boolean;
  votingPhase: "setup" | "voting" | "revealed" | "completed";
  isSilentMode: boolean;
  durationMinutes: number | null;
  startTime: number | null;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface DotVoteData {
  _id: Id<"dotVotes">;
  sessionId: Id<"dotVotingSessions">;
  userId: string;
  targetId: string;
  targetType: "group" | "insight";
  color: string;
  position: { x: number; y: number };
  createdAt: number;
}

const USER_COLORS = [
  "#EF4444", "#F59E0B", "#10B981", "#3B82F6",
  "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16"
];

export function useVotingSync(mapId: Id<"affinityMaps"> | undefined, projectId: Id<"projects"> | undefined) {
  const { userId: clerkUserId } = useAuth();
  const { user } = useUser();
  const currentUserId = clerkUserId || "anonymous";
  const currentUserName = user?.fullName || user?.firstName || "Anonymous";

  // Get user's color based on userId
  const userColor = useMemo(() => {
    const hash = currentUserId.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
  }, [currentUserId]);

  // ── Convex Queries ──────────────────────────────────────────────────────────
  const activeSession = useQuery(
    api.affinityMaps.getActiveVotingSession,
    mapId ? { mapId } : "skip"
  );

  const sessionVotes = useQuery(
    api.affinityMaps.getSessionVotes,
    activeSession ? { sessionId: activeSession._id } : "skip"
  );

  const myVotes = useQuery(
    api.affinityMaps.getUserVotes,
    activeSession && currentUserId !== "anonymous" 
      ? { sessionId: activeSession._id, userId: currentUserId } 
      : "skip"
  );

  // ── Convex Mutations ─────────────────────────────────────────────────────────
  const startSession = useMutation(api.affinityMaps.startVotingSession);
  const castVoteMutation = useMutation(api.affinityMaps.castVote);
  const stopVotingMutation = useMutation(api.affinityMaps.stopVoting);
  const completeVotingMutation = useMutation(api.affinityMaps.completeVoting);
  const startNewRoundMutation = useMutation(api.affinityMaps.startNewVoteRound);

  // ── Local State ─────────────────────────────────────────────────────────────
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  /** Participant opted out of this round; session continues for others. */
  const [isSittingOut, setIsSittingOut] = useState(false);

  // Clear sit-out when the room session ends or a new round starts
  useEffect(() => {
    if (!activeSession || activeSession.votingPhase !== "voting") {
      setIsSittingOut(false);
    }
  }, [activeSession?._id, activeSession?.votingPhase]);

  // Timer effect
  useEffect(() => {
    if (activeSession?.isActive && activeSession?.durationMinutes && activeSession?.startTime) {
      const interval = setInterval(() => {
        const elapsed = Date.now() - activeSession.startTime!;
        const totalMs = activeSession.durationMinutes! * 60 * 1000;
        const remaining = totalMs - elapsed;
        
        if (remaining <= 0) {
          stopVotingMutation({ sessionId: activeSession._id }).catch(console.error);
        } else {
          setRemainingTime(remaining);
        }
      }, 1000);

      return () => clearInterval(interval);
    } else {
      setRemainingTime(null);
    }
  }, [activeSession, stopVotingMutation]);

  // ── Computed Values ─────────────────────────────────────────────────────────
  
  // Get votes grouped by cluster
  const votesByCluster = useMemo(() => {
    if (!sessionVotes) return new Map<string, DotVoteData[]>();
    
    const map = new Map<string, DotVoteData[]>();
    for (const vote of sessionVotes) {
      const existing = map.get(vote.targetId) || [];
      existing.push(vote);
      map.set(vote.targetId, existing);
    }
    return map;
  }, [sessionVotes]);

  // Get user's voted clusters
  const myVotedClusters = useMemo(() => {
    if (!myVotes) return new Set<string>();
    return new Set(myVotes.map(v => v.targetId));
  }, [myVotes]);

  // Check if we're in silent mode and should hide other votes
  const isSilentMode = activeSession?.isSilentMode ?? true;
  const isVotingPhase = activeSession?.votingPhase === "voting";
  const isRevealed = activeSession?.votingPhase === "revealed";
  /** True only while this client is participating (not sitting out). */
  const isVoting = isVotingPhase && !isSittingOut;

  // ── Actions ────────────────────────────────────────────────────────────────

  const startVoting = useCallback(async (config: { 
    dotsPerUser: number; 
    durationMinutes: number | null;
    prompt?: string;
  }) => {
    if (!mapId || !projectId) return;
    
    try {
      await startSession({
        projectId,
        mapId,
        name: config.prompt || "Vote",
        maxDotsPerUser: config.dotsPerUser,
        isSilentMode: true, // Always silent during voting
        durationMinutes: config.durationMinutes ?? undefined,
      });
      setIsSittingOut(false);
    } catch (error) {
      console.error("Failed to start voting:", error);
    }
  }, [mapId, projectId, startSession]);

  const toggleVote = useCallback(async (clusterId: string, position?: { x: number; y: number }) => {
    if (!activeSession || !currentUserId || currentUserId === "anonymous") return;
    if (isSittingOut) return;
    
    // Only allow voting during voting phase
    if (activeSession.votingPhase !== "voting") {
      console.log("Voting is not in voting phase");
      return;
    }
    
    // Check if user can vote
    const userVoteCount = myVotes?.length || 0;
    const hasVotedForThis = myVotedClusters.has(clusterId);
    
    if (!hasVotedForThis && userVoteCount >= activeSession.maxDotsPerUser) {
      console.log("No votes remaining");
      return;
    }

    try {
      await castVoteMutation({
        sessionId: activeSession._id,
        userId: currentUserId,
        targetId: clusterId,
        targetType: "group",
        color: userColor,
        position,
      });
    } catch (error) {
      console.error("Failed to cast vote:", error);
    }
  }, [activeSession, currentUserId, myVotes, myVotedClusters, castVoteMutation, userColor, isSittingOut]);

  const stopVoting = useCallback(async () => {
    if (!activeSession) return;
    
    try {
      await stopVotingMutation({ sessionId: activeSession._id });
      setIsSittingOut(false);
    } catch (error) {
      console.error("Failed to stop voting:", error);
    }
  }, [activeSession, stopVotingMutation]);

  /** Sit out of this round locally; room session stays open for others. */
  const leaveVoting = useCallback(() => {
    setIsSittingOut(true);
  }, []);

  const joinVoting = useCallback(() => {
    if (activeSession?.votingPhase === "voting") {
      setIsSittingOut(false);
    }
  }, [activeSession?.votingPhase]);

  const completeVoting = useCallback(async () => {
    if (!activeSession) return;
    
    try {
      await completeVotingMutation({ sessionId: activeSession._id });
    } catch (error) {
      console.error("Failed to complete voting:", error);
    }
  }, [activeSession, completeVotingMutation]);

  const startNewRound = useCallback(async () => {
    if (!activeSession) return;
    
    try {
      await startNewRoundMutation({ sessionId: activeSession._id });
      setIsSittingOut(false);
    } catch (error) {
      console.error("Failed to start new round:", error);
    }
  }, [activeSession, startNewRoundMutation]);

  // Get votes to display (filter based on silent mode)
  const getClusterVotes = useCallback((clusterId: string): ClusterVote[] => {
    const votes = votesByCluster.get(clusterId) || [];
    
    if (isSilentMode && isVotingPhase) {
      // During silent voting, only show own votes
      return votes
        .filter(v => v.userId === currentUserId)
        .map(v => ({
          clusterId: v.targetId,
          votedBy: v.userId,
          color: v.color,
          targetType: v.targetType,
        }));
    }
    
    // After reveal or not silent, show all votes
    return votes.map(v => ({
      clusterId: v.targetId,
      votedBy: v.userId,
      color: v.color,
      targetType: v.targetType,
    }));
  }, [votesByCluster, isSilentMode, isVotingPhase, currentUserId]);

  // Check if user has voted for a cluster
  const hasUserVotedFor = useCallback((clusterId: string): boolean => {
    return myVotedClusters.has(clusterId);
  }, [myVotedClusters]);

  // Get remaining votes
  const getUserVotesRemaining = useCallback((): number => {
    if (!activeSession) return 0;
    const userVoteCount = myVotes?.length || 0;
    return Math.max(0, activeSession.maxDotsPerUser - userVoteCount);
  }, [activeSession, myVotes]);

  const maxDots = activeSession?.maxDotsPerUser ?? 0;
  const myVotesCount = myVotes?.length || 0;
  const isSpent = isVoting && maxDots > 0 && myVotesCount >= maxDots;

  /** Team pocket status (counts + who — no packet spoiler during silent round). */
  const roundStats = useMemo(() => {
    if (!sessionVotes || !activeSession) {
      return {
        placing: 0,
        spent: 0,
        stickersPlaced: 0,
        voterCount: 0,
        placingUserIds: [] as string[],
        spentUserIds: [] as string[],
      };
    }
    const byUser = new Map<string, number>();
    for (const vote of sessionVotes) {
      byUser.set(vote.userId, (byUser.get(vote.userId) || 0) + 1);
    }
    const placingUserIds: string[] = [];
    const spentUserIds: string[] = [];
    for (const [userId, count] of byUser) {
      if (count >= activeSession.maxDotsPerUser) spentUserIds.push(userId);
      else placingUserIds.push(userId);
    }
    // Current user may not have cast yet — still "placing" while in the round
    if (
      isVoting &&
      currentUserId !== "anonymous" &&
      !byUser.has(currentUserId)
    ) {
      placingUserIds.push(currentUserId);
    }
    return {
      placing: placingUserIds.length,
      spent: spentUserIds.length,
      stickersPlaced: sessionVotes.length,
      voterCount: byUser.size,
      placingUserIds,
      spentUserIds,
    };
  }, [sessionVotes, activeSession, isVoting, currentUserId]);

  const flipVoting = stopVoting;

  return {
    // Session state
    session: activeSession as VotingSessionData | null,
    /** Participating in this round (session voting && not sitting out). */
    isVoting,
    /** Room session is in voting phase (even if this client sat out). */
    isSessionVoting: isVotingPhase,
    isSittingOut,
    isSpent,
    isRevealed,
    isSilentMode,
    remainingTime,
    userColor,
    roundStats,
    
    // User's votes
    myVotes: myVotedClusters,
    myVotesCount,
    
    // Raw votes with user IDs (for displaying voter names)
    sessionVotes,
    
    // Actions
    startVoting,
    stopVoting,
    flipVoting,
    leaveVoting,
    joinVoting,
    completeVoting,
    startNewRound,
    toggleVote,
    
    // Helpers
    getClusterVotes,
    hasUserVotedFor,
    getUserVotesRemaining,
  };
}
