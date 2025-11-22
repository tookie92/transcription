// components/VotingSessionDetails.tsx
"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { VotingResult, DotVote, AffinityGroup } from "@/types";
import { Users, Target, Award, Calendar, Download, BarChart3, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";

interface VotingSessionDetailsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  results: VotingResult[];
  totalVotes: number;
  sessionDate: Date;
  groups: AffinityGroup[];
}

export function VotingSessionDetails({ 
  open, 
  onOpenChange, 
  sessionId,
  results, 
  totalVotes,
  sessionDate,
  groups 
}: VotingSessionDetailsProps) {
  const [activeTab, setActiveTab] = useState<'results' | 'dots'>('results');
  
  // 🎯 RÉCUPÉRER LES DOTS DE LA SESSION
  const sessionDots = useQuery(api.dotVoting.getSessionDots, {
    sessionId: sessionId as Id<"dotVotingSessions">
  });

  const sortedResults = results
    .filter(result => result.totalVotes > 0)
    .sort((a, b) => b.totalVotes - a.totalVotes);

  const topResult = sortedResults[0];
  const uniqueVoters = new Set(
    sortedResults.flatMap(result => result.voteDetails.map(vote => vote.userId))
  ).size;

  // 🎯 FONCTIONS D'EXPORT
  const exportResultsAsJSON = () => {
    const data = {
      sessionId,
      sessionDate: sessionDate.toISOString(),
      totalVotes,
      results: sortedResults.map((result, index) => ({
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
    link.download = `voting-session-${sessionId}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportResultsAsCSV = () => {
    const headers = ['Rank', 'Group', 'Votes', 'Percentage', 'Participants'];
    
    const rows = sortedResults.map((result, index) => {
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
    link.download = `voting-session-${sessionId}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 🎯 COMPTER LES DOTS PAR GROUPE
  const dotsByGroup = sessionDots?.reduce((acc, dot) => {
    if (!acc[dot.targetId]) {
      acc[dot.targetId] = [];
    }
    acc[dot.targetId].push(dot);
    return acc;
  }, {} as Record<string, DotVote[]>) || {};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              <DialogTitle>Voting Session Details</DialogTitle>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportResultsAsCSV}>
                <Download size={14} className="mr-1" />
                CSV
              </Button>
              <Button variant="outline" size="sm" onClick={exportResultsAsJSON}>
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

        {/* 🎯 NAVIGATION PAR ONGLETS */}
        <div className="border-b">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('results')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'results'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <BarChart3 size={16} className="inline mr-2" />
              Results & Statistics
            </button>
            <button
              onClick={() => setActiveTab('dots')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'dots'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <MapPin size={16} className="inline mr-2" />
              Dots Visualization ({sessionDots?.length || 0})
            </button>
          </nav>
        </div>

        {activeTab === 'results' && (
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
                Detailed Ranking
              </h3>
              
              {sortedResults.map((result, index) => {
                const percentage = totalVotes > 0 ? (result.totalVotes / totalVotes) * 100 : 0;
                const isTop = index === 0;
                const groupDots = dotsByGroup[result.groupId] || [];
                
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
                          <div className="text-sm text-muted-foreground flex items-center gap-4">
                            <span className="flex items-center gap-1">
                              <Users size={12} />
                              {result.voteDetails.length} participant(s)
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin size={12} />
                              {groupDots.length} dot(s)
                            </span>
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
        )}

        {activeTab === 'dots' && (
          <div className="space-y-6">
            <h3 className="font-semibold flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Dots Placement Visualization
            </h3>
            
            {sessionDots && sessionDots.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {groups.map(group => {
                  const groupDots = dotsByGroup[group.id] || [];
                  if (groupDots.length === 0) return null;
                  
                  return (
                    <div key={group.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium" style={{ color: group.color }}>
                          {group.title}
                        </h4>
                        <Badge variant="outline">
                          {groupDots.length} dot(s)
                        </Badge>
                      </div>
                      
                      <div className="space-y-2">
                        {groupDots.map((dot, index) => (
                          <div key={dot._id} className="flex items-center gap-3 text-sm">
                            <div
                              className="w-4 h-4 rounded-full border-2 border-white shadow"
                              style={{ backgroundColor: dot.color }}
                            />
                            <div className="flex-1">
                              <span className="font-medium">
                                Dot {index + 1}
                              </span>
                              <div className="text-xs text-muted-foreground">
                                Position: ({dot.position.x.toFixed(0)}, {dot.position.y.toFixed(0)})
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(dot._creationTime).toLocaleTimeString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                
                {/* DOTS SANS GROUPE (INIGHTS) */}
                {Object.entries(dotsByGroup).map(([targetId, dots]) => {
                  if (!groups.find(g => g.id === targetId) && dots.length > 0) {
                    return (
                      <div key={targetId} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium">Insight Dots</h4>
                          <Badge variant="outline">
                            {dots.length} dot(s)
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Dots placed on individual insights
                        </div>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <MapPin size={48} className="mx-auto mb-4 opacity-50" />
                <p>No dots were placed in this session</p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}