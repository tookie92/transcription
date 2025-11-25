// components/SilentSortingSession.tsx - VERSION CORRIGÉE
"use client";

import { useState, useEffect, useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Timer, Users, VolumeX, Eye, MessageCircle, CheckCircle2, Play, Pause, SkipForward } from "lucide-react";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";
import { SilentSortingPhase } from "@/types";

interface SilentSortingSessionProps {
  mapId: string;
  currentUserId: string;
}

// 🎯 INTERFACES POUR LES DONNÉES TYPÉES
interface PhaseRules {
  preparation: string[];
  sorting: string[];
  discussion: string[];
  completed: string[];
  idle: string[];
}

interface PhaseColors {
  preparation: string;
  sorting: string;
  discussion: string;
  completed: string;
  idle: string;
}

export function SilentSortingSession({ mapId, currentUserId }: SilentSortingSessionProps) {
  const [localTimeRemaining, setLocalTimeRemaining] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  // 🎯 QUERIES & MUTATIONS
  const activeSession = useQuery(api.silentSorting.getActiveSession, {
    mapId: mapId as Id<"affinityMaps">
  });
  
  const startSession = useMutation(api.silentSorting.startSession);
  const updatePhase = useMutation(api.silentSorting.updatePhase);
  const updateTimer = useMutation(api.silentSorting.updateTimer);

  // 🎯 SYNCHRONISATION DU TIMER
  useEffect(() => {
    if (activeSession) {
      setLocalTimeRemaining(activeSession.timeRemaining);
    }
  }, [activeSession]);

  // 🎯 TIMER AUTOMATIQUE
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRunning && localTimeRemaining > 0) {
      interval = setInterval(() => {
        setLocalTimeRemaining(prev => {
          const newTime = prev - 1;
          
          // Mettre à jour la base toutes les 10 secondes
          if (newTime % 10 === 0 && activeSession) {
            updateTimer({ sessionId: activeSession._id, timeRemaining: newTime });
          }
          
          if (newTime <= 0) {
            setIsRunning(false);
            handlePhaseComplete();
            return 0;
          }
          
          return newTime;
        });
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, localTimeRemaining, activeSession, updateTimer]);

  // 🎯 DÉMARRER UNE SESSION
  const handleStartSession = async (duration: number) => {
    try {
      await startSession({
        mapId: mapId as Id<"affinityMaps">,
        duration,
        participants: [currentUserId],
      });
      toast.success(`Silent sorting session started (${duration} minutes)`);
    } catch (error) {
      console.error('Failed to start session:', error);
      toast.error('Failed to start silent sorting session');
    }
  };

  // 🎯 CHANGER DE PHASE
  const handlePhaseChange = async (newPhase: SilentSortingPhase) => {
    if (!activeSession) return;
    
    try {
      await updatePhase({
        sessionId: activeSession._id,
        phase: newPhase,
      });
      
      if (newPhase === 'sorting') {
        setIsRunning(true);
      } else {
        setIsRunning(false);
      }
    } catch (error) {
      console.error('Failed to update phase:', error);
    }
  };

  // 🎯 QUAND LE TIMER SE TERMINE
  const handlePhaseComplete = async () => {
    if (!activeSession) return;
    
    const nextPhase: SilentSortingPhase = 
      activeSession.phase === 'preparation' ? 'sorting' :
      activeSession.phase === 'sorting' ? 'discussion' : 'completed';
    
    await handlePhaseChange(nextPhase);
    
    if (nextPhase === 'discussion') {
      toast.success("Silent sorting completed! Time for discussion.");
    }
  };

  // 🎯 FORMATER LE TEMPS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 🎯 PROGRESSION POUR LA BARRE
  const getProgress = (): number => {
    if (!activeSession) return 0;
    const totalTime = activeSession.duration * 60;
    return ((totalTime - localTimeRemaining) / totalTime) * 100;
  };

  // 🎯 RÈGLES PAR PHASE - AVEC TYPES STRICTS
  const getPhaseRules = (): string[] => {
    if (!activeSession) return [];
    
    const rules: PhaseRules = {
      preparation: [
        "👀 Review all insights silently",
        "💭 Read each insight carefully",
        "🎯 Understand the scope of research"
      ],
      sorting: [
        "🔇 ABSOLUTELY NO TALKING",
        "🧩 Move insights into natural groups",
        "⚡ Work quickly and independently",
        "➕ Create new groups as needed"
      ],
      discussion: [
        "💬 Discuss grouping patterns",
        "🏷️ Name groups collaboratively",
        "🔍 Look for themes and insights",
        "📝 Note important discoveries"
      ],
      completed: [
        "✅ Session completed successfully",
        "📊 Review the final affinity diagram",
        "🎉 Great job team!"
      ],
      idle: [
        "⏸️ Session is paused",
        "🔄 Ready to start when you are"
      ]
    };
    
    return rules[activeSession.phase] || [];
  };

  // 🎯 COULEUR PAR PHASE - AVEC TYPES STRICTS
  const getPhaseColor = (): "blue" | "orange" | "green" | "gray" => {
    if (!activeSession) return 'gray';
    
    const colors: Record<SilentSortingPhase, "blue" | "orange" | "green" | "gray"> = {
      preparation: "blue",
      sorting: "orange", 
      discussion: "green",
      completed: "gray",
      idle: "gray"
    };
    
    return colors[activeSession.phase];
  };

  // 🎯 DESCRIPTION PAR PHASE - AVEC TYPES STRICTS
  const getPhaseDescription = (): string => {
    if (!activeSession) return '';
    
    const descriptions: Record<SilentSortingPhase, string> = {
      preparation: 'Prepare for silent sorting',
      sorting: 'Silent sorting in progress - NO TALKING',
      discussion: 'Discuss and refine groups',
      completed: 'Session completed successfully',
      idle: 'Ready to start silent sorting session'
    };
    
    return descriptions[activeSession.phase];
  };

  // 🎯 STYLE DE BADGE PAR COULEUR
  const getBadgeClass = (color: "blue" | "orange" | "green" | "gray"): string => {
    const classes = {
      blue: "bg-blue-100 text-blue-800",
      orange: "bg-orange-100 text-orange-800", 
      green: "bg-green-100 text-green-800",
      gray: "bg-gray-100 text-gray-800"
    };
    
    return classes[color];
  };

  if (!activeSession) {
    // 🎯 ÉCRAN DE DÉMARRAGE
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <VolumeX className="w-5 h-5" />
            Silent Sorting Session
          </CardTitle>
          <CardDescription>
            Facilitate structured affinity diagramming sessions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-semibold">NNGroup Best Practices:</h4>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• 10-15 minutes for silent sorting</li>
              <li>• No discussion during sorting phase</li>
              <li>• Independent insight grouping</li>
              <li>• Followed by collaborative discussion</li>
            </ul>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => handleStartSession(10)} variant="outline">
              10 min Session
            </Button>
            <Button onClick={() => handleStartSession(15)} variant="outline">
              15 min Session
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 🎯 SESSION ACTIVE
  const currentPhaseColor = getPhaseColor();
  const currentBadgeClass = getBadgeClass(currentPhaseColor);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <VolumeX className="w-5 h-5" />
            Silent Sorting
          </CardTitle>
          <Badge variant="secondary" className={currentBadgeClass}>
            {activeSession.phase.toUpperCase()}
          </Badge>
        </div>
        <CardDescription>
          {getPhaseDescription()}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* 🎯 TIMER ET CONTRÔLES */}
        <div className="text-center space-y-2">
          <div className="text-3xl font-mono font-bold">
            {formatTime(localTimeRemaining)}
          </div>
          <Progress value={getProgress()} className="h-2" />
          
          <div className="flex justify-center gap-2">
            {activeSession.phase !== 'completed' && (
              <>
                <Button
                  size="sm"
                  variant={isRunning ? "outline" : "default"}
                  onClick={() => setIsRunning(!isRunning)}
                  disabled={activeSession.phase !== 'sorting'}
                >
                  {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handlePhaseComplete()}
                >
                  <SkipForward className="w-4 h-4" />
                  Next Phase
                </Button>
              </>
            )}
          </div>
        </div>

        {/* 🎯 RÈGLES DE LA PHASE COURANTE */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Current Phase Rules
          </h4>
          <ul className="text-sm space-y-1">
            {getPhaseRules().map((rule, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="mt-0.5">•</span>
                {rule}
              </li>
            ))}
          </ul>
        </div>

        {/* 🎯 PARTICIPANTS */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="w-4 h-4" />
          <span>{activeSession.participants.length} participant(s)</span>
        </div>

        {/* 🎯 ACTIONS DE PHASE */}
        {activeSession.phase === 'preparation' && (
          <Button onClick={() => handlePhaseChange('sorting')} className="w-full">
            Start Silent Sorting
          </Button>
        )}
        
        {activeSession.phase === 'sorting' && (
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center gap-2 text-orange-800 font-semibold">
              <VolumeX className="w-4 h-4" />
              SILENT MODE ACTIVE
            </div>
            <p className="text-sm text-orange-700 mt-1">
              No talking allowed. Focus on independent grouping.
            </p>
          </div>
        )}
        
        {activeSession.phase === 'discussion' && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-800 font-semibold">
              <MessageCircle className="w-4 h-4" />
              DISCUSSION PHASE
            </div>
            <p className="text-sm text-green-700 mt-1">
              Discuss patterns and name groups collaboratively.
            </p>
          </div>
        )}
        
        {activeSession.phase === 'completed' && (
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-center">
            <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="font-semibold">Session Completed</p>
            <p className="text-sm text-muted-foreground">
              Great job! The affinity diagramming session is complete.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}