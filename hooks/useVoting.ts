"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Id } from "@/convex/_generated/dataModel";

interface ClusterVote {
  clusterId: string;
  votedBy: string; // userId
  color: string;
  timestamp: number;
}

interface VotingSession {
  id: string;
  dotsPerUser: number;
  durationMinutes: number | null;
  startTime: number;
  votes: ClusterVote[];
  isActive: boolean;
  creatorId: string;
}

const USER_COLORS = [
  "#EF4444", "#F59E0B", "#10B981", "#3B82F6",
  "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16"
];

export function useVoting() {
  const [session, setSession] = useState<VotingSession | null>(null);
  const [userVotes, setUserVotes] = useState<Set<string>>(new Set());
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const userId = "current-user"; // Simplified for demo - in real app would use actual userId
  const userColor = USER_COLORS[0]; // Use first color for demo

  // Start a new voting session
  const startVoting = useCallback((config: { dotsPerUser: number; durationMinutes: number | null }) => {
    const newSession: VotingSession = {
      id: "session-" + Date.now(),
      dotsPerUser: config.dotsPerUser,
      durationMinutes: config.durationMinutes,
      startTime: Date.now(),
      votes: [],
      isActive: true,
      creatorId: userId,
    };
    setSession(newSession);
    setUserVotes(new Set());
  }, [userId]);

  // Stop voting
  const stopVoting = useCallback(() => {
    setSession(prev => prev ? { ...prev, isActive: false } : null);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRemainingTime(null);
  }, []);

  // Vote for a cluster (toggle)
  const toggleVote = useCallback((clusterId: string) => {
    if (!session || !session.isActive) return;

    setSession(prev => {
      if (!prev) return prev;

      // Check if user already voted for this cluster
      const existingVoteIndex = prev.votes.findIndex(
        v => v.clusterId === clusterId && v.votedBy === userId
      );

      // Count user's votes
      const userVoteCount = prev.votes.filter(v => v.votedBy === userId).length;

      if (existingVoteIndex >= 0) {
        // Remove vote
        const newVotes = [...prev.votes];
        newVotes.splice(existingVoteIndex, 1);
        setUserVotes(prevSet => {
          const newSet = new Set(prevSet);
          newSet.delete(clusterId);
          return newSet;
        });
        return { ...prev, votes: newVotes };
      } else {
        // Add vote if under limit
        if (userVoteCount >= prev.dotsPerUser) {
          return prev; // Max votes reached
        }
        const newVote: ClusterVote = {
          clusterId,
          votedBy: userId,
          color: userColor,
          timestamp: Date.now(),
        };
        setUserVotes(prevSet => {
          const newSet = new Set(prevSet);
          newSet.add(clusterId);
          return newSet;
        });
        return { ...prev, votes: [...prev.votes, newVote] };
      }
    });
  }, [session, userId, userColor]);

  // Get vote count for a cluster
  const getClusterVoteCount = useCallback((clusterId: string): number => {
    if (!session) return 0;
    return session.votes.filter(v => v.clusterId === clusterId).length;
  }, [session]);

  // Get all votes for a cluster (for display)
  const getClusterVotes = useCallback((clusterId: string): ClusterVote[] => {
    if (!session) return [];
    return session.votes.filter(v => v.clusterId === clusterId);
  }, [session]);

  // Get total votes
  const getTotalVotes = useCallback((): number => {
    if (!session) return 0;
    return session.votes.length;
  }, [session]);

  // Get user votes remaining
  const getUserVotesRemaining = useCallback((): number => {
    if (!session) return 0;
    const userVoteCount = session.votes.filter(v => v.votedBy === userId).length;
    return Math.max(0, session.dotsPerUser - userVoteCount);
  }, [session, userId]);

  // Timer effect
  useEffect(() => {
    if (session?.isActive && session.durationMinutes) {
      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - session.startTime;
        const totalMs = (session.durationMinutes ?? 0) * 60 * 1000;
        const remaining = totalMs - elapsed;
        
        if (remaining <= 0) {
          stopVoting();
        } else {
          setRemainingTime(remaining);
        }
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [session, stopVoting]);

  return {
    session,
    userVotes,
    remainingTime,
    isVoting: session?.isActive ?? false,
    startVoting,
    stopVoting,
    toggleVote,
    getClusterVoteCount,
    getClusterVotes,
    getTotalVotes,
    getUserVotesRemaining,
    userColor,
  };
}
