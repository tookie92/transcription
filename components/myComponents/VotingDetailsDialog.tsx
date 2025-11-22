// components/VotingDetailsDialog.tsx

"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { VotingResult } from "@/types";
import { Users, Target, Award } from "lucide-react";

interface VotingDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  results: VotingResult[];
  totalVotes: number;
  sessionDate: Date;
}

export function VotingDetailsDialog({ 
  open, 
  onOpenChange, 
  results, 
  totalVotes,
  sessionDate 
}: VotingDetailsDialogProps) {
  const sortedResults = results
    .filter(result => result.totalVotes > 0)
    .sort((a, b) => b.totalVotes - a.totalVotes);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Voting Session Results
          </DialogTitle>
          <DialogDescription>
            Detailed results from {sessionDate.toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* STATISTIQUES GLOBALES */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{sortedResults.length}</div>
              <div className="text-sm text-muted-foreground">Groups Voted</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{totalVotes}</div>
              <div className="text-sm text-muted-foreground">Total Votes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {sortedResults[0]?.totalVotes || 0}
              </div>
              <div className="text-sm text-muted-foreground">Top Group</div>
            </div>
          </div>

          {/* RÉSULTATS DÉTAILLÉS */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Award className="w-4 h-4" />
              Ranking
            </h3>
            
            {sortedResults.map((result, index) => {
              const percentage = totalVotes > 0 ? (result.totalVotes / totalVotes) * 100 : 0;
              
              return (
                <div key={result.groupId} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant={index === 0 ? "default" : "secondary"} className="text-xs">
                        #{index + 1}
                      </Badge>
                      <div>
                        <div className="font-medium">{result.groupTitle}</div>
                        <div className="text-sm text-muted-foreground">
                          {result.voteDetails.length} participant(s)
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">{result.totalVotes} votes</div>
                      <div className="text-sm text-muted-foreground">
                        {percentage.toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  {/* BARRE DE PROGRESSION */}
                  <Progress value={percentage} className="h-2" />

                  {/* DÉTAILS DES VOTEURS */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    {result.voteDetails.map((vote, voteIndex) => (
                      <div
                        key={voteIndex}
                        className="flex items-center gap-1 text-xs"
                        title={`${vote.votes} vote(s) from user`}
                      >
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: vote.color }}
                        />
                        <span>{vote.votes}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {sortedResults.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No votes were cast in this session
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}