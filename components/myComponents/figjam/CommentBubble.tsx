"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Check, Trash2, X, Send, ChevronLeft } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAuth, useUser } from "@clerk/nextjs";
import type { Position } from "@/types/figjam";
import { toast } from "sonner";

interface CommentBubbleData {
  id: string;
  position: Position;
  targetId?: string;
  targetType?: "sticky" | "label" | "canvas";
  resolved: boolean;
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

export function CommentBubble({
  bubble,
  zoom,
  pan,
  isSelected,
  isFiltered = false,
  isBouncing = false,
  onClick,
  onResolve,
  onDelete,
  onDragEnd,
  onOpenThread,
  mapId,
}: CommentBubbleProps) {
  const { userId } = useAuth();
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

    // Check if there was actual movement (more than 3 pixels threshold)
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

    // Only save position if there was actual movement
    if (hasMovedRef.current) {
      onDragEnd(finalPos);
    }

    setIsDragging(false);
    setLocalPos(null);
    dragStartRef.current = null;
  };

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ 
        scale: isDragging ? 1.1 : 1,
        opacity: 1,
      }}
      transition={{ 
        duration: 0.15,
        ease: "easeOut",
      }}
      exit={{ scale: 0, opacity: 0 }}
      className={`
        absolute
        ${isSelected ? "z-50" : "z-40"}
        ${isDragging ? "cursor-grabbing" : "cursor-grab"}
        ${isFiltered ? "pointer-events-none" : ""}
        ${isBouncing ? "cursor-pointer" : ""}
      `}
      style={{
        left: screenPos.x,
        top: screenPos.y,
        transform: "translate(-50%, -50%)",
        opacity: isFiltered ? 0.25 : 1,
      }}
      onPointerDown={isFiltered ? undefined : handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={(e) => {
        // Only open thread if there was no movement (just a click, not a drag)
        if (!hasMovedRef.current) {
          e.stopPropagation();
          onOpenThread();
        }
        // Reset the moved flag after click
        hasMovedRef.current = false;
      }}
    >
      {/* Ping ring animation - expands outward like radar */}
      {isBouncing && (
        <>
          <motion.div
            className="absolute w-10 h-10 rounded-full bg-primary/30"
            style={{ transform: "translate(-50%, -50%)" }}
            initial={{ scale: 1, opacity: 0.8 }}
            animate={{
              scale: [1, 2],
              opacity: [0.6, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeOut",
            }}
          />
          <motion.div
            className="absolute w-10 h-10 rounded-full bg-primary/20"
            style={{ transform: "translate(-50%, -50%)" }}
            initial={{ scale: 1, opacity: 0.5 }}
            animate={{
              scale: [1, 2.5],
              opacity: [0.5, 0],
            }}
            transition={{
              duration: 1.5,
              delay: 0.5,
              repeat: Infinity,
              ease: "easeOut",
            }}
          />
        </>
      )}

      {/* Main bubble */}
      <motion.div
        whileHover={{ scale: isBouncing ? 1.15 : 1.1 }}
        whileTap={{ scale: 0.95 }}
        animate={isBouncing ? {
          scale: [1, 1.08, 1, 1.08, 1],
        } : {}}
        transition={{ 
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className={`
          relative w-10 h-10 rounded-full flex items-center justify-center shadow-lg
          ${bubble.resolved 
            ? "bg-green-500 text-white" 
            : "bg-primary text-primary-foreground"
          }
          ${isSelected ? "ring-2 ring-offset-2 ring-primary" : ""}
          ${isBouncing ? "ring-2 ring-primary/60" : ""}
        `}
      >
        <MessageSquare className="w-5 h-5" />
        
        {/* Resolved checkmark */}
        {bubble.resolved && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-white text-green-500 rounded-full flex items-center justify-center shadow-sm">
            <Check className="w-3 h-3" />
          </span>
        )}
      </motion.div>
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
}: CommentThreadProps) {
  const { userId } = useAuth();
  const [text, setText] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const comments = useQuery(api.comments.getCommentsByGroup, {
    groupId: bubble.id,
    mapId: (mapId || "") as Id<"affinityMaps">,
  });

  const addComment = useMutation(api.comments.addComment);
  const createMentionNotification = useMutation(api.notifications.createMentionNotification);

  const parseMentions = (text: string): string[] => {
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
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
      
      // Handle @mentions - create notifications
      const mentions = parseMentions(text);
      for (const mentionedName of mentions) {
        // Find user ID from presenceUsers
        const mentionedUser = presenceUsers.find(u => 
          u.name.toLowerCase().startsWith(mentionedName.toLowerCase())
        );
        
        if (mentionedUser && projectId) {
          try {
            await createMentionNotification({
              mentionedUserId: mentionedUser.id,
              mentionedByUserId: userId,
              mentionedByUserName: currentUserName || "Someone",
              groupId: bubble.id,
              groupTitle: "Comment",
              projectId: projectId,
            });
          } catch (e) {
            console.error("Failed to create mention notification:", e);
          }
        }
      }
      
      setText("");
      toast.success("Commentaire ajouté");
    } catch (err) {
      toast.error("Erreur lors de l'ajout du commentaire");
    }
  };

  const getAuthorDisplayName = (comment: any): string => {
    if (comment.userId === userId) return "Vous";
    return comment.userName || "Anonyme";
  };

  const [mentionSearch, setMentionSearch] = useState("");
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);

  // Get @mention suggestions - smart filtering
  const mentionSuggestions = presenceUsers.filter((u: { id: string; name: string }) => {
    if (u.id === userId) return false;
    if (!mentionSearch) return true;
    const search = mentionSearch.toLowerCase();
    // Match any word starting with the search
    const words = u.name.toLowerCase().split(" ");
    return words.some(word => word.startsWith(search));
  }).slice(0, 5);

  const insertMention = (name: string) => {
    const mentionText = `@${name.split(" ")[0]} `;
    const lastAtIndex = text.lastIndexOf("@");
    if (lastAtIndex !== -1) {
      const newText = text.substring(0, lastAtIndex) + mentionText + text.substring(lastAtIndex + mentionSearch.length + 1);
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
    
    // Find @mention pattern - look for @ followed by characters until space
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

  const screenPos = {
    x: anchorPosition.x * zoom + pan.x,
    y: anchorPosition.y * zoom + pan.y,
  };

  // Position thread to the right of bubble
  const threadX = Math.min(screenPos.x + 60, window.innerWidth - 380);
  const threadY = Math.max(screenPos.y - 150, 80);

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[95]"
        onClick={onClose}
      />
      
      {/* Thread panel */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, x: 20 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        exit={{ opacity: 0, scale: 0.95, x: 20 }}
        className="fixed z-[100] w-80 bg-card rounded-xl shadow-2xl border border-border overflow-hidden"
        style={{
          left: threadX,
          top: threadY,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Commentaire</span>
            {bubble.resolved && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                Résolu
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {/* Resolve button */}
            <button
              onClick={onResolve}
              className={`p-1.5 rounded-lg transition-colors ${
                bubble.resolved
                  ? "bg-green-100 text-green-600 hover:bg-green-200"
                  : "hover:bg-accent text-muted-foreground hover:text-foreground"
              }`}
              title={bubble.resolved ? "Rouvrir" : "Résoudre"}
            >
              <Check className="w-4 h-4" />
            </button>
            {/* Delete button */}
            <button
              onClick={onDelete}
              className="p-1.5 rounded-lg hover:bg-red-100 text-muted-foreground hover:text-red-600 transition-colors"
              title="Supprimer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            {/* Close button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Comments list */}
        <div className="max-h-64 overflow-y-auto p-3 space-y-3">
          {(!comments || comments.length === 0) ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Pas encore de commentaire. Soyez le premier !
            </p>
          ) : (
            comments.map((comment: any) => {
              const isCurrentUser = comment.userId === userId;
              return (
                <div key={comment._id} className={`space-y-1 ${isCurrentUser ? "bg-primary/5 -mx-2 px-2 py-1 rounded-lg" : ""}`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                      isCurrentUser ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                    }`}>
                      {getAuthorDisplayName(comment).charAt(0).toUpperCase()}
                    </div>
                    <span className={`text-xs font-medium ${isCurrentUser ? "text-primary" : ""}`}>
                      {getAuthorDisplayName(comment)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(comment._creationTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm pl-8">
                    {comment.text.split(/(@\w+)/).map((part: string, i: number) => 
                      part.startsWith("@") ? (
                        <span key={i} className="text-primary font-medium bg-primary/10 px-1 rounded">{part}</span>
                      ) : part
                    )}
                  </p>
                </div>
              );
            })
          )}
        </div>

        {/* Input */}
        <div className="p-3 border-t border-border bg-muted/20">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => handleTextChange(e.target.value)}
                onKeyDown={(e) => {
                  if (showMentionSuggestions && mentionSuggestions.length > 0) {
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setSelectedMentionIndex(i => Math.min(i + 1, mentionSuggestions.length - 1));
                      return;
                    }
                    if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setSelectedMentionIndex(i => Math.max(i - 1, 0));
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
                    handleSubmit();
                  }
                  if (e.key === "Escape" && showMentionSuggestions) {
                    setShowMentionSuggestions(false);
                  }
                }}
                placeholder="Ajouter un commentaire... (@ pour mentionner)"
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                rows={2}
              />
              
              {/* @mention suggestions dropdown */}
              {showMentionSuggestions && (
                <div className="absolute bottom-full left-0 right-0 mb-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden z-10">
                  {mentionSuggestions.length > 0 ? (
                    <>
                      <div className="px-2 py-1 text-[10px] text-muted-foreground bg-muted/50 border-b border-border">
                        {mentionSearch ? `Résultats pour "${mentionSearch}"` : "Tous les utilisateurs"}
                      </div>
                      {mentionSuggestions.map((user: { id: string; name: string }, index: number) => (
                        <button
                          key={user.id}
                          onClick={() => insertMention(user.name)}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors ${
                            index === selectedMentionIndex ? "bg-primary/10" : ""
                          }`}
                        >
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <span>{user.name}</span>
                        </button>
                      ))}
                    </>
                  ) : (
                    <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-base">👤</span>
                        <span>
                          {mentionSearch 
                            ? `Aucun utilisateur pour "${mentionSearch}"` 
                            : "Aucun autre utilisateur en ligne"}
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="px-2 py-1 text-[10px] text-muted-foreground bg-muted/50 border-t border-border flex justify-center gap-2">
                    <span>↑↓ naviguer</span>
                    <span>•</span>
                    <span>Entrée sélectionner</span>
                    <span>•</span>
                    <span>Esc fermer</span>
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={handleSubmit}
              disabled={!text.trim()}
              className="px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors self-end"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </>
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
}: CommentBubblesLayerProps) {
  const { userId } = useAuth();
  const resolveBubbleMutation = useMutation(api.commentBubbles.resolveBubble);

  const handleResolve = async (bubbleId: string, currentResolved: boolean) => {
    try {
      await resolveBubbleMutation({ 
        bubbleId: bubbleId as Id<"commentBubbles">,
        resolved: !currentResolved 
      });
      toast.success(currentResolved ? "Commentaire rouvert" : "Commentaire marqué comme résolu");
    } catch (err) {
      toast.error("Erreur lors de la résolution");
    }
  };

  const isBubbleFiltered = (bubble: CommentBubbleData): boolean => {
    if (hideResolved && bubble.resolved) {
      return true;
    }
    return false;
  };

  const selectedBubble = bubbles.find(b => b.id === selectedBubbleId);

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

      {/* Comment Thread */}
      <AnimatePresence>
        {selectedBubble && (
          <CommentThread
            bubble={selectedBubble}
            anchorPosition={selectedBubble.position}
            zoom={zoom}
            pan={pan}
            onClose={() => onBubbleClick(selectedBubble.id)}
            onResolve={() => handleResolve(selectedBubble.id, selectedBubble.resolved)}
            onDelete={() => {
              onBubbleDelete(selectedBubble.id);
              onBubbleClick(selectedBubble.id);
            }}
            mapId={mapId}
            projectId={projectId}
            currentUserId={userId ?? undefined}
            currentUserName={currentUserName}
            presenceUsers={presenceUsers}
          />
        )}
      </AnimatePresence>
    </>
  );
}
