"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Mic, 
  StickyNote, 
  Trash2, 
  Clock, 
  ChevronRight,
  Loader2,
  Send,
  Check,
  ArrowRight
} from "lucide-react";
import { toast } from "sonner";

interface LiveNotesPanelProps {
  interviewId: Id<"interviews">;
  projectId: Id<"projects">;
  currentTime: number;
  onTimeChange: (time: number) => void;
  onSeek: (time: number) => void;
}

type NoteTag = "observation" | "question" | "idea" | "important" | "action";

const tagConfig: Record<NoteTag, { label: string; color: string; icon: string }> = {
  observation: { label: "Observation", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300", icon: "👁" },
  question: { label: "Question", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300", icon: "❓" },
  idea: { label: "Idea", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300", icon: "💡" },
  important: { label: "Important", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300", icon: "⚠️" },
  action: { label: "Action", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300", icon: "✅" },
};

const defaultUserName = "Anonymous";

export function LiveNotesPanel({ 
  interviewId, 
  projectId,
  currentTime,
  onTimeChange,
  onSeek
}: LiveNotesPanelProps) {
  const { userId } = useAuth();
  const [content, setContent] = useState("");
  const [selectedTag, setSelectedTag] = useState<NoteTag | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set());
  const [isSending, setIsSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const notes = useQuery(api.liveNotes.list, { interviewId });
  const createNote = useMutation(api.liveNotes.create);
  const deleteNote = useMutation(api.liveNotes.remove);
  const updateNoteInsight = useMutation(api.liveNotes.linkInsight);
  const createInsight = useMutation(api.insights.createManualInsight);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleCreateNote = async () => {
    if (!content.trim() || isCreating) return;

    setIsCreating(true);
    try {
      const timestamp = currentTime;
      
      await createNote({
        interviewId,
        userId: userId ?? "anonymous",
        userName: defaultUserName,
        content: content.trim(),
        timestamp,
        tag: selectedTag ?? undefined,
      });

      setContent("");
      setSelectedTag(null);
      toast.success("Note added");
      
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
    setDeletingId(noteId as string);
    try {
      await deleteNote({ noteId });
      toast.success("Note deleted");
      setSelectedNotes((prev) => {
        const next = new Set(prev);
        next.delete(noteId as string);
        return next;
      });
    } catch (error) {
      console.error("Failed to delete note:", error);
      toast.error("Failed to delete note");
    } finally {
      setDeletingId(null);
    }
  };

  const handleNoteClick = (timestamp: number) => {
    onTimeChange(timestamp);
    onSeek(timestamp);
  };

  const handleNoteSelect = (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(noteId)) {
        next.delete(noteId);
      } else {
        next.add(noteId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedNotes.size === notes?.length) {
      setSelectedNotes(new Set());
    } else {
      setSelectedNotes(new Set(notes?.map((n) => n._id) || []));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleCreateNote();
    }
  };

  // Map note tags to insight types
  const tagToInsightType = (tag: NoteTag | undefined): "insight" | "pain-point" | "quote" | "follow-up" => {
    switch (tag) {
      case "observation":
        return "insight";
      case "question":
        return "follow-up";
      case "idea":
        return "insight";
      case "important":
        return "pain-point";
      case "action":
        return "follow-up";
      default:
        return "insight";
    }
  };

  const handleSendToCanvas = async () => {
    if (selectedNotes.size === 0) {
      toast.error("Select at least one note");
      return;
    }

    setIsSending(true);
    try {
      const selectedNotesList = notes?.filter((n) => selectedNotes.has(n._id)) || [];
      
      for (const note of selectedNotesList) {
        // Creer l'insight
        const insightId = await createInsight({
          interviewId,
          projectId,
          type: tagToInsightType(note.tag as NoteTag | undefined),
          text: note.content,
          timestamp: note.timestamp,
        });
        
        // Lier l'insight a la note (pour suppression cascade)
        if (insightId) {
          await updateNoteInsight({
            noteId: note._id,
            insightId: insightId as Id<"insights">,
          });
        }
      }

      toast.success(`${selectedNotes.size} note(s) converted to insights — go to Canvas to organize them`, {
        action: {
          label: "Go to Canvas",
          onClick: () => window.location.href = `/project/${projectId}/affinity/`,
        },
      });
      setSelectedNotes(new Set());
    } catch (error) {
      console.error("Failed to send to canvas:", error);
      toast.error("Failed to send to canvas");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b">
        <StickyNote className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">Live Notes</h3>
        <Badge variant="secondary" className="ml-auto">
          {notes?.length ?? 0} notes
        </Badge>
      </div>

      {/* Input Area */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>Current: {formatTime(currentTime)}</span>
        </div>
        
        <Input
          ref={inputRef}
          placeholder="Type your note..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isCreating}
          className="w-full"
        />

        {/* Tag Selection */}
        <div className="flex flex-wrap gap-1">
          {(Object.keys(tagConfig) as NoteTag[]).map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
              className={`px-2 py-1 text-xs rounded-full transition-colors ${
                selectedTag === tag
                  ? `${tagConfig[tag].color} border-2 border-current`
                  : "bg-muted hover:bg-muted/80 text-muted-foreground"
              }`}
            >
              {tagConfig[tag].icon} {tagConfig[tag].label}
            </button>
          ))}
        </div>

        <Button 
          onClick={handleCreateNote}
          disabled={!content.trim() || isCreating}
          className="w-full gap-2"
          size="sm"
        >
          {isCreating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Mic className="w-4 h-4" />
              Add Note
            </>
          )}
        </Button>
      </div>

      {/* Notes List */}
      <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-2">
        {!notes || notes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <StickyNote className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No notes yet</p>
            <p className="text-xs mt-1">
              Notes will be timestamped with the current audio position
            </p>
          </div>
        ) : (
          <>
            {/* Selection controls */}
            <div className="flex items-center justify-between mb-2 pb-2 border-b">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedNotes.size === notes.length && notes.length > 0}
                  onCheckedChange={handleSelectAll}
                  id="select-all"
                />
                <label htmlFor="select-all" className="text-sm cursor-pointer">
                  Select all
                </label>
              </div>
              {selectedNotes.size > 0 && (
                <Button
                  size="sm"
                  onClick={handleSendToCanvas}
                  disabled={isSending}
                  className="gap-2 bg-primary hover:bg-primary/90"
                >
                  {isSending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send to Canvas ({selectedNotes.size})
                    </>
                  )}
                </Button>
              )}
            </div>

            {notes.map((note) => {
              const isSelected = selectedNotes.has(note._id);
              return (
                <Card 
                  key={note._id} 
                  className={`group hover:shadow-md transition-all cursor-pointer ${
                    isSelected ? "ring-2 ring-primary bg-primary/5" : ""
                  }`}
                  onClick={() => handleNoteClick(note.timestamp)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                      {/* Checkbox */}
                      <div 
                        className="mt-1 cursor-pointer"
                        onClick={(e) => handleNoteSelect(note._id, e)}
                      >
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          isSelected 
                            ? "bg-primary border-primary" 
                            : "border-muted-foreground hover:border-foreground"
                        }`}>
                          {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        {/* Timestamp & Tag */}
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                            {formatTime(note.timestamp)}
                          </span>
                          {note.tag && (
                            <span className={`text-xs px-1.5 py-0.5 rounded ${tagConfig[note.tag as NoteTag].color}`}>
                              {tagConfig[note.tag as NoteTag].icon} {tagConfig[note.tag as NoteTag].label}
                            </span>
                          )}
                        </div>
                        
                        {/* Content */}
                        <p className="text-sm text-foreground break-words">
                          {note.content}
                        </p>
                        
                        {/* Footer */}
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {note.userName}
                            </span>
                            {note.insightId && (
                              <Badge variant="outline" className="text-xs gap-1 text-green-600 border-green-200">
                                <Check className="w-3 h-3" />
                                Sent
                              </Badge>
                            )}
                          </div>
                          {!note.insightId && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteNote(note._id);
                              }}
                              disabled={deletingId === note._id}
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-6" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
