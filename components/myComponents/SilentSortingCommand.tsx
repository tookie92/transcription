// components/SilentSortingCommand.tsx
"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Timer, Users, Volume2, VolumeX, Play, Square, Clock } from "lucide-react";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";
import { useSilentSorting } from "@/hooks/useSilentSorting";

interface SilentSortingCommandProps {
  mapId: string;
  currentUserId: string;
}

export function SilentSortingCommand({ mapId, currentUserId }: SilentSortingCommandProps) {
  const [open, setOpen] = useState(false);
  
  const { isSilentSortingActive, groupTimeLeft, personalTimeLeft, currentPhase, activeSession } = useSilentSorting(mapId);
  const startSilentSorting = useMutation(api.silentSorting.startSilentSorting);
  const endSilentSorting = useMutation(api.silentSorting.endSilentSorting);
  const joinSilentSorting = useMutation(api.silentSorting.joinSilentSorting);

  const startSession = async (duration: number): Promise<void> => {
    try {
      await startSilentSorting({
        mapId: mapId as Id<"affinityMaps">,
        duration: duration,
      });
      setOpen(false);
      toast.success(`Silent sorting started!`);
    } catch (error) {
      console.error('Failed to start silent sorting:', error);
      toast.error('Failed to start session');
    }
  };

  const endSession = async (): Promise<void> => {
    if (!activeSession) return;

    try {
      await endSilentSorting({ sessionId: activeSession._id });
      setOpen(false);
      toast.success('Session ended');
    } catch (error) {
      console.error('Failed to end session:', error);
      toast.error('Failed to end session');
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusBadge = () => {
    if (!isSilentSortingActive) {
      return <Badge variant="outline">Ready</Badge>;
    }
    
    switch (currentPhase) {
      case 'group-sorting':
        return <Badge className="bg-yellow-500">Group: {formatTime(groupTimeLeft)}</Badge>;
      case 'personal-review':
        return <Badge className="bg-blue-500">Personal: {formatTime(personalTimeLeft)}</Badge>;
      case 'discussion':
        return <Badge className="bg-green-500">Discuss</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="gap-2"
        >
          <Timer className="w-4 h-4" />
          Silent Sort
          {getStatusBadge()}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80 p-0" align="end">
        <Command>
          <CommandInput placeholder="Search sessions..." />
          <CommandList>
            <CommandEmpty>No sessions found.</CommandEmpty>
            
            {/* SESSION ACTIVE */}
            {isSilentSortingActive && (
              <CommandGroup heading="Active Session">
                <CommandItem className="flex flex-col items-start gap-2">
                  <div className="flex items-center gap-2 w-full">
                    <VolumeX className="w-4 h-4 text-yellow-500" />
                    <span className="font-medium">Silent Sorting Active</span>
                  </div>
                  
                  <div className="flex gap-4 text-sm text-muted-foreground w-full">
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {activeSession?.participants.length || 0} users
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {currentPhase === 'group-sorting' && `${formatTime(groupTimeLeft)} group`}
                      {currentPhase === 'personal-review' && `${formatTime(personalTimeLeft)} personal`}
                      {currentPhase === 'discussion' && 'Discussion'}
                    </div>
                  </div>

                  {activeSession?.createdBy === currentUserId && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={endSession}
                      className="w-full mt-2"
                    >
                      <Square className="w-4 h-4 mr-2" />
                      End Session
                    </Button>
                  )}
                </CommandItem>
              </CommandGroup>
            )}

            {/* START NEW SESSION */}
            <CommandGroup heading="Start New Session">
              <CommandItem onSelect={() => startSession(10 * 60)}>
                <Play className="w-4 h-4 mr-2" />
                <div>
                  <div>Quick Session</div>
                  <div className="text-sm text-muted-foreground">10 min group + 5 min personal</div>
                </div>
              </CommandItem>
              
              <CommandItem onSelect={() => startSession(15 * 60)}>
                <Play className="w-4 h-4 mr-2" />
                <div>
                  <div>Standard Session</div>
                  <div className="text-sm text-muted-foreground">15 min group + 5 min personal</div>
                </div>
              </CommandItem>
              
              <CommandItem onSelect={() => startSession(20 * 60)}>
                <Play className="w-4 h-4 mr-2" />
                <div>
                  <div>Extended Session</div>
                  <div className="text-sm text-muted-foreground">20 min group + 5 min personal</div>
                </div>
              </CommandItem>
            </CommandGroup>

            {/* SESSION INFO */}
            <CommandGroup heading="About Silent Sorting">
              <CommandItem className="text-muted-foreground">
                <div className="text-sm">
                  <p>• Group phase: Work independently, no discussion</p>
                  <p>• Personal phase: Finalize your groupings</p>
                  <p>• Discussion: Compare and refine together</p>
                </div>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}