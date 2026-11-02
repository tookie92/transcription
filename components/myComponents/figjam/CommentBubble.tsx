"use client";

import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Trash2, Send } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@clerk/nextjs";
import type { Position } from "@/types/figjam";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CommentBubbleData {
  id: string;
  position: Position;
  targetId?: string;
  targetType?: "sticky" | "label" | "canvas";
  resolved: boolean;
  createdBy?: string;
  createdByName?: string;
}

interface CommentBubbleProps {
  bubble: CommentBubbleData;
  zoom: number;
  pan: Position;
  isSelected: boolean;
  isFiltered?: boolean;
  isBouncing?: boolean;
  onClick: () => void;
  onResolve: () => void;
  onDelete: () => void;
  onDragEnd: (newPosition: Position) => void;
  onOpenThread: () => void;
  mapId?: string;
}

function pastilleInitial(bubble: CommentBubbleData): string {
  const name = bubble.createdByName?.trim();
  if (name) return name.charAt(0).toUpperCase();
  return "?";
}

export function CommentBubble({
  bubble,
  zoom,
  pan,
  isSelected,
  isFiltered = false,
  isBouncing = false,
  onDragEnd,
  onOpenThread,
}: CommentBubbleProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [localPos, setLocalPos] = useState<Position | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const hasMovedRef = useRef(false);

  const screenPos = {
    x: (localPos?.x ?? bubble.position.x) * zoom + pan.x,
    y: (localPos?.y ?? bubble.position.y) * zoom + pan.y,
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button === 2) return;
    e.stopPropagation();
    setIsDragging(true);
    hasMovedRef.current = false;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !dragStartRef.current) return;

    const dx = (e.clientX - dragStartRef.current.x) / zoom;
    const dy = (e.clientY - dragStartRef.current.y) / zoom;

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      hasMovedRef.current = true;
    }

    setLocalPos({
      x: bubble.position.x + dx,
      y: bubble.position.y + dy,
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;

    (e.target as HTMLElement).releasePointerCapture(e.pointerId);

    const finalPos = localPos ?? bubble.position;

    if (hasMovedRef.current) {
      onDragEnd(finalPos);
    }

    setIsDragging(false);
    setLocalPos(null);
    dragStartRef.current = null;
  };

  return (
    <motion.div
      initial={{ scale: 0.92, opacity: 0 }}
      animate={{
        scale: isDragging ? 1.06 : 1,
        opacity: 1,
      }}
      transition={{ duration: 0.12, ease: "easeOut" }}
      exit={{ scale: 0.92, opacity: 0 }}
      className={cn(
        "absolute",
        isSelected ? "z-50" : "z-40",
        isDragging ? "cursor-grabbing" : "cursor-grab",
        isFiltered && "pointer-events-none"
      )}
      style={{
        left: screenPos.x,
        top: screenPos.y,
        transform: "translate(-50%, -50%)",
        opacity: isFiltered ? 0.25 : 1,
      }}
      data-note-pastille
      onPointerDown={isFiltered ? undefined : handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={(e) => {
        if (!hasMovedRef.current) {
          e.stopPropagation();
          onOpenThread();
        }
        hasMovedRef.current = false;
      }}
    >
      {isBouncing && (
        <motion.div
          className="absolute inset-0 border border-foreground/40"
          initial={{ scale: 1, opacity: 0.5 }}
          animate={{ scale: [1, 1.55], opacity: [0.45, 0] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }}
        />
      )}

      <div
        className={cn(
          "relative flex h-7 w-7 items-center justify-center border bg-card shadow-sm",
          "transition-transform duration-150 ease-out",
          bubble.resolved
            ? "border-muted-foreground/50 text-muted-foreground"
            : "border-foreground text-foreground",
          isSelected && "ring-1 ring-offset-1 ring-offset-background ring-foreground",
          isBouncing && "scale-105"
        )}
      >
        {bubble.resolved ? (
          <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
        ) : (
          <span className="font-mono text-[11px] font-medium uppercase leading-none">
            {pastilleInitial(bubble)}
          </span>
        )}
      </div>
    </motion.div>
  );
}

interface CommentThreadProps {
  bubble: CommentBubbleData;
  anchorPosition: Position;
  zoom: number;
  pan: Position;
  onClose: () => void;
  onResolve: () => void;
  onDelete: () => void;
  mapId?: string;
  projectId?: string;
  currentUserId?: string;
  currentUserName?: string;
  presenceUsers?: { id: string; name: string }[];
  onBecameNonEmpty?: () => void;
}

const PEEK_WIDTH = 300;
const GAP = 12;
const DOCK_CLEARANCE = 88;
const EDGE = 12;

function placeBeside(
  screenX: number,
  screenY: number,
  peekHeight: number
): { left: number; top: number } {
  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const maxBottom = vh - DOCK_CLEARANCE;

  let left = screenX + 20 + GAP;
  if (left + PEEK_WIDTH > vw - EDGE) {
    left = screenX - PEEK_WIDTH - GAP - 20;
  }
  left = Math.max(EDGE, Math.min(left, vw - PEEK_WIDTH - EDGE));

  let top = screenY - 24;
  if (top + peekHeight > maxBottom) {
    top = maxBottom - peekHeight;
  }
  top = Math.max(EDGE, top);

  return { left, top };
}

export function CommentThread({
  bubble,
  anchorPosition,
  zoom,
  pan,
  onClose,
  onResolve,
  onDelete,
  mapId,
  projectId,
  currentUserId,
  currentUserName,
  presenceUsers = [],
  onBecameNonEmpty,
}: CommentThreadProps) {
  const { userId } = useAuth();
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ left: number; top: number } | null>(null);

  const comments = useQuery(api.comments.getCommentsByGroup, {
    groupId: bubble.id,
    mapId: (mapId || "") as Id<"affinityMaps">,
  });

  useEffect(() => {
    if (comments && comments.length > 0) {
      onBecameNonEmpty?.();
    }
  }, [comments, onBecameNonEmpty]);

  const addComment = useMutation(api.comments.addComment);
  const createMentionNotification = useMutation(api.notifications.createMentionNotification);

  const screenPos = {
    x: anchorPosition.x * zoom + pan.x,
    y: anchorPosition.y * zoom + pan.y,
  };

  useLayoutEffect(() => {
    const height = panelRef.current?.offsetHeight ?? 280;
    setCoords(placeBeside(screenPos.x, screenPos.y, height));
  }, [screenPos.x, screenPos.y, comments?.length, bubble.id]);

  useEffect(() => {
    const t = window.setTimeout(() => textareaRef.current?.focus(), 40);
    return () => window.clearTimeout(t);
  }, [bubble.id]);

  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (panelRef.current?.contains(target)) return;
      const el = target instanceof Element ? target : null;
      if (el?.closest?.("[data-note-pastille]")) return;
      onClose();
    };
    const timer = window.setTimeout(() => {
      window.addEventListener("pointerdown", handlePointerDown, true);
    }, 0);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [onClose, bubble.id]);

  const parseMentions = (value: string): string[] => {
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;
    while ((match = mentionRegex.exec(value)) !== null) {
      mentions.push(match[1]);
    }
    return mentions;
  };

  const handleSubmit = async () => {
    if (!text.trim() || !mapId || !userId) return;

    try {
      await addComment({
        groupId: bubble.id,
        mapId: mapId as Id<"affinityMaps">,
        text: text.trim(),
        userName: currentUserName || "Anonymous",
      });

      const mentions = parseMentions(text);
      for (const mentionedName of mentions) {
        const mentionedUser = presenceUsers.find((u) =>
          u.name.toLowerCase().startsWith(mentionedName.toLowerCase())
        );

        if (mentionedUser && projectId) {
          try {
            await createMentionNotification({
              mentionedUserId: mentionedUser.id,
              mentionedByUserId: userId,
              mentionedByUserName: currentUserName || "Someone",
              groupId: bubble.id,
              groupTitle: "Note",
              projectId: projectId,
            });
          } catch (e) {
            console.error("Failed to create mention notification:", e);
          }
        }
      }

      setText("");
      onBecameNonEmpty?.();
    } catch {
      toast.error("Could not add note");
    }
  };

  const getAuthorDisplayName = (comment: {
    userId?: string;
    userName?: string;
  }): string => {
    if (comment.userId === userId) return "You";
    return comment.userName || "Anonymous";
  };

  const [mentionSearch, setMentionSearch] = useState("");
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      if (showMentionSuggestions) {
        setShowMentionSuggestions(false);
        return;
      }
      const stillLoading = comments === undefined;
      const empty = Array.isArray(comments) && comments.length === 0;
      const mine =
        !bubble.createdBy ||
        bubble.createdBy === currentUserId ||
        bubble.createdBy === userId;
      if (!stillLoading && empty && mine) {
        onDelete();
        return;
      }
      onClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [
    comments,
    showMentionSuggestions,
    bubble.createdBy,
    currentUserId,
    userId,
    onClose,
    onDelete,
  ]);

  const mentionSuggestions = presenceUsers
    .filter((u: { id: string; name: string }) => {
      if (u.id === userId) return false;
      if (!mentionSearch) return true;
      const search = mentionSearch.toLowerCase();
      const words = u.name.toLowerCase().split(" ");
      return words.some((word) => word.startsWith(search));
    })
    .slice(0, 5);

  const insertMention = (name: string) => {
    const mentionText = `@${name.split(" ")[0]} `;
    const lastAtIndex = text.lastIndexOf("@");
    if (lastAtIndex !== -1) {
      const newText =
        text.substring(0, lastAtIndex) +
        mentionText +
        text.substring(lastAtIndex + mentionSearch.length + 1);
      setText(newText);
    } else {
      setText(text + mentionText);
    }
    setShowMentionSuggestions(false);
    setMentionSearch("");
    setSelectedMentionIndex(0);
    textareaRef.current?.focus();
  };

  const handleTextChange = (newText: string) => {
    setText(newText);
    const atPattern = /@(\w*)$/;
    const match = newText.match(atPattern);

    if (match) {
      setMentionSearch(match[1]);
      setShowMentionSuggestions(true);
      setSelectedMentionIndex(0);
    } else {
      setShowMentionSuggestions(false);
      setMentionSearch("");
    }
  };

  const targetHint =
    bubble.targetType === "sticky"
      ? "On slip"
      : bubble.targetType === "label"
        ? "On packet"
        : "On wall";

  return (
    <motion.div
      ref={panelRef}
      initial={{ opacity: 0, scale: 0.97, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97, y: 4 }}
      transition={{ duration: 0.14, ease: "easeOut" }}
      className="fixed z-[100] w-[min(18.75rem,calc(100%-1.5rem))] border border-border bg-card shadow-lg"
      style={
        coords
          ? { left: coords.left, top: coords.top }
          : { left: EDGE, top: EDGE }
      }
      role="dialog"
      aria-label="Note"
      data-note-peek
    >
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Note
          </p>
          <span className="truncate font-mono text-[10px] text-muted-foreground/80">
            {targetHint}
          </span>
          {bubble.resolved ? (
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Done
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 px-2 font-mono text-[10px] uppercase tracking-widest",
              bubble.resolved && "text-muted-foreground"
            )}
            onClick={onResolve}
          >
            {bubble.resolved ? "Reopen" : "Resolve"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
            onClick={onDelete}
            aria-label="Delete note"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="max-h-52 overflow-y-auto px-3 py-2.5 space-y-3">
        {!comments || comments.length === 0 ? (
          <p
            className="text-[13px] text-muted-foreground py-2"
            style={{ fontFamily: "var(--font-display), serif", fontStyle: "italic" }}
          >
            Write it down…
          </p>
        ) : (
          comments.map((comment) => {
            const isCurrentUser = comment.userId === userId;
            return (
              <div key={comment._id} className="space-y-0.5">
                <div className="flex items-baseline gap-2">
                  <span
                    className={cn(
                      "font-mono text-[10px] tracking-wide uppercase",
                      isCurrentUser ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {getAuthorDisplayName(comment)}
                  </span>
                  <span className="font-mono text-[10px] tabular-nums text-muted-foreground/70">
                    {new Date(comment.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p
                  className="text-[13px] leading-snug text-foreground"
                  style={{ fontFamily: "var(--font-display), serif" }}
                >
                  {comment.text.split(/(@\w+)/).map((part: string, i: number) =>
                    part.startsWith("@") ? (
                      <span
                        key={i}
                        className="font-mono text-[12px] text-primary bg-primary/10 px-0.5"
                      >
                        {part}
                      </span>
                    ) : (
                      part
                    )
                  )}
                </p>
              </div>
            );
          })
        )}
      </div>

      <div className="border-t border-border p-2">
        <div className="relative flex gap-1.5">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            onKeyDown={(e) => {
              if (showMentionSuggestions && mentionSuggestions.length > 0) {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setSelectedMentionIndex((i) =>
                    Math.min(i + 1, mentionSuggestions.length - 1)
                  );
                  return;
                }
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setSelectedMentionIndex((i) => Math.max(i - 1, 0));
                  return;
                }
                if (e.key === "Enter" || e.key === "Tab") {
                  e.preventDefault();
                  insertMention(mentionSuggestions[selectedMentionIndex].name);
                  return;
                }
              }
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSubmit();
              }
              if (e.key === "Escape" && showMentionSuggestions) {
                setShowMentionSuggestions(false);
              }
            }}
            placeholder="Note… (@ to mention)"
            className="min-h-[2.5rem] flex-1 resize-none border border-border bg-background px-2.5 py-1.5 text-[13px] focus:outline-none focus:ring-1 focus:ring-foreground/30"
            rows={2}
            style={{ fontFamily: "var(--font-display), serif" }}
          />
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!text.trim()}
            className="self-end flex h-9 w-9 items-center justify-center border border-border bg-foreground text-background transition-transform duration-150 ease-out active:scale-[0.97] disabled:opacity-40"
            aria-label="Send"
          >
            <Send className="h-3.5 w-3.5" />
          </button>

          {showMentionSuggestions && (
            <div className="absolute bottom-full left-0 right-10 mb-1 border border-border bg-card shadow-md overflow-hidden z-10">
              {mentionSuggestions.length > 0 ? (
                mentionSuggestions.map(
                  (user: { id: string; name: string }, index: number) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => insertMention(user.name)}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent",
                        index === selectedMentionIndex && "bg-accent"
                      )}
                    >
                      <span className="flex h-5 w-5 items-center justify-center border border-border font-mono text-[10px] uppercase">
                        {user.name.charAt(0)}
                      </span>
                      <span className="truncate">{user.name}</span>
                    </button>
                  )
                )
              ) : (
                <div className="px-3 py-3 text-sm text-muted-foreground text-center">
                  No one online
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

interface CommentBubblesLayerProps {
  bubbles: CommentBubbleData[];
  zoom: number;
  pan: Position;
  selectedBubbleId: string | null;
  onBubbleClick: (id: string) => void;
  onBubbleDelete: (id: string) => void;
  onBubblePositionChange: (id: string, position: Position) => void;
  mapId: string;
  projectId: string;
  presenceUsers: { id: string; name: string }[];
  hideResolved?: boolean;
  currentUserId?: string;
  currentUserName?: string;
  bouncingBubbleId?: string | null;
  onThreadBecameNonEmpty?: () => void;
}

export function CommentBubblesLayer({
  bubbles,
  zoom,
  pan,
  selectedBubbleId,
  onBubbleClick,
  onBubbleDelete,
  onBubblePositionChange,
  mapId,
  projectId,
  hideResolved = false,
  currentUserId,
  currentUserName,
  presenceUsers = [],
  bouncingBubbleId = null,
  onThreadBecameNonEmpty,
}: CommentBubblesLayerProps) {
  const { userId } = useAuth();
  const resolveBubbleMutation = useMutation(api.commentBubbles.resolveBubble);

  const handleResolve = async (bubbleId: string, currentResolved: boolean) => {
    try {
      await resolveBubbleMutation({
        bubbleId: bubbleId as Id<"commentBubbles">,
        resolved: !currentResolved,
      });
      toast.success(currentResolved ? "Note reopened" : "Note resolved");
    } catch {
      toast.error("Failed to resolve");
    }
  };

  const isBubbleFiltered = (bubble: CommentBubbleData): boolean => {
    if (hideResolved && bubble.resolved) {
      return true;
    }
    return false;
  };

  const selectedBubble = bubbles.find((b) => b.id === selectedBubbleId);

  return (
    <>
      {bubbles.map((bubble) => (
        <CommentBubble
          key={bubble.id}
          bubble={bubble}
          zoom={zoom}
          pan={pan}
          isSelected={bubble.id === selectedBubbleId}
          isFiltered={isBubbleFiltered(bubble)}
          isBouncing={bubble.id === bouncingBubbleId}
          onClick={() => onBubbleClick(bubble.id)}
          onResolve={() => handleResolve(bubble.id, bubble.resolved)}
          onDelete={() => onBubbleDelete(bubble.id)}
          onDragEnd={(pos) => onBubblePositionChange(bubble.id, pos)}
          onOpenThread={() => onBubbleClick(bubble.id)}
          mapId={mapId}
        />
      ))}

      <AnimatePresence>
        {selectedBubble && (
          <CommentThread
            bubble={selectedBubble}
            anchorPosition={selectedBubble.position}
            zoom={zoom}
            pan={pan}
            onClose={() => onBubbleClick(selectedBubble.id)}
            onResolve={() =>
              handleResolve(selectedBubble.id, selectedBubble.resolved)
            }
            onDelete={() => {
              onBubbleDelete(selectedBubble.id);
              onBubbleClick(selectedBubble.id);
            }}
            mapId={mapId}
            projectId={projectId}
            currentUserId={userId ?? undefined}
            currentUserName={currentUserName}
            presenceUsers={presenceUsers}
            onBecameNonEmpty={onThreadBecameNonEmpty}
          />
        )}
      </AnimatePresence>
    </>
  );
}
