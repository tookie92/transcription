// components/VotingSessionManager.tsx - VERSION PROFESSIONNELLE

"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Vote, Eye, EyeOff, Play, Square, Users, HelpCircle } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";

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
  const [showHelp, setShowHelp] = useState(false);
  const [showEndSessionDialog, setShowEndSessionDialog] = useState(false);

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
        isSilentMode: true, // 🎯 MODE SILENCIEUX PAR DÉFAUT
      });
      toast.success("Voting session started");
    } catch (error) {
      console.error("Failed to create session:", error);
      toast.error("Failed to start voting session");
    }
  };

  const handleRevealVotes = async (): Promise<void> => {
    if (!activeSession) return;

    try {
      await revealVotes({ sessionId: activeSession._id });
      toast.success("Votes revealed to all participants");
    } catch (error) {
      console.error("Failed to reveal votes:", error);
      toast.error("Failed to reveal votes");
    }
  };

  const handleEndSession = async (): Promise<void> => {
    if (!activeSession) return;

    try {
      await endSession({ sessionId: activeSession._id });
      setShowEndSessionDialog(false);
      toast.success("Voting session ended");
    } catch (error) {
      console.error("Failed to end session:", error);
      toast.error("Failed to end session");
    }
  };

  const handleToggleSilentMode = async (): Promise<void> => {
    if (!activeSession) return;

    try {
      await toggleSilentMode({ 
        sessionId: activeSession._id, 
        isSilentMode: !activeSession.isSilentMode 
      });
      toast.success(activeSession.isSilentMode ? "Silent mode disabled" : "Silent mode enabled");
    } catch (error) {
      console.error("Failed to toggle silent mode:", error);
      toast.error("Failed to toggle silent mode");
    }
  };

  const myDotsCount = myDots?.length || 0;
  const maxDots = activeSession?.maxDotsPerUser || 0;

  return (
    <TooltipProvider>
      <div className="fixed top-4 right-4 z-40">
        {/* 🎯 BARRE DE CONTRÔLE PRINCIPALE */}
        <div className="flex items-center gap-2 bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg px-4 py-3">
          
          {!activeSession ? (
            // 🎯 AUCUNE SESSION - BOUTON START
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="default"
                  size="sm"
                  className="gap-2"
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
            // 🎯 SESSION ACTIVE - CONTRÔLES COMPLETS
            <>
              {/* STATUT */}
              <div className="flex items-center gap-3">
                {/* COMPTEUR */}
                <Badge variant="secondary" className="text-xs font-mono">
                  {myDotsCount}/{maxDots}
                </Badge>

                {/* MODE SILENCIEUX */}
                <Badge variant={activeSession.isSilentMode ? "default" : "secondary"}>
                  {activeSession.isSilentMode ? (
                    <EyeOff size={12} className="mr-1" />
                  ) : (
                    <Eye size={12} className="mr-1" />
                  )}
                  {activeSession.isSilentMode ? "Silent" : "Live"}
                </Badge>

                {/* PHASE */}
                <Badge variant={
                  activeSession.votingPhase === "voting" ? "default" :
                  activeSession.votingPhase === "revealed" ? "secondary" : "outline"
                }>
                  {activeSession.votingPhase}
                </Badge>
              </div>

              {/* BOUTONS D'ACTION */}
              <div className="flex items-center gap-2">
                {/* PLACER DES DOTS */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isPlacingDot ? "default" : "outline"}
                      size="sm"
                      className="gap-2"
                      onClick={onToggleDotPlacement}
                    >
                      <Vote size={16} />
                      {isPlacingDot ? "Placing..." : "Place Votes"}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{isPlacingDot ? "Click on groups to place votes" : "Start placing vote dots"}</p>
                  </TooltipContent>
                </Tooltip>

                {/* RÉVÉLER LES VOTES (FACILITATEUR ONLY) */}
                {activeSession.createdBy === userId && activeSession.votingPhase === "voting" && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
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

                {/* TOGGLE SILENT MODE (FACILITATEUR ONLY) */}
                {activeSession.createdBy === userId && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={activeSession.isSilentMode ? "default" : "outline"}
                        size="icon"
                        className="w-8 h-8"
                        onClick={handleToggleSilentMode}
                      >
                        {activeSession.isSilentMode ? <EyeOff size={14} /> : <Eye size={14} />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{activeSession.isSilentMode ? "Votes are hidden" : "Votes are visible"}</p>
                    </TooltipContent>
                  </Tooltip>
                )}

                {/* AIDE */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8"
                      onClick={() => setShowHelp(true)}
                    >
                      <HelpCircle size={14} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Show voting instructions</p>
                  </TooltipContent>
                </Tooltip>

                {/* TERMINER LA SESSION (FACILITATEUR ONLY) */}
                {activeSession.createdBy === userId && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="w-8 h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setShowEndSessionDialog(true)}
                      >
                        <Square size={14} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>End voting session</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </>
          )}
        </div>

        {/* 🎯 INDICATEUR MODE PLACEMENT (DISCRET) */}
        {isPlacingDot && (
          <div className="flex justify-center mt-2">
            <Badge variant="default" className="animate-pulse bg-green-600">
              🎯 Click on groups to place votes
            </Badge>
          </div>
        )}
      </div>

      {/* 🎯 MODAL D'AIDE */}
      <AlertDialog open={showHelp} onOpenChange={setShowHelp}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dot Voting Instructions</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-3 mt-4">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <span><strong>Your votes</strong> appear with a checkmark</span>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-muted-foreground rounded-full" />
                  <span><strong>Others{`'`} votes</strong> are {activeSession?.isSilentMode ? "hidden until revealed" : "visible"}</span>
                </div>
                
                <div className="text-sm text-muted-foreground mt-4">
                  {activeSession?.isSilentMode 
                    ? "In silent mode, only you can see your votes until the facilitator reveals them."
                    : "In live mode, all votes are visible to everyone."
                  }
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Got it</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 🎯 MODAL DE CONFIRMATION FIN DE SESSION */}
      <AlertDialog open={showEndSessionDialog} onOpenChange={setShowEndSessionDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End Voting Session?</AlertDialogTitle>
            <AlertDialogDescription>
              This will end the voting session for all participants. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleEndSession}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              End Session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}