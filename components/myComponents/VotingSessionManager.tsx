// components/VotingSessionManager.tsx

"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Vote, Eye, EyeOff, Play, Square, Users } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";

interface VotingSessionManagerProps {
  mapId: string;
  projectId: string;
  isPlacingDot: boolean;
  onToggleDotPlacement: () => void;
}

export function VotingSessionManager({ 
  mapId, 
  projectId, 
  isPlacingDot, 
  onToggleDotPlacement 
}: VotingSessionManagerProps) {
  const { userId } = useAuth();
  const [showSessionMenu, setShowSessionMenu] = useState(false);

  // 🎯 QUERIES
  const activeSessions = useQuery(api.dotVoting.getActiveSessions, { 
    mapId: mapId as Id<"affinityMaps"> 
  });
  const myDots = useQuery(api.dotVoting.getMyDots, 
    activeSessions && activeSessions.length > 0 ? { 
      sessionId: activeSessions[0]._id 
    } : "skip"
  );

  // 🎯 MUTATIONS
  const createSession = useMutation(api.dotVoting.createSession);
  const revealVotes = useMutation(api.dotVoting.revealVotes);
  const endSession = useMutation(api.dotVoting.endSession);
  const toggleSilentMode = useMutation(api.dotVoting.toggleSilentMode);

  const activeSession = activeSessions && activeSessions.length > 0 ? activeSessions[0] : null;

const handleCreateSession = async (): Promise<void> => {
  if (!userId) return;

  try {
    await createSession({
      projectId: projectId as Id<"projects">,
      mapId: mapId as Id<"affinityMaps">,
      name: "Dot Voting Session",
      maxDotsPerUser: 10,
      isSilentMode: false, // 🎯 FORCER LE MODE VISIBLE POUR TEST
    });
    setShowSessionMenu(false);
  } catch (error) {
    console.error("Failed to create session:", error);
  }
};


  const handleRevealVotes = async (): Promise<void> => {
    if (!activeSession) return;

    try {
      await revealVotes({ sessionId: activeSession._id });
    } catch (error) {
      console.error("Failed to reveal votes:", error);
    }
  };

  const handleEndSession = async (): Promise<void> => {
    if (!activeSession) return;

    try {
      await endSession({ sessionId: activeSession._id });
      setShowSessionMenu(false);
    } catch (error) {
      console.error("Failed to end session:", error);
    }
  };

  const handleToggleSilentMode = async (): Promise<void> => {
    if (!activeSession) return;

    try {
      await toggleSilentMode({ 
        sessionId: activeSession._id, 
        isSilentMode: !activeSession.isSilentMode 
      });
    } catch (error) {
      console.error("Failed to toggle silent mode:", error);
    }
  };

  const myDotsCount = myDots?.length || 0;
  const maxDots = activeSession?.maxDotsPerUser || 0;

  // Ajouter temporairement dans VotingSessionManager
// console.log('🔍 Session State:', { 
//   activeSessions, 
//   myDots, 
//   isPlacingDot,
//   userId: userId
// });

  return (
    <TooltipProvider>
      <div className="fixed top-4 right-4 z-40">
        {/* BOUTON PRINCIPAL */}
        <div className="flex items-center gap-2 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-full shadow-lg px-4 py-2">
          {!activeSession ? (
            // 🎯 AUCUNE SESSION ACTIVE
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="default"
                  size="sm"
                  className="rounded-full gap-2"
                  onClick={handleCreateSession}
                >
                  <Vote size={16} />
                  Start Voting
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Start a new dot voting session</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            // 🎯 SESSION ACTIVE
            
            <>

            {isPlacingDot && (
  <div className="fixed inset-0 bg-yellow-400 bg-opacity-20 z-40 pointer-events-none">
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-yellow-500 text-white px-6 py-4 rounded-lg shadow-xl border-2 border-yellow-700 pointer-events-auto animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-6 h-6 bg-white rounded-full animate-bounce" />
        <div>
          <div className="font-bold text-lg">🎯 VOTING MODE ACTIVE</div>
          <div className="text-sm">Click on groups to place your votes</div>
        </div>
        <Button 
          onClick={onToggleDotPlacement}
          variant="secondary"
          size="sm"
          className="bg-white text-yellow-700 hover:bg-gray-100"
        >
          Stop Voting
        </Button>
      </div>
    </div>
  </div>
)}
            
              {/* COMPTEUR DE DOTS */}
              <Badge variant="secondary" className="text-xs">
                {myDotsCount}/{maxDots} dots
              </Badge>

              {/* BOUTON PLACER DES DOTS */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isPlacingDot ? "default" : "outline"}
                    size="sm"
                    className="rounded-full gap-2"
                    onClick={onToggleDotPlacement}
                  >
                    <Vote size={16} />
                    {isPlacingDot ? "Placing..." : "Place Dots"}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isPlacingDot ? "Click on groups/insights to place dots" : "Start placing dots"}</p>
                </TooltipContent>
              </Tooltip>

              {/* MODE DISCRET */}
              {activeSession.createdBy === userId && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={activeSession.isSilentMode ? "default" : "outline"}
                      size="icon"
                      className="rounded-full w-8 h-8"
                      onClick={handleToggleSilentMode}
                    >
                      {activeSession.isSilentMode ? <EyeOff size={14} /> : <Eye size={14} />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{activeSession.isSilentMode ? "Silent mode: votes hidden" : "Votes visible"}</p>
                  </TooltipContent>
                </Tooltip>
              )}

              {/* RÉVÉLER LES VOTES */}
              {activeSession.createdBy === userId && activeSession.votingPhase === "voting" && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full gap-2"
                      onClick={handleRevealVotes}
                    >
                      <Play size={14} />
                      Reveal
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Reveal all votes to participants</p>
                  </TooltipContent>
                </Tooltip>
              )}

              {/* TERMINER LA SESSION */}
              {activeSession.createdBy === userId && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-full w-8 h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={handleEndSession}
                    >
                      <Square size={14} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>End voting session</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </>
          )}
        </div>

        {/* INDICATEUR DE STATUT */}
        {activeSession && (
          <div className="flex justify-center mt-2">
            <Badge 
              variant={
                activeSession.votingPhase === "voting" ? "default" :
                activeSession.votingPhase === "revealed" ? "secondary" : "outline"
              }
              className="text-xs"
            >
              {activeSession.votingPhase === "voting" && activeSession.isSilentMode && "Silent Voting"}
              {activeSession.votingPhase === "voting" && !activeSession.isSilentMode && "Live Voting"}
              {activeSession.votingPhase === "revealed" && "Votes Revealed"}
              {activeSession.votingPhase === "completed" && "Completed"}
            </Badge>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}