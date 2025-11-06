// components/DotVotingSystem.tsx
"use client";

import { useState, useMemo } from "react";
import { Vote, Target, Award, Users } from "lucide-react";
import { AffinityGroup } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface DotVotingSystemProps {
  groups: AffinityGroup[];
  onVotesUpdate: (groupId: string, votes: number) => void;
  maxVotesPerUser?: number;
}

interface VoteState {
  [groupId: string]: number;
}

export function DotVotingSystem({ 
  groups, 
  onVotesUpdate, 
  maxVotesPerUser = 5 
}: DotVotingSystemProps) {
  const [userVotes, setUserVotes] = useState<VoteState>({});
  const [isVoting, setIsVoting] = useState(false);

  const totalVotesUsed = useMemo(() => 
    Object.values(userVotes).reduce((sum, votes) => sum + votes, 0), 
    [userVotes]
  );

  const votesRemaining = maxVotesPerUser - totalVotesUsed;
  const hasVotesRemaining = votesRemaining > 0;

  const handleAddVote = (groupId: string) => {
    if (!hasVotesRemaining) {
      toast.error(`Maximum ${maxVotesPerUser} votes allowed`);
      return;
    }

    setUserVotes(prev => ({
      ...prev,
      [groupId]: (prev[groupId] || 0) + 1
    }));

    onVotesUpdate(groupId, (userVotes[groupId] || 0) + 1);
  };

  const handleRemoveVote = (groupId: string) => {
    if (!userVotes[groupId]) return;

    setUserVotes(prev => ({
      ...prev,
      [groupId]: Math.max(0, (prev[groupId] || 0) - 1)
    }));

    onVotesUpdate(groupId, Math.max(0, (userVotes[groupId] || 0) - 1));
  };

  const handleSubmitVotes = () => {
    setIsVoting(true);
    // Simuler la soumission des votes
    setTimeout(() => {
      toast.success("Votes submitted successfully!");
      setIsVoting(false);
    }, 1000);
  };

  const sortedGroups = [...groups].sort((a, b) => 
    (userVotes[b.id] || 0) - (userVotes[a.id] || 0)
  );

  return (
    <Card className="w-96">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Vote className="w-5 h-5" />
          Dot Voting
        </CardTitle>
        <CardDescription>
          Prioritize groups by allocating your votes
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Vote Counter */}
        <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">Votes Remaining</span>
          </div>
          <Badge variant={hasVotesRemaining ? "default" : "destructive"}>
            {votesRemaining} / {maxVotesPerUser}
          </Badge>
        </div>

        {/* Voting Instructions */}
        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
          <p>Click + to allocate votes to important groups</p>
          <p className="text-xs mt-1">Each user has {maxVotesPerUser} votes total</p>
        </div>

        {/* Groups List for Voting */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {sortedGroups.map(group => {
            const voteCount = userVotes[group.id] || 0;
            
            return (
              <div
                key={group.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                style={{ borderLeftColor: group.color, borderLeftWidth: '4px' }}
              >
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm truncate" style={{ color: group.color }}>
                    {group.title}
                  </h4>
                  <p className="text-xs text-gray-500">
                    {group.insightIds.length} insights
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Remove Vote Button */}
                  <button
                    onClick={() => handleRemoveVote(group.id)}
                    disabled={voteCount === 0}
                    className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-medium disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-300 transition-colors"
                  >
                    −
                  </button>
                  
                  {/* Vote Count */}
                  <div className="w-8 text-center">
                    <span className={`text-sm font-bold ${
                      voteCount > 0 ? 'text-purple-600' : 'text-gray-400'
                    }`}>
                      {voteCount}
                    </span>
                  </div>
                  
                  {/* Add Vote Button */}
                  <button
                    onClick={() => handleAddVote(group.id)}
                    disabled={!hasVotesRemaining}
                    className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-medium disabled:opacity-30 disabled:cursor-not-allowed hover:bg-purple-200 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Results Preview */}
        {totalVotesUsed > 0 && (
          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-900">Top Groups</span>
            </div>
            <div className="space-y-1">
              {sortedGroups
                .filter(group => userVotes[group.id] > 0)
                .slice(0, 3)
                .map((group, index) => (
                  <div key={group.id} className="flex justify-between text-sm">
                    <span className="text-green-800">
                      {index + 1}. {group.title}
                    </span>
                    <span className="font-semibold text-green-600">
                      {userVotes[group.id]} votes
                    </span>
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {/* Submit Button */}
        <Button
          onClick={handleSubmitVotes}
          disabled={totalVotesUsed === 0 || isVoting}
          className="w-full"
        >
          {isVoting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Submitting...
            </>
          ) : (
            <>
              <Users className="w-4 h-4 mr-2" />
              Submit Votes ({totalVotesUsed} votes)
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}