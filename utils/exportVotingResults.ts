// utils/exportVotingResults.ts - VERSION AVEC TYPES STRICTS
import { VotingHistoryItem } from "@/types";

// 🎯 INTERFACE POUR LES DONNÉES D'EXPORT
interface ExportVotingData {
  sessionId: string;
  date: string;
  totalVotes: number;
  results: Array<{
    rank: number;
    groupTitle: string;
    totalVotes: number;
    participants: number;
    voteDetails: Array<{
      userId: string;
      votes: number;
      color: string;
    }>;
  }>;
}

export function exportVotingResults(history: VotingHistoryItem): void {
  const data: ExportVotingData = {
    sessionId: history.sessionId,
    date: new Date(history.savedAt).toISOString(),
    totalVotes: history.results.reduce((sum, r) => sum + r.totalVotes, 0),
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

  // 🎯 CRÉER ET TÉLÉCHARGER LE FICHIER JSON
  const blob = new Blob([JSON.stringify(data, null, 2)], { 
    type: 'application/json' 
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.href = url;
  link.download = `voting-results-${history.sessionId}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// 🎯 VERSION CSV AVEC TYPES
export function exportVotingResultsCSV(history: VotingHistoryItem): void {
  const headers = ['Rank', 'Group', 'Votes', 'Percentage', 'Participants'];
  const totalVotes = history.results.reduce((sum, r) => sum + r.totalVotes, 0);
  
  const rows = history.results
    .filter(result => result.totalVotes > 0)
    .sort((a, b) => b.totalVotes - a.totalVotes)
    .map((result, index) => {
      const percentage = totalVotes > 0 ? (result.totalVotes / totalVotes) * 100 : 0;
      
      return [
        (index + 1).toString(),
        `"${result.groupTitle.replace(/"/g, '""')}"`, // Échapper les guillemets
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
  link.download = `voting-results-${history.sessionId}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}