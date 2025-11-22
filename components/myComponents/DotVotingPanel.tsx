// components/DotVotingPanel.tsx - VERSION CORRIGÉE POUR NOUVEAU SYSTÈME

"use client";

import { useState, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@clerk/nextjs";
import { Vote, Target, Award, Users, Plus, Trash2, Play, Eye, Timer, Grid, EyeOff } from "lucide-react";
import { AffinityGroup, Insight } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";

interface DotVotingPanelProps {
  projectId: string;
  mapId: string;
  groups: AffinityGroup[];
  insights: Insight[];
}

const USER_COLORS = [
  "#EF4444", "#F59E0B", "#10B981", "#3B82F6", 
  "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16"
];

export function DotVotingPanel({ projectId, mapId, groups, insights }: DotVotingPanelProps) {
  const { userId } = useAuth();
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"dots" | "list">("dots");

  const userColor = useMemo(() => {
    if (!userId) return USER_COLORS[0];
    const hash = userId.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    return USER_COLORS[hash % USER_COLORS.length];
  }, [userId]);

  // 🎯 QUERIES CORRIGÉES - UTILISER LES NOUVELLES FONCTIONS
  const activeSessions = useQuery(api.dotVoting.getActiveSessions, { 
    mapId: mapId as Id<"affinityMaps"> 
  });
  
  const sessionDots = useQuery(api.dotVoting.getSessionDots, 
    activeSessionId ? { sessionId: activeSessionId as Id<"dotVotingSessions"> } : "skip"
  );

  const currentSession = useQuery(api.dotVoting.getSession,
    activeSessionId ? { sessionId: activeSessionId as Id<"dotVotingSessions"> } : "skip"
  );

  const myDots = useQuery(api.dotVoting.getMyDots,
    activeSessionId ? { sessionId: activeSessionId as Id<"dotVotingSessions"> } : "skip"
  );

  // 🎯 MUTATIONS CORRIGÉES
  const createSession = useMutation(api.dotVoting.createSession);
  const placeDot = useMutation(api.dotVoting.placeDot);
  const revealVotes = useMutation(api.dotVoting.revealVotes);
  const endSession = useMutation(api.dotVoting.endSession);
  const toggleSilentMode = useMutation(api.dotVoting.toggleSilentMode);

  const [newSessionName, setNewSessionName] = useState("Dot Voting Session");

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
        maxDotsPerUser: 10,
        isSilentMode: true, // 🎯 MODE DISCRET PAR DÉFAUT
      });
      
      setActiveSessionId(sessionId);
      toast.success("Voting session created!");
    } catch (error) {
      toast.error("Failed to create voting session");
      console.error(error);
    }
  };

  const handleRevealVotes = async () => {
    if (!activeSessionId) return;

    try {
      await revealVotes({
        sessionId: activeSessionId as Id<"dotVotingSessions">,
      });
      toast.success("Votes revealed!");
    } catch (error) {
      toast.error("Failed to reveal votes");
      console.error(error);
    }
  };

  const handleEndSession = async () => {
    if (!activeSessionId) return;

    try {
      await endSession({
        sessionId: activeSessionId as Id<"dotVotingSessions">,
      });
      setActiveSessionId(null);
      toast.success("Voting session ended!");
    } catch (error) {
      toast.error("Failed to end session");
      console.error(error);
    }
  };

  const handleToggleSilentMode = async () => {
    if (!activeSessionId || !currentSession) return;

    try {
      await toggleSilentMode({
        sessionId: activeSessionId as Id<"dotVotingSessions">,
        isSilentMode: !currentSession.isSilentMode,
      });
      toast.success(currentSession.isSilentMode ? "Silent mode disabled" : "Silent mode enabled");
    } catch (error) {
      toast.error("Failed to toggle silent mode");
      console.error(error);
    }
  };

  // 🎯 CALCUL DES STATS POUR LE NOUVEAU SYSTÈME
  const stats = useMemo(() => {
    if (!currentSession || !sessionDots || !myDots) return null;

    const totalDotsCast = sessionDots.length;
    const userDotsRemaining = Math.max(0, currentSession.maxDotsPerUser - myDots.length);

    // 🎯 CALCULER LES RÉSULTATS PAR GROUPE
    const groupResults = groups.map(group => {
      const groupDots = sessionDots.filter(dot => 
        dot.targetType === 'group' && dot.targetId === group.id
      );
      
      const userDotsOnGroup = myDots.filter(dot => 
        dot.targetType === 'group' && dot.targetId === group.id
      );

      return {
        groupId: group.id,
        group,
        totalVotes: groupDots.length,
        userVotes: userDotsOnGroup.length,
        voteDetails: groupDots.map(dot => ({
          userId: dot.userId,
          votes: 1, // Chaque dot = 1 vote
          color: dot.color,
          position: dot.position,
        }))
      };
    }).sort((a, b) => b.totalVotes - a.totalVotes);

    const topGroup = groupResults[0];

    return {
      totalDotsCast,
      userDotsRemaining,
      topGroup,
      groupResults,
      isVotingPhase: currentSession.votingPhase === "voting",
      isRevealed: currentSession.votingPhase === "revealed",
      isSilentMode: currentSession.isSilentMode,
      myDotsCount: myDots.length,
    };
  }, [currentSession, sessionDots, myDots, groups]);

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
          {currentSession?.votingPhase === "voting" 
            ? "Click on canvas to place dots" 
            : "Prioritize with interactive dot voting"}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
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

            {activeSessions && activeSessions.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Or join existing:</p>
                {activeSessions.map(session => (
                  <button
                    key={session._id}
                    onClick={() => setActiveSessionId(session._id)}
                    className="w-full p-3 text-left border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="font-medium text-sm">{session.name}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                      <Badge variant={
                        session.votingPhase === "voting" ? "default" :
                        session.votingPhase === "revealed" ? "secondary" : "outline"
                      }>
                        {session.votingPhase}
                      </Badge>
                      <span>{session.isSilentMode ? "🔇" : "🔊"}</span>
                      <span>{new Date(session.createdAt).toLocaleDateString()}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {activeSessionId && currentSession && (
          <div className="space-y-4">
            {/* HEADER SESSION */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-sm">{currentSession.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={
                    currentSession.votingPhase === "voting" ? "default" :
                    currentSession.votingPhase === "revealed" ? "secondary" : "outline"
                  }>
                    {currentSession.votingPhase}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {currentSession.isSilentMode ? "🔇 Silent" : "🔊 Live"}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {stats?.myDotsCount || 0} / {currentSession.maxDotsPerUser} dots
                  </span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleEndSession}
              >
                <Trash2 size={14} />
              </Button>
            </div>

            {/* ACTIONS FACILITATEUR */}
            {currentSession.createdBy === userId && (
              <div className="flex gap-2">
                {currentSession.votingPhase === "voting" && (
                  <>
                    <Button onClick={handleRevealVotes} size="sm" className="flex-1">
                      <Eye size={14} className="mr-1" />
                      Reveal Votes
                    </Button>
                    <Button 
                      onClick={handleToggleSilentMode} 
                      size="sm" 
                      variant={currentSession.isSilentMode ? "default" : "outline"}
                    >
                      {currentSession.isSilentMode ? <Eye size={14} /> : <EyeOff size={14} />}
                    </Button>
                  </>
                )}
              </div>
            )}

            {/* STATS UTILISATEUR */}
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">
                  {stats?.isVotingPhase && stats.isSilentMode ? "Your Dots (Private)" : "Your Dots"}
                </span>
              </div>
              <Badge variant={(stats?.userDotsRemaining ?? 0) > 0 ? "default" : "destructive"}>
                {stats?.userDotsRemaining ?? 0} remaining
              </Badge>
            </div>

            {/* INDICATEUR MODE DISCRET */}
            {stats?.isVotingPhase && stats.isSilentMode && (
              <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 text-yellow-800">
                  <Eye size={14} />
                  <span className="text-xs font-medium">Dots are invisible to others</span>
                </div>
              </div>
            )}

            {/* RÉSULTATS */}
            {stats && stats.groupResults && (
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Voting Results</h4>
                {stats.groupResults
                  .filter(result => result.totalVotes > 0)
                  .map((result, index) => (
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
                        {!stats.isVotingPhase && (
                          <p className="text-xs text-green-600 font-medium">
                            {result.totalVotes} total votes
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="w-8 text-center">
                          <span className={`text-sm font-bold ${
                            result.userVotes > 0 ? 'text-purple-600' : 'text-gray-400'
                          }`}>
                            {result.userVotes}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                }

                {stats.groupResults.filter(r => r.totalVotes > 0).length === 0 && (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    No votes yet. Click on groups to place dots!
                  </div>
                )}
              </div>
            )}

            {/* TOP GROUPS RÉVÉLÉS */}
            {stats && stats.isRevealed && stats.topGroup && (
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-900">Top Groups</span>
                </div>
                <div className="space-y-1">
                  {stats.groupResults
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