"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import type { DotVotingSession, DotVote, VotingPhase } from "@/types";
import { useAuth } from "@clerk/nextjs";

interface UseDotVotingOptions {
  mapId: string;
  projectId: string;
}

interface UseDotVotingReturn {
  isLoading: boolean;
  session: DotVotingSession | null;
  allDots: DotVote[];
  myDots: DotVote[];
  canVote: boolean;
  votingPhase: VotingPhase;
  isSilentMode: boolean;
  isCreator: boolean;
  remainingTime: number | null;
  createSession: (name: string, maxDots: number, silentMode: boolean, durationMinutes?: number) => Promise<void>;
  startNewVote: () => Promise<void>;
  placeDot: (sectionId: string, position: { x: number; y: number }) => Promise<boolean>;
  removeDot: (dotId: Id<"dotVotes">) => Promise<void>;
  stopAndReveal: () => Promise<void>;
  resetMyVotes: () => Promise<void>;
}

export function useDotVoting({ mapId, projectId }: UseDotVotingOptions): UseDotVotingReturn {
  const [isLoading, setIsLoading] = useState(false);
  const { userId } = useAuth();
  const hasMapId = !!mapId && !!projectId;

  // Get current session (most recent one)
  const activeSessions = useQuery(
    api.dotVoting.getActiveSessions,
    hasMapId ? { mapId: mapId as Id<"affinityMaps"> } : "skip"
  );
  
  const session = activeSessions && activeSessions.length > 0 ? activeSessions[0] : null;

  // Get dots for this session
  const allDots = useQuery(
    api.dotVoting.getSessionDots,
    session ? { sessionId: session._id } : "skip"
  );

  const myDots = useQuery(
    api.dotVoting.getMyDots,
    session ? { sessionId: session._id } : "skip"
  );

  // Mutations
  const createSessionMutation = useMutation(api.dotVoting.createSession);
  const placeDotMutation = useMutation(api.dotVoting.placeDot);
  const removeDotMutation = useMutation(api.dotVoting.removeDot);
  const stopAndRevealMutation = useMutation(api.dotVoting.stopAndReveal);

  // Calculate remaining time
  const remainingTime = useMemo(() => {
    if (!session?.durationMinutes || !session?.startTime || session.votingPhase !== "voting") {
      return null;
    }
    const elapsed = Date.now() - session.startTime;
    const remaining = (session.durationMinutes * 60 * 1000) - elapsed;
    return Math.max(0, remaining);
  }, [session?.durationMinutes, session?.startTime, session?.votingPhase]);

  // Auto-reveal when timer expires (creator only)
  const isCreator = session?.createdBy === userId;
  
  const stopAndReveal = useCallback(async () => {
    if (!session) return;
    try {
      await stopAndRevealMutation({ sessionId: session._id });
    } catch (error) {
      console.error("Failed to stop and reveal:", error);
    }
  }, [session, stopAndRevealMutation]);

  useEffect(() => {
    if (remainingTime === 0 && isCreator && session?.votingPhase === "voting") {
      stopAndReveal();
    }
  }, [remainingTime, isCreator, session?.votingPhase, stopAndReveal]);

  // Create a new voting session
  const createSession = useCallback(async (name: string, maxDots: number, silentMode: boolean, durationMinutes?: number) => {
    if (!hasMapId) return;
    setIsLoading(true);
    try {
      await createSessionMutation({
        projectId: projectId as Id<"projects">,
        mapId: mapId as Id<"affinityMaps">,
        name,
        maxDotsPerUser: maxDots,
        isSilentMode: silentMode,
        durationMinutes: durationMinutes ?? undefined,
      });
    } catch (error) {
      console.error("Failed to create voting session:", error);
    } finally {
      setIsLoading(false);
    }
  }, [hasMapId, mapId, projectId, createSessionMutation]);

  // Start a new vote - clear all dots and create new session
  const startNewVote = useCallback(async () => {
    if (!session) return;
    setIsLoading(true);
    try {
      const dotsToDelete = allDots || [];
      for (const dot of dotsToDelete) {
        await removeDotMutation({ dotId: dot._id });
      }
      await createSessionMutation({
        projectId: projectId as Id<"projects">,
        mapId: mapId as Id<"affinityMaps">,
        name: "Voting Session",
        maxDotsPerUser: session.maxDotsPerUser,
        isSilentMode: session.isSilentMode,
        durationMinutes: session.durationMinutes ?? undefined,
      });
    } catch (error) {
      console.error("Failed to start new vote:", error);
    } finally {
      setIsLoading(false);
    }
  }, [session, allDots, projectId, mapId, createSessionMutation, removeDotMutation]);

  // Place a dot on a section
  const placeDot = useCallback(async (sectionId: string, position: { x: number; y: number }): Promise<boolean> => {
    if (!session) return false;
    setIsLoading(true);
    try {
      const result = await placeDotMutation({
        sessionId: session._id,
        targetType: "group",
        targetId: sectionId,
        position,
      });
      return result.success;
    } catch (error) {
      console.error("Failed to place dot:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [session, placeDotMutation]);

  // Remove a dot
  const removeDot = useCallback(async (dotId: Id<"dotVotes">) => {
    try {
      await removeDotMutation({ dotId });
    } catch (error) {
      console.error("Failed to remove dot:", error);
    }
  }, [removeDotMutation]);

  // Reset my votes
  const resetMyVotes = useCallback(async () => {
    if (!myDots) return;
    for (const dot of myDots) {
      await removeDotMutation({ dotId: dot._id });
    }
  }, [myDots, removeDotMutation]);

  return {
    isLoading,
    session,
    allDots: allDots || [],
    myDots: myDots || [],
    canVote: session?.votingPhase === "voting",
    votingPhase: session?.votingPhase || "setup",
    isSilentMode: session?.isSilentMode ?? false,
    isCreator,
    remainingTime,
    createSession,
    startNewVote,
    placeDot,
    removeDot,
    stopAndReveal,
    resetMyVotes,
  };
}