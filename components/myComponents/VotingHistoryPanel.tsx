// components/VotingHistoryPanel.tsx - VERSION AVEC NAVIGATION
"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { VotingHistoryItem, AffinityGroup } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Download, Calendar, Users, Award, ChevronLeft, ChevronRight } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";
import { VotingSessionDetails } from "./VotingSessionDetails";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";

interface VotingHistoryPanelProps {
  projectId: string;
  mapId: string;
  groups: AffinityGroup[];
}

export function VotingHistoryPanel({ projectId, mapId, groups }: VotingHistoryPanelProps) {
  const votingHistory = useQuery(api.dotVoting.getVotingHistory, {
    mapId: mapId as Id<"affinityMaps">
  });

  const [selectedHistory, setSelectedHistory] = useState<VotingHistoryItem | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 5;

  // 🎯 TRIER PAR DATE RÉCENTE
  const sortedHistory = votingHistory?.sort((a, b) => b.savedAt - a.savedAt) || [];
  
  // 🎯 PAGINATION
  const totalPages = Math.ceil(sortedHistory.length / itemsPerPage);
  const paginatedHistory = sortedHistory.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );

  if (!votingHistory) {
    return (
      <Card className="w-80 rounded-none border-l-0 h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar size={20} />
            Voting History
          </CardTitle>
          <CardDescription>
            Loading voting history...
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card className="w-80 rounded-none border-l-0 h-full flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar size={20} />
            Voting History
          </CardTitle>
          <CardDescription>
            Previous voting sessions and results
          </CardDescription>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-y-auto space-y-4">
          {sortedHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar size={48} className="mx-auto mb-4 opacity-50" />
              <p>No voting history yet</p>
              <p className="text-sm mt-2">Start a voting session to see results here</p>
            </div>
          ) : (
            <>
              {/* LISTE DES SESSIONS */}
              {paginatedHistory.map((history: VotingHistoryItem) => {
                const totalVotes = history.results.reduce((sum, r) => sum + r.totalVotes, 0);
                const topResult = history.results
                  .filter(r => r.totalVotes > 0)
                  .sort((a, b) => b.totalVotes - a.totalVotes)[0];

                return (
                  <div key={history._id} className="border rounded-lg p-4 space-y-3 hover:bg-accent/50 transition-colors">
                    {/* EN-TÊTE DE SESSION */}
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <p className="font-medium text-sm">
                          {new Date(history.savedAt).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(history.savedAt).toLocaleTimeString()}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {totalVotes} votes
                      </Badge>
                    </div>

                    {/* TOP GROUPS */}
                    <div className="space-y-2">
                      {history.results
                        .filter(result => result.totalVotes > 0)
                        .sort((a, b) => b.totalVotes - a.totalVotes)
                        .slice(0, 3)
                        .map((result, index) => (
                          <div key={result.groupId} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div className={`
                                w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                                ${index === 0 ? 'bg-yellow-100 text-yellow-800' : 
                                  index === 1 ? 'bg-gray-100 text-gray-800' : 
                                  'bg-orange-100 text-orange-800'}
                              `}>
                                {index + 1}
                              </div>
                              <span className="truncate flex-1" title={result.groupTitle}>
                                {result.groupTitle}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-primary">
                                {result.totalVotes}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {totalVotes > 0 ? Math.round((result.totalVotes / totalVotes) * 100) : 0}%
                              </span>
                            </div>
                          </div>
                        ))
                      }
                    </div>

                    {/* STATS RAPIDES */}
                    <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t">
                      <div className="flex items-center gap-1">
                        <Users size={12} />
                        <span>{history.results.filter(r => r.totalVotes > 0).length} groups</span>
                      </div>
                      {topResult && (
                        <div className="flex items-center gap-1">
                          <Award size={12} />
                          <span>Top: {topResult.totalVotes}</span>
                        </div>
                      )}
                    </div>

                    {/* ACTIONS */}
                    <div className="flex gap-2 pt-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1 text-xs h-8"
                        onClick={() => setSelectedHistory(history)}
                      >
                        <Eye size={12} className="mr-1" />
                        Details
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="outline" className="text-xs h-8 px-2">
                            <Download size={12} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={() => {
                              const data = {
                                sessionId: history.sessionId,
                                date: new Date(history.savedAt).toISOString(),
                                totalVotes,
                                results: history.results
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
                              link.download = `voting-session-${history.sessionId}.json`;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              URL.revokeObjectURL(url);
                            }}
                            className="text-xs"
                          >
                            Download as JSON
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => {
                              const headers = ['Rank', 'Group', 'Votes', 'Percentage', 'Participants'];
                              const totalVotes = history.results.reduce((sum, r) => sum + r.totalVotes, 0);
                              
                              const rows = history.results
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
                              link.download = `voting-session-${history.sessionId}.csv`;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              URL.revokeObjectURL(url);
                            }}
                            className="text-xs"
                          >
                            Download as CSV
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}

              {/* PAGINATION */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                    disabled={currentPage === 0}
                    className="h-8 px-3"
                  >
                    <ChevronLeft size={14} />
                  </Button>
                  
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage + 1} of {totalPages}
                  </span>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                    disabled={currentPage >= totalPages - 1}
                    className="h-8 px-3"
                  >
                    <ChevronRight size={14} />
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* DIALOGUE DES DÉTAILS COMPLETS */}
      {selectedHistory && (
        <VotingSessionDetails
          open={!!selectedHistory}
          onOpenChange={(open) => !open && setSelectedHistory(null)}
          sessionId={selectedHistory.sessionId}
          results={selectedHistory.results}
          totalVotes={selectedHistory.results.reduce((sum, r) => sum + r.totalVotes, 0)}
          sessionDate={new Date(selectedHistory.savedAt)}
          groups={groups}
        />
      )}
    </>
  );
}