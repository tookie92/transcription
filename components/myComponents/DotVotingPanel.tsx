// components/DotVotingPanel.tsx - VERSION AVEC DRAG & DROP

"use client";

import { useState, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth, useUser } from "@clerk/nextjs";
import { Vote, Target, Award, Users, Plus, Trash2, Play, Eye, Timer, Grid } from "lucide-react";
import { AffinityGroup, Insight } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";
import { VotingGroup } from "./VotingGroup";

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
  const { user } = useUser();
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"dots" | "list">("dots");

  const userColor = useMemo(() => {
    if (!userId) return USER_COLORS[0];
    const hash = userId.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    return USER_COLORS[hash % USER_COLORS.length];
  }, [userId]);

  // QUERIES
  const sessions = useQuery(api.dotVoting.getProjectSessions, { 
    projectId: projectId as Id<"projects"> 
  });
  
  const sessionResults = useQuery(api.dotVoting.getSessionResults, 
    activeSessionId ? { sessionId: activeSessionId as Id<"dotVotingSessions"> } : "skip"
  );

  const currentSession = useQuery(api.dotVoting.getSession,
    activeSessionId ? { sessionId: activeSessionId as Id<"dotVotingSessions"> } : "skip"
  );

  // MUTATIONS
  const createSession = useMutation(api.dotVoting.createSession);
  const createDot = useMutation(api.dotVoting.createDot);
  const startVotingPhase = useMutation(api.dotVoting.startVotingPhase);
  const revealVotes = useMutation(api.dotVoting.revealVotes);
  const castVote = useMutation(api.dotVoting.castVote);

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
        maxVotesPerUser: 10, // 🎯 PLUS DE DOTS POUR DRAG & DROP
        allowRevoting: true,
        showResults: true,
      });
      
      setActiveSessionId(sessionId);
      toast.success("Voting session created!");
    } catch (error) {
      toast.error("Failed to create voting session");
      console.error(error);
    }
  };

  const handleStartVoting = async () => {
    if (!activeSessionId) return;

    try {
      await startVotingPhase({
        sessionId: activeSessionId as Id<"dotVotingSessions">,
      });
      toast.success("Voting started! Drag & drop dots to vote.");
    } catch (error) {
      toast.error("Failed to start voting");
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

  const handleAddDot = async (groupId: string, position: { x: number; y: number }) => {
    if (!activeSessionId || !userId) return;

    try {
      const result = await createDot({
        sessionId: activeSessionId as Id<"dotVotingSessions">,
        groupId,
        position,
        color: userColor,
      });

      if (!result.success) {
        toast.error("Maximum dots reached");
      }
    } catch (error) {
      toast.error("Failed to add dot");
      console.error(error);
    }
  };

  // 🎯 COMPATIBILITÉ AVEC L'ANCIEN SYSTÈME
  const handleVote = async (groupId: string, newVoteCount: number) => {
    if (!activeSessionId || !userId) return;

    try {
      await castVote({
        sessionId: activeSessionId as Id<"dotVotingSessions">,
        groupId,
        votes: newVoteCount,
        color: userColor,
      });
    } catch (error) {
      toast.error("Failed to cast vote");
      console.error(error);
    }
  };

  const stats = useMemo(() => {
    if (!sessionResults) return null;

    const totalVotesCast = sessionResults.results.reduce((sum, result) => sum + result.totalVotes, 0);
    const userVotesRemaining = Math.max(0, (sessionResults.maxVotesPerUser - sessionResults.userTotalVotes));

    return {
      totalVotesCast,
      userVotesRemaining,
      topGroup: sessionResults.results[0],
      isVotingPhase: currentSession?.votingPhase === "voting",
      isRevealed: currentSession?.votingPhase === "revealed",
      isSetup: currentSession?.votingPhase === "setup",
      totalDots: sessionResults.myVotes.reduce((sum, vote) => sum + vote.votes, 0),
    };
  }, [sessionResults, currentSession]);

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
            ? "Drag & drop dots to vote" 
            : "Prioritize groups with dot voting"}
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
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                      <Badge variant={
                        session.votingPhase === "setup" ? "secondary" :
                        session.votingPhase === "voting" ? "default" :
                        session.votingPhase === "revealed" ? "outline" : "destructive"
                      }>
                        {session.votingPhase}
                      </Badge>
                      <span>{new Date(session.createdAt).toLocaleDateString()}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {activeSessionId && sessionResults && currentSession && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-sm">{sessionResults.session.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={
                    currentSession.votingPhase === "setup" ? "secondary" :
                    currentSession.votingPhase === "voting" ? "default" :
                    currentSession.votingPhase === "revealed" ? "outline" : "destructive"
                  }>
                    {currentSession.votingPhase}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {stats?.totalDots || 0} / {sessionResults.maxVotesPerUser} dots
                  </span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveSessionId(null)}
              >
                <Trash2 size={14} />
              </Button>
            </div>

            {currentSession.createdBy === userId && (
              <div className="flex gap-2">
                {currentSession.votingPhase === "setup" && (
                  <Button onClick={handleStartVoting} size="sm" className="flex-1">
                    <Play size={14} className="mr-1" />
                    Start Voting
                  </Button>
                )}
                {currentSession.votingPhase === "voting" && (
                  <Button onClick={handleRevealVotes} size="sm" className="flex-1">
                    <Eye size={14} className="mr-1" />
                    Reveal Votes
                  </Button>
                )}
              </div>
            )}

            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">
                  {stats?.isVotingPhase ? "Your Dots (Private)" : "Your Dots"}
                </span>
              </div>
              <Badge variant={(stats?.userVotesRemaining ?? 0) > 0 ? "default" : "destructive"}>
                {stats?.userVotesRemaining ?? 0} / {sessionResults.maxVotesPerUser}
              </Badge>
            </div>

            {stats?.isVotingPhase && (
              <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 text-yellow-800">
                  <Eye size={14} />
                  <span className="text-xs font-medium">Dots are invisible to others</span>
                </div>
              </div>
            )}

            {/* 🎯 ONGLETS POUR CHOISIR LE MODE */}
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "dots" | "list")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="dots" className="flex items-center gap-2">
                  <Grid size={14} />
                  Dots View
                </TabsTrigger>
                <TabsTrigger value="list" className="flex items-center gap-2">
                  <Vote size={14} />
                  List View
                </TabsTrigger>
              </TabsList>

              <TabsContent value="dots" className="space-y-4">
                {/* 🎯 VUE DRAG & DROP */}
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {groups.map(group => (
                    <VotingGroup
                      key={group.id}
                      sessionId={activeSessionId}
                      group={group}
                      isVotingPhase={stats?.isVotingPhase || false}
                      onAddDot={(position) => handleAddDot(group.id, position)}
                    />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="list" className="space-y-3">
                {/* 🎯 VUE LISTE (COMPATIBILITÉ) */}
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
                      {!stats?.isVotingPhase && result.totalVotes > 0 && (
                        <p className="text-xs text-green-600 font-medium">
                          {result.totalVotes} total votes
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleVote(result.groupId, Math.max(0, result.userVotes - 1))}
                        disabled={result.userVotes === 0}
                        className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-medium disabled:opacity-30 hover:bg-gray-300"
                      >
                        −
                      </button>
                      
                      <div className="w-8 text-center">
                        <span className={`text-sm font-bold ${
                          result.userVotes > 0 ? 'text-purple-600' : 'text-gray-400'
                        }`}>
                          {result.userVotes}
                        </span>
                      </div>
                      
                      <button
                        onClick={() => handleVote(result.groupId, result.userVotes + 1)}
                        disabled={(stats?.userVotesRemaining ?? 0) === 0}
                        className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-medium disabled:opacity-30 hover:bg-purple-200"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </TabsContent>
            </Tabs>

            {stats && stats.isRevealed && stats.totalVotesCast > 0 && (
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