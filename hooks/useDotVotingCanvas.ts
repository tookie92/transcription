"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export function useDotVotingCanvas(mapId: string) {
  const [isPlacingDot, setIsPlacingDot] = useState(false);
  const [activeVotingSession, setActiveVotingSession] = useState<string | null>(null);

  // Queries
  const activeSessions = useQuery(api.dotVoting.getActiveSessions, {
    mapId: mapId as Id<"affinityMaps">,
  });

  const myDots = useQuery(
    api.dotVoting.getMyDots,
    activeSessions && activeSessions.length > 0
      ? { sessionId: activeSessions[0]._id }
      : "skip"
  );

  // Mutation
  const placeDot = useMutation(api.dotVoting.placeDot);

  // Session end handler
  const handleSessionEnd = useCallback(() => {
    console.log("🎯 Session ended - cleaning up state");
    setIsPlacingDot(false);
    setActiveVotingSession(null);
  }, []);

  const toggleDotPlacement = useCallback(() => {
    setIsPlacingDot((prev) => !prev);
  }, []);

  return {
    isPlacingDot,
    setIsPlacingDot,
    activeVotingSession,
    setActiveVotingSession,
    activeSessions,
    myDots,
    placeDot,
    handleSessionEnd,
    toggleDotPlacement,
  };
}
