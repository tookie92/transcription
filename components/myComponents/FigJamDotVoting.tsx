"use client";

import { useState, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { DotVotingSession, DotVote, VotingHistoryItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Vote, 
  Eye, 
  EyeOff, 
  Users, 
  CheckCircle2, 
  XCircle,
  Zap,
  Settings
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface FigJamDotVotingProps {
  mapId: string;
  projectId: string;
  groups: { id: string; title: string; color: string; insightIds: string[] }[];
  userId?: string;
  userName?: string;
}

export function FigJamDotVoting({
  mapId,
  projectId,
  groups,
  userId,
  userName = "Anonymous",
}: FigJamDotVotingProps) {
  const [showConfig, setShowConfig] = useState(false);
  const [maxDots, setMaxDots] = useState(3);

  // Queries - use conditional to avoid passing null
  const activeSessions = useQuery(api.dotVoting.getActiveSessions, { mapId: mapId as Id<"affinityMaps"> });
  const session = activeSessions?.[0];
  
  // Only fetch myDots when we have a session
  const myDots = useQuery(
    api.dotVoting.getMyDots,
    session ? { sessionId: session._id } : "skip"
  );

  // Mutations
  const createSession = useMutation(api.dotVoting.createSession);
  const placeDot = useMutation(api.dotVoting.placeDot);
  const removeDot = useMutation(api.dotVoting.removeDot);
  const revealVotes = useMutation(api.dotVoting.revealVotes);
  const endSession = useMutation(api.dotVoting.endSession);

  const dotsPlaced = myDots?.length ?? 0;
  const dotsRemaining = maxDots - dotsPlaced;
  const isVotingPhase = session?.votingPhase === "voting";
  const isRevealed = session?.votingPhase === "revealed" || session?.votingPhase === "completed";

  const handleStartVote = async () => {
    try {
      await createSession({
        projectId: projectId as Id<"projects">,
        mapId: mapId as Id<"affinityMaps">,
        name: "Dot Vote",
        maxDotsPerUser: maxDots,
        isSilentMode: false,
      });
      toast.success("Vote started! Click on groups to vote.");
    } catch (error) {
      toast.error("Failed to start vote");
    }
  };

  const handleVote = async (groupId: string) => {
    if (!session || !userId || dotsRemaining <= 0) return;

    try {
      const existingDot = myDots?.find((d: DotVote) => d.targetId === groupId);
      if (existingDot) {
        await removeDot({ dotId: existingDot._id });
        toast.info("Vote removed");
      } else if (dotsRemaining > 0) {
        await placeDot({
          sessionId: session._id,
          targetType: "group",
          targetId: groupId,
          position: { x: 0, y: 0 },
        });
        toast.success(`Vote placed! ${dotsRemaining - 1} remaining`);
      }
    } catch (error) {
      toast.error("Failed to vote");
    }
  };

  const handleReveal = async () => {
    try {
      await revealVotes({ sessionId: session!._id });
      toast.success("Votes revealed!");
    } catch (error) {
      toast.error("Failed to reveal votes");
    }
  };

  const handleEnd = async () => {
    try {
      await endSession({ sessionId: session!._id });
      toast.info("Vote ended");
    } catch (error) {
      toast.error("Failed to end vote");
    }
  };

  // Get vote counts per group (only if revealed)
  const voteCounts = useMemo(() => {
    if (!session) return {};
    const counts: Record<string, number> = {};
    groups.forEach(g => { counts[g.id] = 0; });
    return counts;
  }, [groups, session, isRevealed]);

  // If no session, show start button
  if (!session) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-2">
            <Vote className="w-6 h-6 text-blue-600" />
          </div>
          <CardTitle className="text-lg">Dot Voting</CardTitle>
          <p className="text-sm text-gray-500">Vote anonymously on group priorities</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {!showConfig ? (
            <>
              <div className="flex justify-center gap-2">
                <Button onClick={() => setMaxDots(3)} variant={maxDots === 3 ? "default" : "outline"}>
                  3 votes
                </Button>
                <Button onClick={() => setMaxDots(5)} variant={maxDots === 5 ? "default" : "outline"}>
                  5 votes
                </Button>
                <Button onClick={() => setMaxDots(10)} variant={maxDots === 10 ? "default" : "outline"}>
                  10 votes
                </Button>
              </div>
              <Button onClick={handleStartVote} className="w-full" size="lg">
                <Zap className="w-4 h-4 mr-2" />
                Start Voting
              </Button>
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Votes per person:</span>
                <Badge variant="outline">{maxDots}</Badge>
              </div>
              <Button onClick={handleStartVote} className="w-full" size="lg">
                <Zap className="w-4 h-4 mr-2" />
                Start
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Vote className="w-5 h-5 text-blue-600" />
          <span className="font-medium">Dot Voting</span>
          <Badge variant={isVotingPhase ? "default" : isRevealed ? "secondary" : "outline"}>
            {isVotingPhase ? "Voting" : isRevealed ? "Revealed" : "Setup"}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {isVotingPhase && (
            <Button size="sm" variant="outline" onClick={handleReveal}>
              <Eye className="w-4 h-4 mr-1" />
              Reveal
            </Button>
          )}
          {(isRevealed || !isVotingPhase) && (
            <Button size="sm" variant="destructive" onClick={handleEnd}>
              <XCircle className="w-4 h-4 mr-1" />
              End
            </Button>
          )}
        </div>
      </div>

      {/* Voting Status */}
      {isVotingPhase && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {dotsRemaining > 0 ? (
              <>
                <div className="flex gap-1">
                  {Array.from({ length: maxDots }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-3 h-3 rounded-full ${
                        i < dotsPlaced ? "bg-blue-600" : "bg-gray-300"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-blue-700">
                  {dotsRemaining} vote{dotsRemaining !== 1 ? "s" : ""} remaining
                </span>
              </>
            ) : (
              <span className="text-sm text-blue-700 font-medium">All votes used!</span>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-blue-600">
            <EyeOff className="w-3 h-3" />
            <span>Votes are hidden</span>
          </div>
        </div>
      )}

      {/* Groups to vote on */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Click to vote</span>
          <span>{groups.length} groups</span>
        </div>
        {groups.map((group) => {
          const hasVoted = myDots?.some((d: DotVote) => d.targetId === group.id);
          const voteCount = voteCounts[group.id] || 0;
          
          return (
            <motion.div
              key={group.id}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className={`
                flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all
                ${hasVoted 
                  ? "border-blue-500 bg-blue-50" 
                  : "border-gray-200 hover:border-gray-300 bg-white"
                }
              `}
              onClick={() => isVotingPhase && handleVote(group.id)}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: group.color }}
                />
                <span className="font-medium truncate max-w-[200px]">{group.title}</span>
                <Badge variant="outline" className="text-xs">
                  {group.insightIds.length} insights
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                {/* User's own vote indicator */}
                {hasVoted && (
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  </div>
                )}
                {/* Vote count (only shown when revealed) */}
                {isRevealed && voteCount > 0 && (
                  <Badge className="bg-green-500">{voteCount}</Badge>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Results when revealed */}
      {isRevealed && groups.length > 0 && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h4 className="font-medium text-green-800 mb-2 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Results
          </h4>
          <div className="space-y-1">
            {[...groups]
              .sort((a, b) => (voteCounts[b.id] || 0) - (voteCounts[a.id] || 0))
              .slice(0, 3)
              .map((group, index) => (
                <div key={group.id} className="flex items-center gap-2 text-sm">
                  <span className="w-5 h-5 rounded-full bg-green-600 text-white flex items-center justify-center text-xs">
                    {index + 1}
                  </span>
                  <span className="flex-1 truncate">{group.title}</span>
                  <span className="font-medium text-green-700">{voteCounts[group.id] || 0} votes</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
