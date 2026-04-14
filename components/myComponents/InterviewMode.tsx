"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AudioPlayer, AudioPlayerHandle } from "./AudioPlayer";
import { 
  ArrowRight,
  Loader2,
  AlertTriangle,
  Quote,
  Lightbulb,
  ListChecks,
  Sparkles,
  X,
  Check,
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
import { motion } from "framer-motion";

interface InterviewModeProps {
  projectId: Id<"projects">;
  interviewId: Id<"interviews">;
}

type InsightTag = "pain-point" | "quote" | "insight" | "follow-up" | "custom";

const insightTypeConfig: Record<InsightTag, { label: string; color: string; bg: string; icon: React.ComponentType<{ className?: string }> }> = {
  "pain-point": { label: "Pain Point", color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950", icon: AlertTriangle },
  "quote": { label: "Quote", color: "text-[#4CA771]", bg: "bg-[#4CA771]/10", icon: Quote },
  "insight": { label: "Insight", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950", icon: Lightbulb },
  "follow-up": { label: "Follow-up", color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-950", icon: ListChecks },
  "custom": { label: "Custom", color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-950", icon: Sparkles },
};

const defaultUserName = "Researcher";

export function InterviewMode({ projectId, interviewId }: InterviewModeProps) {
  const router = useRouter();
  const { userId } = useAuth();
  const [content, setContent] = useState("");
  const [selectedTag, setSelectedTag] = useState<InsightTag>("insight");
  const [isCreating, setIsCreating] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  
  const audioPlayerRef = useRef<AudioPlayerHandle>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null);

  const interview = useQuery(api.interviews.getById, { interviewId });
  const notes = useQuery(api.liveNotes.list, { interviewId });
  
  const createNote = useMutation(api.liveNotes.create);
  const deleteNote = useMutation(api.liveNotes.remove);
  const createInsight = useMutation(api.insights.createManualInsight);
  const updateNoteInsight = useMutation(api.liveNotes.linkInsight);

  // Session timer
  useEffect(() => {
    sessionTimerRef.current = setInterval(() => { setSessionTime((prev) => prev + 1); }, 1000);
    return () => { if (sessionTimerRef.current) clearInterval(sessionTimerRef.current); };
  }, []);

  // Auto-focus input on mount, but don't prevent Space from working
  useEffect(() => { 
    inputRef.current?.focus(); 
  }, []);

  // Keyboard shortcuts - allow Space to work even when input is focused (for play/pause)
  // But allow typing in input when user explicitly clicks into it
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showEndDialog) return;
      
      const key = e.key.toUpperCase();
      const target = e.target as HTMLElement;
      const isTypingInInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA";
      
      // Allow Space for play/pause even when typing in input
      if (e.code === "Space" && isTypingInInput) {
        e.preventDefault();
        if (audioPlayerRef.current?.getCurrentTime() === 0 || audioPlayerRef.current?.getCurrentTime() === undefined) {
          audioPlayerRef.current?.play();
        } else {
          audioPlayerRef.current?.pause();
        }
        return;
      }
      
      // Other shortcuts only when not typing
      if (isTypingInInput) return;
      
      if (key === "1") { e.preventDefault(); setSelectedTag("insight"); inputRef.current?.focus(); }
      else if (key === "2") { e.preventDefault(); setSelectedTag("pain-point"); inputRef.current?.focus(); }
      else if (key === "3") { e.preventDefault(); setSelectedTag("quote"); inputRef.current?.focus(); }
      else if (key === "4") { e.preventDefault(); setSelectedTag("follow-up"); inputRef.current?.focus(); }
      else if (key === "5") { e.preventDefault(); setSelectedTag("custom"); inputRef.current?.focus(); }
      else if (e.code === "Space") {
        e.preventDefault();
        if (audioPlayerRef.current?.getCurrentTime() === 0 || audioPlayerRef.current?.getCurrentTime() === undefined) {
          audioPlayerRef.current?.play();
        } else {
          audioPlayerRef.current?.pause();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showEndDialog]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleCreateNote = async () => {
    if (!content.trim() || isCreating) return;
    setIsCreating(true);
    try {
      const timestamp = audioPlayerRef.current?.getCurrentTime() ?? sessionTime;
      await createNote({
        interviewId, userId: userId ?? "anonymous", userName: defaultUserName,
        content: content.trim(), timestamp,
        tag: selectedTag as "insight" | "pain-point" | "quote" | "follow-up" | "custom",
      });
      setContent("");
      toast.success("Note added");
      inputRef.current?.focus();
    } catch { toast.error("Failed to add note"); }
    finally { setIsCreating(false); }
  };

  const handleDeleteNote = async (noteId: Id<"liveNotes">) => {
    try { await deleteNote({ noteId }); }
    catch { toast.error("Failed to delete"); }
  };

  const handleEndInterview = async () => {
    setShowEndDialog(false);
    try {
      const notesToConvert = notes?.filter((n) => !n.insightId) || [];
      for (const note of notesToConvert) {
        const insightId = await createInsight({
          interviewId, projectId, type: note.tag as "insight" | "pain-point" | "quote" | "follow-up" || "insight",
          text: note.content, timestamp: note.timestamp,
        });
        if (insightId) await updateNoteInsight({ noteId: note._id, insightId: insightId as Id<"insights"> });
      }
      if (notesToConvert.length > 0) toast.success(`${notesToConvert.length} notes converted to insights`);
      router.push(`/project/${projectId}/interview/${interviewId}`);
    } catch { toast.error("Failed to complete interview"); }
  };

  const getSegmentNotes = (segmentStart: number, segmentEnd: number) => {
    return notes?.filter((n) => n.timestamp >= segmentStart && n.timestamp < segmentEnd) || [];
  };

  if (!interview) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-background overflow-hidden">
      <header className="shrink-0 bg-background border-b border-border shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-foreground">{interview.title}</h1>
            <p className="text-xs text-muted-foreground">Focus Mode • {notes?.length || 0} notes</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => {
            if ((notes?.length || 0) > 0) {
              setShowEndDialog(true);
            } else {
              router.push(`/project/${projectId}/interview/${interviewId}`);
            }
          }}>
            Exit Focus Mode
          </Button>
        </div>
      </header>

      {interview.audioUrl && (
        <div className="bg-card border-b border-border px-6 py-3 shadow-sm">
          <div className="max-w-6xl mx-auto">
            <AudioPlayer ref={audioPlayerRef} src={interview.audioUrl} onTimeUpdate={setCurrentTime} />
          </div>
        </div>
      )}

      <div className="bg-card border-b border-border px-6 py-3 shadow-sm shrink-0">
        <div className="max-w-6xl mx-auto space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {Object.entries(insightTypeConfig).map(([key, config], index) => (
                <button
                  key={key}
                  onClick={() => setSelectedTag(key as InsightTag)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                    selectedTag === key ? `${config.bg} ${config.color} ring-2 ring-offset-1` : "bg-muted text-muted-foreground hover:bg-accent"
                  )}
                >
                  {index + 1}. {config.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              placeholder="Type a note... (Enter to add)"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreateNote(); }}
              disabled={isCreating}
              className="h-10 bg-background border-input focus:bg-background focus:border-[#4CA771] focus:ring-2 focus:ring-[#4CA771]/20"
            />
            <Button onClick={handleCreateNote} disabled={!content.trim() || isCreating} size="icon" className="h-10 w-10 bg-[#4CA771] hover:bg-[#3F9A68]">
              {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 border-r border-border flex flex-col overflow-hidden">
          <div className="px-6 py-3 bg-muted border-b border-border shrink-0">
            <h2 className="text-sm font-semibold text-foreground">Notes ({notes?.length || 0})</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-2">
            {!notes || notes.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <div className="w-12 h-12 mx-auto mb-3 bg-muted rounded-xl flex items-center justify-center">
                  <Lightbulb className="w-6 h-6 opacity-40" />
                </div>
                <p className="text-sm">No notes yet</p>
                <p className="text-xs mt-1">Press 1-5, Enter to save</p>
              </div>
            ) : (
              notes.slice().reverse().map((note) => {
                const config = insightTypeConfig[note.tag as InsightTag];
                const Icon = config?.icon || Lightbulb;
                return (
                  <motion.div
                    key={note._id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="group flex items-start gap-2 p-3 bg-card rounded-xl border border-border hover:border-[#4CA771]/30 hover:shadow-sm transition-all cursor-pointer"
                    onClick={() => { audioPlayerRef.current?.setCurrentTime(note.timestamp); audioPlayerRef.current?.play(); }}
                  >
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", config?.bg || "bg-muted")}>
                      <Icon className={cn("w-4 h-4", config?.color || "text-muted-foreground")} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={cn("text-[10px] font-bold uppercase tracking-wide", config?.color || "text-muted-foreground")}>{config?.label || "Note"}</span>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{formatTime(note.timestamp)}</span>
                          {!note.insightId && (
                            <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); handleDeleteNote(note._id); }}>
                              <X className="w-3 h-3 text-red-500" />
                            </Button>
                          )}
                          {note.insightId && <Check className="w-3 h-3 text-green-500" />}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed mt-1 line-clamp-2">{note.content}</p>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 py-3 bg-muted border-b border-border shrink-0">
            <h2 className="text-sm font-semibold text-foreground">Transcript</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {interview.segments.map((segment: any) => {
              const isActive = currentTime >= segment.start && currentTime < segment.end;
              const segmentNotes = getSegmentNotes(segment.start, segment.end);
              const hasNotes = segmentNotes.length > 0;
              return (
                <div
                  key={segment.id}
                  onClick={() => { audioPlayerRef.current?.setCurrentTime(segment.start); audioPlayerRef.current?.play(); }}
                  className={cn(
                    "p-2.5 rounded-lg cursor-pointer transition-all",
                    isActive ? "bg-[#4CA771]/10 border border-[#4CA771]/30" : "hover:bg-muted border border-transparent"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn("text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded", isActive ? "bg-[#4CA771] text-white" : "bg-muted text-muted-foreground")}>
                      {formatTime(segment.start)}
                    </span>
                    {hasNotes && (
                      <div className="flex gap-0.5">
                        {segmentNotes.slice(0, 5).map((note: any) => (
                          <div key={note._id} className="w-2 h-2 rounded-full bg-orange-500" />
                        ))}
                      </div>
                    )}
                  </div>
                  <p className={cn("text-xs leading-relaxed", isActive ? "text-foreground" : "text-muted-foreground")}>{segment.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <Dialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>End Interview?</DialogTitle>
            <DialogDescription>{notes?.filter((n) => !n.insightId).length || 0} notes will be converted to insights.</DialogDescription>
          </DialogHeader>
          <div className="py-3 space-y-2">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Duration</span><span className="font-mono">{formatTime(sessionTime)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Notes</span><span className="font-medium">{notes?.length || 0}</span></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEndDialog(false)} className="border-border">Continue</Button>
            <Button onClick={handleEndInterview} className="bg-[#4CA771] hover:bg-[#3F9A68]">End & Convert</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}