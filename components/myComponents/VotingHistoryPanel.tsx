// components/VotingHistoryPanel.tsx - VERSION SIMPLIFIÉE AVEC TYPES

"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { VotingHistoryItem } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Download, Calendar } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";
import { VotingDetailsDialog } from "./VotingDetailsDialog";
import { exportVotingResults, exportVotingResultsCSV } from "@/utils/exportVotingResults";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";

interface VotingHistoryPanelProps {
  projectId: string;
  mapId: string;
}

export function VotingHistoryPanel({ projectId, mapId }: VotingHistoryPanelProps) {
  const votingHistory = useQuery(api.dotVoting.getVotingHistory, {
    mapId: mapId as Id<"affinityMaps">
  });

  const [selectedHistory, setSelectedHistory] = useState<VotingHistoryItem | null>(null);

  if (!votingHistory) {
    return (
      <Card className="w-80 rounded-none border-l-0">
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
    <Card className="w-80 rounded-none border-l-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar size={20} />
          Voting History
        </CardTitle>
        <CardDescription>
          Previous voting sessions and results
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
        {votingHistory.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No voting history yet
          </p>
        ) : (
          votingHistory.map((history: VotingHistoryItem) => (
            <div key={history._id} className="border rounded-lg p-3 space-y-2 hover:bg-gray-50 transition-colors">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-sm">
                    {new Date(history.savedAt).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {history.results.length} groups voted
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {history.results.reduce((sum, r) => sum + r.totalVotes, 0)} total votes
                </Badge>
              </div>
              
              {/* TOP GROUPS */}
              <div className="space-y-1">
                {history.results
                  .filter(result => result.totalVotes > 0)
                  .sort((a, b) => b.totalVotes - a.totalVotes)
                  .slice(0, 3)
                  .map((result, index) => (
                    <div key={result.groupId} className="flex justify-between text-xs">
                      <span className="truncate flex-1 mr-2">
                        {index + 1}. {result.groupTitle}
                      </span>
                      <span className="font-semibold text-primary">
                        {result.totalVotes} votes
                      </span>
                    </div>
                  ))
                }
              </div>

              <div className="flex gap-2 pt-2 border-t">
                 <Button 
                  size="sm" 
                  variant="outline" 
                  className="flex-1 text-xs h-8"
                  onClick={() => setSelectedHistory(history)}
                >
                  <Eye size={12} className="mr-1" />
                  View Details
                </Button>

               <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline" className="text-xs h-8">
                    <Download size={12} />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => exportVotingResultsCSV(history)}>
                    Download as CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exportVotingResults(history)}>
                    Download as JSON
                    </DropdownMenuItem>
                </DropdownMenuContent>
                </DropdownMenu>

              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>

      {/* 🎯 DIALOGUE DES DÉTAILS */}
      {selectedHistory && (
        <VotingDetailsDialog
          open={!!selectedHistory}
          onOpenChange={(open) => !open && setSelectedHistory(null)}
          results={selectedHistory.results}
          totalVotes={selectedHistory.results.reduce((sum, r) => sum + r.totalVotes, 0)}
          sessionDate={new Date(selectedHistory.savedAt)}
        />
      )}
   
    </>
  );
}