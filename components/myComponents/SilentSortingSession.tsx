// components/SilentSortingSession.tsx
"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Timer, Users, Volume2, VolumeX, Play, Square } from "lucide-react";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";

interface SilentSortingSessionProps {
  mapId: string;
  currentUserId: string;
}

export function SilentSortingSession({ mapId, currentUserId }: SilentSortingSessionProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isClientJoined, setIsClientJoined] = useState(false);

  // 🎯 QUERIES ET MUTATIONS
  const activeSession = useQuery(api.silentSorting.getActiveSilentSorting, {
    mapId: mapId as Id<"affinityMaps">
  });
  
  const startSilentSorting = useMutation(api.silentSorting.startSilentSorting);
  const joinSilentSorting = useMutation(api.silentSorting.joinSilentSorting);
  const endSilentSorting = useMutation(api.silentSorting.endSilentSorting);

  // 🎯 CALCUL DU TEMPS RESTANT
  useEffect(() => {
    if (!activeSession) {
      setTimeLeft(0);
      setIsClientJoined(false);
      return;
    }

    const calculateTimeLeft = (): number => {
      const now = Date.now();
      const endTime = activeSession.endTime;
      return Math.max(0, Math.floor((endTime - now) / 1000));
    };

    setTimeLeft(calculateTimeLeft());
    setIsClientJoined(activeSession.participants.includes(currentUserId));

    // 🎯 MISE À JOUR EN TEMPS RÉEL
    const interval = setInterval(() => {
      const newTimeLeft = calculateTimeLeft();
      setTimeLeft(newTimeLeft);

      if (newTimeLeft <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSession, currentUserId]);

  // 🎯 REJOINDRE LA SESSION AUTOMATIQUEMENT
  useEffect(() => {
    if (activeSession && !isClientJoined) {
      joinSession();
    }
  }, [activeSession, isClientJoined]);

  const joinSession = async (): Promise<void> => {
    if (!activeSession) return;

    try {
      await joinSilentSorting({ sessionId: activeSession._id });
      setIsClientJoined(true);
    } catch (error) {
      console.error('Failed to join silent sorting session:', error);
    }
  };

  const startSession = async (duration: number): Promise<void> => {
    try {
      await startSilentSorting({
        mapId: mapId as Id<"affinityMaps">,
        duration: duration,
      });
      toast.success(`Silent sorting started for ${duration} minutes`);
    } catch (error) {
      console.error('Failed to start silent sorting:', error);
      toast.error('Failed to start silent sorting session');
    }
  };

  const endSession = async (): Promise<void> => {
    if (!activeSession) return;

    try {
      await endSilentSorting({ sessionId: activeSession._id });
      toast.success('Silent sorting session ended');
    } catch (error) {
      console.error('Failed to end silent sorting:', error);
      toast.error('Failed to end silent sorting session');
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isSessionActive = activeSession && timeLeft > 0;
  const isCreator = activeSession?.createdBy === currentUserId;

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Timer className="w-5 h-5" />
          Silent Sorting Session
        </CardTitle>
        <CardDescription>
          Collaborative silent card sorting with synchronized timer
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* SESSION ACTIVE */}
        {isSessionActive && (
          <div className="space-y-4">
            {/* TIMER ET PARTICIPANTS */}
            <div className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-800">
                    {formatTime(timeLeft)}
                  </div>
                  <div className="text-xs text-yellow-600">Time remaining</div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm text-yellow-700">
                    {activeSession.participants.length} participant(s)
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  <VolumeX className="w-3 h-3 mr-1" />
                  Silent Mode
                </Badge>
                
                {isCreator && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={endSession}
                    className="border-yellow-300 text-yellow-700 hover:bg-yellow-100"
                  >
                    <Square className="w-4 h-4 mr-1" />
                    End Session
                  </Button>
                )}
              </div>
            </div>

            {/* INSTRUCTIONS */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <VolumeX className="w-4 h-4 mt-0.5 text-blue-600 shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">Silent Sorting Rules:</p>
                  <ul className="mt-1 space-y-1">
                    <li>• No discussion allowed - work independently</li>
                    <li>• Focus on grouping insights based on natural patterns</li>
                    <li>• Create new groups when insights don{`'`}t fit existing ones</li>
                    <li>• Don{`'`}t force insights into groups</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* PARTICIPANTS LIST */}
            {activeSession.participants.length > 0 && (
              <div className="text-xs text-muted-foreground">
                Participants: {activeSession.participants.length} user(s) joined
                {isClientJoined && (
                  <Badge variant="outline" className="ml-2 bg-green-50 text-green-700">
                    You joined
                  </Badge>
                )}
              </div>
            )}
          </div>
        )}

        {/* START SESSION BUTTONS */}
        {!isSessionActive && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => startSession(10)} // 10 minutes
                variant="outline"
                className="gap-2 h-14 flex-col"
              >
                <Play className="w-4 h-4" />
                <div>
                  <div className="font-medium">Quick Session</div>
                  <div className="text-xs text-muted-foreground">10 min</div>
                </div>
              </Button>
              
              <Button
                onClick={() => startSession(15)} // 15 minutes
                variant="outline"
                className="gap-2 h-14 flex-col"
              >
                <Play className="w-4 h-4" />
                <div>
                  <div className="font-medium">Standard Session</div>
                  <div className="text-xs text-muted-foreground">15 min</div>
                </div>
              </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => startSession(20)} // 20 minutes
                variant="outline"
                className="gap-2 h-14 flex-col"
              >
                <Play className="w-4 h-4" />
                <div>
                  <div className="font-medium">Extended Session</div>
                  <div className="text-xs text-muted-foreground">20 min</div>
                </div>
              </Button>
              
              <Button
                onClick={() => startSession(25)} // 25 minutes
                variant="outline"
                className="gap-2 h-14 flex-col"
              >
                <Play className="w-4 h-4" />
                <div>
                  <div className="font-medium">Deep Dive</div>
                  <div className="text-xs text-muted-foreground">25 min</div>
                </div>
              </Button>
            </div>

            <div className="text-xs text-muted-foreground text-center pt-2">
              All participants will be automatically synchronized
            </div>
          </div>
        )}

        {/* SESSION COMPLETED */}
        {activeSession && !isSessionActive && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
            <div className="flex items-center justify-center gap-2 text-green-800">
              <Timer className="w-4 h-4" />
              <span className="font-medium">Silent Sorting Completed!</span>
            </div>
            <p className="text-sm text-green-700 mt-1">
              Time to discuss and refine the groups together
            </p>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              size="sm"
              className="mt-2 border-green-300 text-green-700 hover:bg-green-100"
            >
              Start Discussion Phase
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}