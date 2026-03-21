"use client";

import React, { useState, useCallback, useMemo } from "react";
import { AffinityGroup as AffinityGroupType } from "@/types";
import { Vote, Users, Eye, EyeOff, Play, Square, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DotVotingManagerProps {
  clusters: AffinityGroupType[];
  onVote: (clusterId: string) => void;
  onUnvote: (clusterId: string) => void;
  currentUserVotes: string[];
  maxDotsPerPerson: number;
}

export function DotVotingManager({
  clusters,
  onVote,
  onUnvote,
  currentUserVotes,
  maxDotsPerPerson,
}: DotVotingManagerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [sessionName, setSessionName] = useState("Dot Voting Session");
  const [dotsPerPerson, setDotsPerPerson] = useState(5);
  const [isVoting, setIsVoting] = useState(false);
  const [showReveal, setShowReveal] = useState(false);

  const sortedClusters = useMemo(() => {
    return [...clusters].sort((a, b) => {
      const votesA = currentUserVotes.filter((v) => v === a.id).length;
      const votesB = currentUserVotes.filter((v) => v === b.id).length;
      return votesB - votesA;
    });
  }, [clusters, currentUserVotes]);

  const handleStartSession = useCallback(() => {
    setIsVoting(true);
    setIsDialogOpen(false);
    toast.success("Voting session started!");
  }, []);

  const handleVote = useCallback(
    (clusterId: string) => {
      const currentCount = currentUserVotes.length;
      if (currentCount >= maxDotsPerPerson) {
        toast.error(`You can only vote ${maxDotsPerPerson} times`);
        return;
      }
      if (!currentUserVotes.includes(clusterId)) {
        onVote(clusterId);
        toast.success("Vote placed!");
      }
    },
    [currentUserVotes, maxDotsPerPerson, onVote]
  );

  const handleUnvote = useCallback(
    (clusterId: string) => {
      onUnvote(clusterId);
      toast.info("Vote removed");
    },
    [onUnvote]
  );

  const handleReveal = useCallback(() => {
    setShowReveal(true);
  }, []);

  const handleEndSession = useCallback(() => {
    setIsVoting(false);
    setShowReveal(false);
    toast.success("Voting session ended");
  }, []);

  return (
    <>
      {/* Voting Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsDialogOpen(true)}
        className="gap-2"
      >
        <Vote className="w-4 h-4" />
        Dot Voting
      </Button>

      {/* Setup Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Vote className="w-5 h-5" />
              Start Dot Voting Session
            </DialogTitle>
            <DialogDescription>
              Let your team prioritize clusters by placing dots on the ones they find most important.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Session Name</label>
              <Input
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                placeholder="e.g., Sprint Priorities"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Dots per person: {dotsPerPerson}
              </label>
              <Slider
                value={[dotsPerPerson]}
                onValueChange={([v]) => setDotsPerPerson(v)}
                min={1}
                max={10}
                step={1}
              />
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="w-4 h-4" />
                <span>{clusters.length} clusters to vote on</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleStartSession}>
              <Play className="w-4 h-4 mr-2" />
              Start Voting
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Active Voting Bar */}
      {isVoting && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-card border border-border rounded-xl shadow-2xl p-4 flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium">Voting in progress</span>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Vote className="w-4 h-4" />
            <span>
              {currentUserVotes.length} / {maxDotsPerPerson} dots used
            </span>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleReveal}>
              <Eye className="w-4 h-4 mr-2" />
              Reveal Results
            </Button>
            <Button variant="destructive" size="sm" onClick={handleEndSession}>
              <Square className="w-4 h-4 mr-2" />
              End Session
            </Button>
          </div>
        </div>
      )}

      {/* Results Panel */}
      {isVoting && showReveal && (
        <div className="fixed right-4 top-20 z-50 w-80 bg-card border border-border rounded-xl shadow-2xl">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h3 className="font-semibold">Voting Results</h3>
            <Button variant="ghost" size="sm" onClick={() => setShowReveal(false)}>
              <EyeOff className="w-4 h-4" />
            </Button>
          </div>
          <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
            {sortedClusters.map((cluster, index) => {
              const votes = currentUserVotes.filter((v) => v === cluster.id).length;
              const isTopVoted = index === 0 && votes > 0;
              return (
                <div
                  key={cluster.id}
                  className={cn(
                    "flex items-center gap-3 p-2 rounded-lg",
                    isTopVoted && "bg-primary/10 border border-primary/30"
                  )}
                >
                  <div className="w-6 text-center font-bold text-muted-foreground">
                    #{index + 1}
                  </div>
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: cluster.color }}
                  />
                  <span className="flex-1 text-sm truncate">{cluster.title}</span>
                  <div className="flex gap-0.5">
                    {Array.from({ length: votes }).map((_, i) => (
                      <div
                        key={i}
                        className="w-4 h-4 rounded-full bg-primary"
                      />
                    ))}
                  </div>
                  <span className="text-sm font-medium w-6 text-right">
                    {votes}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

interface VoteButtonProps {
  clusterId: string;
  hasVoted: boolean;
  onVote: () => void;
  onUnvote: () => void;
  canVote: boolean;
}

export function VoteButton({ clusterId, hasVoted, onVote, onUnvote, canVote }: VoteButtonProps) {
  return (
    <button
      onClick={hasVoted ? onUnvote : onVote}
      disabled={!canVote && !hasVoted}
      className={cn(
        "w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all",
        hasVoted
          ? "bg-primary border-primary text-primary-foreground"
          : "border-border hover:border-primary hover:bg-primary/10",
        !canVote && !hasVoted && "opacity-50 cursor-not-allowed"
      )}
      title={hasVoted ? "Remove vote" : "Add vote"}
    >
      {hasVoted ? <Check className="w-4 h-4" /> : <Vote className="w-4 h-4" />}
    </button>
  );
}
