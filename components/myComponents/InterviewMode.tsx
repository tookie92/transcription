"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AudioPlayer, AudioPlayerHandle } from "./AudioPlayer";
import { 
  X, 
  Mic,
  StickyNote,
  Eye,
  EyeOff,
  Check,
  ArrowRight,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface InterviewModeProps {
  projectId: Id<"projects">;
  interviewId: Id<"interviews">;
}

type NoteTag = "observation" | "question" | "idea" | "painpoint";

  const tagConfig: Record<NoteTag, { label: string; color: string; icon: string; shortcut: string; schemaTag: "observation" | "question" | "idea" | "important" | "action" }> = {
  observation: { label: "Observation", color: "bg-blue-500/20 text-blue-400 border-blue-500/50", icon: "👁", shortcut: "O", schemaTag: "observation" },
  question: { label: "Question", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50", icon: "❓", shortcut: "Q", schemaTag: "question" },
  idea: { label: "Idea", color: "bg-purple-500/20 text-purple-400 border-purple-500/50", icon: "💡", shortcut: "I", schemaTag: "idea" },
  painpoint: { label: "Pain Point", color: "bg-red-500/20 text-red-400 border-red-500/50", icon: "⚠️", shortcut: "P", schemaTag: "important" },
};

const defaultUserName = "Researcher";

export function InterviewMode({ projectId, interviewId }: InterviewModeProps) {
  const router = useRouter();
  const { userId } = useAuth();
  const [content, setContent] = useState("");
  const [selectedTag, setSelectedTag] = useState<NoteTag>("observation");
  const [isCreating, setIsCreating] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showFocusMode, setShowFocusMode] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [isSessionActive, setIsSessionActive] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  
  const audioPlayerRef = useRef<AudioPlayerHandle>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const segmentRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const interview = useQuery(api.interviews.getById, { interviewId });
  const project = useQuery(api.projects.getById, { projectId });
  const notes = useQuery(api.liveNotes.list, { interviewId });
  
  const createNote = useMutation(api.liveNotes.create);
  const deleteNote = useMutation(api.liveNotes.remove);
  const createInsight = useMutation(api.insights.createManualInsight);
  const updateNoteInsight = useMutation(api.liveNotes.linkInsight);

  // Session timer
  useEffect(() => {
    if (isSessionActive) {
      sessionTimerRef.current = setInterval(() => {
        setSessionTime((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
      }
    };
  }, [isSessionActive]);

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current && !showFocusMode) {
      inputRef.current.focus();
    }
  }, [showFocusMode]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in input or dialog is open
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        showEndDialog
      ) {
        return;
      }

      const key = e.key.toUpperCase();

      // Tag shortcuts
      if (key === "O") {
        e.preventDefault();
        setSelectedTag("observation");
        inputRef.current?.focus();
      } else if (key === "Q") {
        e.preventDefault();
        setSelectedTag("question");
        inputRef.current?.focus();
      } else if (key === "I") {
        e.preventDefault();
        setSelectedTag("idea");
        inputRef.current?.focus();
      } else if (key === "P") {
        e.preventDefault();
        setSelectedTag("painpoint");
        inputRef.current?.focus();
      }

      // Space: pause/play audio
      if (e.code === "Space" && audioPlayerRef.current) {
        e.preventDefault();
        if (isAudioPlaying) {
          audioPlayerRef.current.pause();
        } else {
          audioPlayerRef.current.play();
        }
      }

      // Escape: exit focus mode
      if (e.key === "Escape" && showFocusMode) {
        setShowFocusMode(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showEndDialog, showFocusMode, isAudioPlaying]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleCreateNote = async () => {
    if (!content.trim() || isCreating) return;

    setIsCreating(true);
    try {
      const timestamp = audioPlayerRef.current?.getCurrentTime() ?? sessionTime;
      
      await createNote({
        interviewId,
        userId: userId ?? "anonymous",
        userName: defaultUserName,
        content: content.trim(),
        timestamp,
        tag: tagConfig[selectedTag].schemaTag,
      });

      setContent("");
      toast.success("Note added", {
        description: `${tagConfig[selectedTag].icon} ${tagConfig[selectedTag].label}`,
      });
      
      if (inputRef.current) {
        inputRef.current.focus();
      }
    } catch (error) {
      console.error("Failed to create note:", error);
      toast.error("Failed to add note");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteNote = async (noteId: Id<"liveNotes">) => {
    try {
      await deleteNote({ noteId });
    } catch (error) {
      console.error("Failed to delete note:", error);
    }
  };

  const handleEndInterview = async () => {
    setShowEndDialog(false);
    
    try {
      // Convert remaining notes to insights
      const notesToConvert = notes?.filter((n) => !n.insightId) || [];
      
      for (const note of notesToConvert) {
        const insightId = await createInsight({
          interviewId,
          projectId,
          type: note.tag as "insight" | "pain-point" | "quote" | "follow-up" || "insight",
          text: note.content,
          timestamp: note.timestamp,
        });
        
        if (insightId) {
          await updateNoteInsight({
            noteId: note._id,
            insightId: insightId as Id<"insights">,
          });
        }
      }

      if (notesToConvert.length > 0) {
        toast.success(`${notesToConvert.length} notes converted to insights`);
      }

      // Stop session
      setIsSessionActive(false);
      
      // Navigate back
      router.push(`/project/${projectId}/interview/${interviewId}`);
    } catch (error) {
      console.error("Failed to end interview:", error);
      toast.error("Failed to complete interview");
    }
  };

  const handleSegmentClick = (timestamp: number) => {
    audioPlayerRef.current?.setCurrentTime(timestamp);
    audioPlayerRef.current?.play();
    setIsSessionActive(true);
  };

  if (!interview || !project) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowEndDialog(true)}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
            Exit Interview
          </Button>
          
          <div className="h-6 w-px bg-border" />
          
          <div>
            <h1 className="font-semibold">{interview.title}</h1>
            {interview.topic && (
              <p className="text-sm text-muted-foreground">{interview.topic}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Session Timer */}
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              isSessionActive ? "bg-green-500 animate-pulse" : "bg-muted"
            )} />
            <span className="font-mono text-lg">{formatTime(sessionTime)}</span>
          </div>

          {/* Focus Mode Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowFocusMode(!showFocusMode)}
            className={cn(showFocusMode && "bg-primary/20 text-primary")}
          >
            {showFocusMode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Transcript Panel */}
        {!showFocusMode && (
          <div className="w-1/2 border-r flex flex-col">
            <div className="px-6 py-4 border-b bg-muted/30">
              <h2 className="font-semibold flex items-center gap-2">
                <Mic className="w-4 h-4" />
                Transcript
              </h2>
              <p className="text-sm text-muted-foreground">
                Click a segment to jump to that moment
              </p>
            </div>
            
            <div 
              ref={transcriptRef}
              className="flex-1 overflow-y-auto p-4 space-y-2"
            >
              {interview.segments.map((segment, index) => {
                const isActive = currentTime >= segment.start && currentTime < segment.end;
                const segmentNotes = notes?.filter(
                  (n) => n.timestamp >= segment.start && n.timestamp < segment.end
                ) || [];
                const hasNotes = segmentNotes.length > 0;
                
                return (
                  <div
                    key={segment.id}
                    ref={(el) => {
                      if (el) segmentRefs.current.set(index, el);
                    }}
                    onClick={() => handleSegmentClick(segment.start)}
                    className={cn(
                      "p-3 rounded-lg cursor-pointer transition-all relative",
                      isActive 
                        ? "bg-primary/20 border border-primary/50" 
                        : "hover:bg-muted",
                      hasNotes && "pl-8"
                    )}
                  >
                    {hasNotes && (
                      <div className="absolute left-2 top-1/2 -translate-y-1/2 flex flex-col gap-1">
                        {segmentNotes.slice(0, 3).map((note) => {
                          const noteTag = note.tag as NoteTag;
                          const tagColor = tagConfig[noteTag]?.color || "bg-muted";
                          const bgClass = tagColor.split(' ')[0];
                          return (
                            <div
                              key={note._id}
                              className={cn(
                                "w-2 h-2 rounded-full cursor-pointer transition-transform hover:scale-150",
                                bgClass,
                                currentTime >= note.timestamp && currentTime < note.timestamp + 5 && "ring-2 ring-primary ring-offset-1 ring-offset-background scale-125"
                              )}
                              title={note.content.substring(0, 50)}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSegmentClick(note.timestamp);
                              }}
                            />
                          );
                        })}
                        {segmentNotes.length > 3 && (
                          <span className="text-[10px] text-muted-foreground">+{segmentNotes.length - 3}</span>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn(
                        "text-xs font-mono px-1.5 py-0.5 rounded",
                        isActive ? "bg-primary text-primary-foreground" : "bg-muted"
                      )}>
                        {formatTime(segment.start)}
                      </span>
                      {segment.speaker && (
                        <Badge variant="outline" className="text-xs">
                          {segment.speaker}
                        </Badge>
                      )}
                      {hasNotes && (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <StickyNote className="w-3 h-3" />
                          {segmentNotes.length}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm">{segment.text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Live Notes Panel */}
        <div className={cn("flex flex-col", showFocusMode ? "w-full" : "w-1/2")}>
          <div className="px-6 py-4 border-b bg-muted/30">
            <h2 className="font-semibold flex items-center gap-2">
              <StickyNote className="w-4 h-4" />
              Live Notes
            </h2>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                Press O, Q, I, P to switch tags
              </Badge>
            </div>
          </div>

          {/* Note Input */}
          <div className="p-4 space-y-3 border-b">
            {/* Current tag indicator */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "px-3 py-1 rounded-full text-sm font-medium border",
                  tagConfig[selectedTag].color
                )}>
                  {tagConfig[selectedTag].icon} {tagConfig[selectedTag].label}
                  <span className="ml-2 text-xs opacity-60">({tagConfig[selectedTag].shortcut})</span>
                </span>
              </div>
              <span className="text-sm text-muted-foreground">
                ⏱ {formatTime(sessionTime)}
              </span>
            </div>

            {/* Input */}
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                placeholder="Type your observation... (Enter to add)"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreateNote();
                  }
                }}
                disabled={isCreating}
                className="flex-1"
              />
              <Button 
                onClick={handleCreateNote}
                disabled={!content.trim() || isCreating}
                size="icon"
              >
                {isCreating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
              </Button>
            </div>

            {/* Quick Tag Buttons */}
            <div className="flex gap-2">
              {(Object.keys(tagConfig) as NoteTag[]).map((tag) => (
                <button
                  key={tag}
                  onClick={() => {
                    setSelectedTag(tag);
                    inputRef.current?.focus();
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                    selectedTag === tag
                      ? `${tagConfig[tag].color} ring-2 ring-offset-2 ring-offset-background`
                      : "bg-muted hover:bg-muted/80 border-muted-foreground/30"
                  )}
                >
                  {tagConfig[tag].icon} {tagConfig[tag].label}
                  <span className="ml-1 opacity-50">({tagConfig[tag].shortcut})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Notes List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {!notes || notes.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <StickyNote className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Start taking notes</p>
                <p className="text-xs mt-1">They will be timestamped automatically</p>
              </div>
            ) : (
              notes.slice().reverse().map((note) => {
                const isNearCurrentTime = currentTime >= note.timestamp && currentTime < note.timestamp + 10;
                return (
                <Card 
                  key={note._id}
                  className={cn(
                    "group transition-all cursor-pointer",
                    note.insightId && "opacity-60",
                    isNearCurrentTime && !note.insightId && "ring-2 ring-primary bg-primary/5"
                  )}
                  onClick={() => handleSegmentClick(note.timestamp)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn(
                            "text-xs font-mono px-1.5 py-0.5 rounded",
                            note.tag ? tagConfig[note.tag as NoteTag]?.color.split(' ')[0] : "bg-muted"
                          )}>
                            {formatTime(note.timestamp)}
                          </span>
                          {note.tag && (
                            <Badge 
                              variant="outline" 
                              className={cn("text-xs", tagConfig[note.tag as NoteTag]?.color)}
                            >
                              {tagConfig[note.tag as NoteTag]?.icon}
                            </Badge>
                          )}
                          {note.insightId && (
                            <Badge variant="outline" className="text-xs text-green-500">
                              <Check className="w-3 h-3 mr-1" />
                              Sent
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm">{note.content}</p>
                      </div>
                      
                      {!note.insightId && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100"
                          onClick={() => handleDeleteNote(note._id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
                );
              })
            )}
          </div>
        </div>
      </main>

      {/* Footer with Audio Player */}
      <footer className="px-6 py-4 border-t bg-card/50 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-6">
          {/* Audio Player */}
          <div className="flex-1 max-w-2xl">
            {interview.audioUrl && (
              <AudioPlayer 
                ref={audioPlayerRef} 
                src={interview.audioUrl}
                onTimeUpdate={setCurrentTime}
                onPlayStateChange={setIsAudioPlaying}
              />
            )}
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {notes?.length || 0} notes
            </span>
            <Button
              onClick={() => setShowEndDialog(true)}
              className="gap-2"
            >
              End Interview
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </footer>

      {/* End Interview Dialog */}
      <Dialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End Interview?</DialogTitle>
            <DialogDescription>
              You have {notes?.filter((n) => !n.insightId).length || 0} notes that will be converted to insights.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center justify-between text-sm">
              <span>Session Duration</span>
              <span className="font-mono">{formatTime(sessionTime)}</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span>Total Notes</span>
              <span>{notes?.length || 0}</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span>Notes to Convert</span>
              <span>{notes?.filter((n) => !n.insightId).length || 0}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEndDialog(false)}>
              Continue Interview
            </Button>
            <Button onClick={handleEndInterview}>
              End & Convert Notes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
