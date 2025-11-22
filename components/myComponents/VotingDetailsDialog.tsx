// components/VotingDetailsDialog.tsx - VERSION FINALE SANS ANY
"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { VotingResult } from "@/types";
import { Users, Target, Award, Calendar, Download, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VotingDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  results: VotingResult[];
  totalVotes: number;
  sessionDate: Date;
}

// 🎯 FONCTION D'EXPORT JSON INDÉPENDANTE
const exportResultsAsJSON = (results: VotingResult[], sessionDate: Date): void => {
  const data = {
    sessionDate: sessionDate.toISOString(),
    totalVotes: results.reduce((sum, r) => sum + r.totalVotes, 0),
    results: results
      .filter(result => result.totalVotes > 0)
      .sort((a, b) => b.totalVotes - a.totalVotes)
      .map((result, index) => ({
        rank: index + 1,
        groupTitle: result.groupTitle,
        totalVotes: result.totalVotes,
        participants: result.voteDetails.length,
        voteDetails: result.voteDetails
      }))
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { 
    type: 'application/json' 
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.href = url;
  link.download = `voting-results-${sessionDate.getTime()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// 🎯 FONCTION D'EXPORT CSV INDÉPENDANTE
const exportResultsAsCSV = (results: VotingResult[], sessionDate: Date): void => {
  const headers = ['Rank', 'Group', 'Votes', 'Percentage', 'Participants'];
  const totalVotes = results.reduce((sum, r) => sum + r.totalVotes, 0);
  
  const rows = results
    .filter(result => result.totalVotes > 0)
    .sort((a, b) => b.totalVotes - a.totalVotes)
    .map((result, index) => {
      const percentage = totalVotes > 0 ? (result.totalVotes / totalVotes) * 100 : 0;
      
      return [
        (index + 1).toString(),
        `"${result.groupTitle.replace(/"/g, '""')}"`,
        result.totalVotes.toString(),
        `${percentage.toFixed(1)}%`,
        result.voteDetails.length.toString()
      ];
    });

  const csvContent = [headers, ...rows]
    .map(row => row.join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.href = url;
  link.download = `voting-results-${sessionDate.getTime()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

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

  const topResult = sortedResults[0];
  const uniqueVoters = new Set(
    sortedResults.flatMap(result => result.voteDetails.map(vote => vote.userId))
  ).size;

  // 🎯 UTILISER LES FONCTIONS D'EXPORT DIRECTES
  const handleExportJSON = () => exportResultsAsJSON(results, sessionDate);
  const handleExportCSV = () => exportResultsAsCSV(results, sessionDate);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              <DialogTitle>Voting Session Results</DialogTitle>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <Download size={14} className="mr-1" />
                CSV
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportJSON}>
                <Download size={14} className="mr-1" />
                JSON
              </Button>
            </div>
          </div>
          <DialogDescription className="flex items-center gap-2">
            <Calendar size={14} />
            {sessionDate.toLocaleDateString()} at {sessionDate.toLocaleTimeString()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* STATISTIQUES GLOBALES */}
          <div className="grid grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{sortedResults.length}</div>
              <div className="text-sm text-muted-foreground">Groups Voted</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{totalVotes}</div>
              <div className="text-sm text-muted-foreground">Total Votes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{uniqueVoters}</div>
              <div className="text-sm text-muted-foreground">Participants</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {topResult?.totalVotes || 0}
              </div>
              <div className="text-sm text-muted-foreground">Top Group</div>
            </div>
          </div>

          {/* RÉSULTATS DÉTAILLÉS */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Detailed Results
            </h3>
            
            {sortedResults.map((result, index) => {
              const percentage = totalVotes > 0 ? (result.totalVotes / totalVotes) * 100 : 0;
              const isTop = index === 0;
              
              return (
                <div key={result.groupId} className={`border rounded-lg p-4 space-y-3 ${
                  isTop ? 'border-yellow-200 bg-yellow-50' : ''
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Badge 
                        variant={isTop ? "default" : "secondary"} 
                        className={`text-xs ${
                          isTop ? 'bg-yellow-500 hover:bg-yellow-600' : ''
                        }`}
                      >
                        #{index + 1}
                      </Badge>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate" title={result.groupTitle}>
                          {result.groupTitle}
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <Users size={12} />
                          {result.voteDetails.length} participant(s)
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
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
                        className="flex items-center gap-2 text-xs bg-background px-2 py-1 rounded border"
                        title={`${vote.votes} vote(s) from user`}
                      >
                        <div
                          className="w-3 h-3 rounded-full border"
                          style={{ backgroundColor: vote.color }}
                        />
                        <span className="font-medium">{vote.votes}</span>
                        <span className="text-muted-foreground">votes</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {sortedResults.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Target size={48} className="mx-auto mb-4 opacity-50" />
              <p>No votes were cast in this session</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}