// components/DotVotingPanel.tsx - VERSION CORRIGÉE
"use client";

import { useState, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@clerk/nextjs";
import { Vote, Target, Award, Users, Plus, Trash2 } from "lucide-react";
import { AffinityGroup, Insight } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";

interface DotVotingPanelProps {
  projectId: string;
  mapId: string;
  groups: AffinityGroup[];
  insights: Insight[];
}

export function DotVotingPanel({ projectId, mapId, groups, insights }: DotVotingPanelProps) {
  const { userId } = useAuth();
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // 🔍 QUERIES AVEC TYPES CORRECTS
  const sessions = useQuery(api.dotVoting.getProjectSessions, { 
    projectId: projectId as Id<"projects"> 
  });
  
  const sessionResults = useQuery(api.dotVoting.getSessionResults, 
    activeSessionId ? { sessionId: activeSessionId as Id<"dotVotingSessions"> } : "skip"
  );

  // Mutations
  const createSession = useMutation(api.dotVoting.createSession);
  const castVote = useMutation(api.dotVoting.castVote);

  const [newSessionName, setNewSessionName] = useState("Dot Voting Session");

  // Créer une nouvelle session
  const handleCreateSession = async () => {
    if (!userId) {
      toast.error("You must be logged in to create a voting session");
      return;
    }

    try {
      const sessionId = await createSession({
        projectId: projectId as Id<"projects">,
        mapId: mapId as Id<"affinityMaps">,
        name: newSessionName,
        maxVotesPerUser: 5,
      });
      
      setActiveSessionId(sessionId);
      toast.success("Voting session created!");
    } catch (error) {
      toast.error("Failed to create voting session");
      console.error(error);
    }
  };

  // Voter pour un groupe
  const handleVote = async (groupId: string, newVoteCount: number) => {
    if (!activeSessionId || !userId) return;

    const currentUserVotes = sessionResults?.userTotalVotes || 0;
    const maxVotes = sessionResults?.maxVotesPerUser || 5;

    // Vérifier si l'utilisateur a assez de votes
    if (newVoteCount > 0 && currentUserVotes >= maxVotes) {
      toast.error(`You only have ${maxVotes} votes total`);
      return;
    }

    try {
      await castVote({
        sessionId: activeSessionId as Id<"dotVotingSessions">,
        groupId,
        votes: newVoteCount,
      });
    } catch (error) {
      toast.error("Failed to cast vote");
      console.error(error);
    }
  };

  // Stats - CORRIGÉ avec valeurs par défaut
  const stats = useMemo(() => {
    if (!sessionResults) return null;

    const totalVotesCast = sessionResults.results.reduce((sum, result) => sum + result.totalVotes, 0);
    const userVotesRemaining = Math.max(0, (sessionResults.maxVotesPerUser - sessionResults.userTotalVotes));

    return {
      totalVotesCast,
      userVotesRemaining,
      topGroup: sessionResults.results[0],
    };
  }, [sessionResults]);

  if (!userId) {
    return (
      <Card className="w-80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Vote className="w-5 h-5" />
            Dot Voting
          </CardTitle>
          <CardDescription>
            Please sign in to use dot voting
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-80 rounded-none">
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
        {/* Création de session */}
        {!activeSessionId && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newSessionName}
                onChange={(e) => setNewSessionName(e.target.value)}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Session name"
              />
              <Button onClick={handleCreateSession} size="sm">
                <Plus size={16} />
              </Button>
            </div>

            {/* Sessions existantes */}
            {sessions && sessions.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Or join existing:</p>
                {sessions.map(session => (
                  <button
                    key={session._id}
                    onClick={() => setActiveSessionId(session._id)}
                    className="w-full p-3 text-left border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="font-medium text-sm">{session.name}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(session.createdAt).toLocaleDateString()}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Session active */}
        {activeSessionId && sessionResults && (
          <div className="space-y-4">
            {/* En-tête de session */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-sm">{sessionResults.session.name}</h4>
                <p className="text-xs text-gray-500">
                  {sessionResults.userTotalVotes} / {sessionResults.maxVotesPerUser} votes used
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveSessionId(null)}
              >
                <Trash2 size={14} />
              </Button>
            </div>

            {/* Compteur de votes - CORRIGÉ avec vérification */}
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Your Votes Remaining</span>
              </div>
              <Badge variant={(stats?.userVotesRemaining ?? 0) > 0 ? "default" : "destructive"}>
                {stats?.userVotesRemaining ?? 0} / {sessionResults.maxVotesPerUser}
              </Badge>
            </div>

            {/* Liste des groupes pour voter */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {sessionResults.results.map((result, index) => (
                <div
                  key={result.groupId}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                  style={{ borderLeftColor: result.group.color, borderLeftWidth: '4px' }}
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate" style={{ color: result.group.color }}>
                      {result.group.title}
                    </h4>
                    <p className="text-xs text-gray-500">
                      {result.group.insightIds.length} insights • #{index + 1}
                    </p>
                    {result.totalVotes > 0 && (
                      <p className="text-xs text-green-600 font-medium">
                        {result.totalVotes} total votes
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* Bouton - */}
                    <button
                      onClick={() => handleVote(result.groupId, Math.max(0, result.userVotes - 1))}
                      disabled={result.userVotes === 0}
                      className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-medium disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-300 transition-colors"
                    >
                      −
                    </button>
                    
                    {/* Compteur de votes */}
                    <div className="w-8 text-center">
                      <span className={`text-sm font-bold ${
                        result.userVotes > 0 ? 'text-purple-600' : 'text-gray-400'
                      }`}>
                        {result.userVotes}
                      </span>
                    </div>
                    
                    {/* Bouton + - CORRIGÉ avec vérification stats */}
                    <button
                      onClick={() => handleVote(result.groupId, result.userVotes + 1)}
                      disabled={(stats?.userVotesRemaining ?? 0) === 0}
                      className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-medium disabled:opacity-30 disabled:cursor-not-allowed hover:bg-purple-200 transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Résultats - CORRIGÉ avec vérification stats */}
            {stats && stats.totalVotesCast > 0 && (
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-900">Top Groups</span>
                </div>
                <div className="space-y-1">
                  {sessionResults.results
                    .filter(result => result.totalVotes > 0)
                    .slice(0, 3)
                    .map((result, index) => (
                      <div key={result.groupId} className="flex justify-between text-sm">
                        <span className="text-green-800">
                          {index + 1}. {result.group.title}
                        </span>
                        <span className="font-semibold text-green-600">
                          {result.totalVotes} votes
                        </span>
                      </div>
                    ))
                  }
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}