"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, ChevronDown, ChevronUp, Check, Trash2, MoreHorizontal, User } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAuth, useUser } from "@clerk/nextjs";
import type { Position } from "@/types/figjam";

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
  unreadCount: number;
  onClick: () => void;
  onResolve: () => void;
  onDelete: () => void;
  onDragEnd: (newPosition: Position) => void;
  currentUserId?: string;
  mapId?: string;
}

export function CommentBubble({
  bubble,
  zoom,
  pan,
  isSelected,
  unreadCount,
  onClick,
  onResolve,
  onDelete,
  onDragEnd,
  mapId,
}: CommentBubbleProps) {
  const { userId } = useAuth();
  const [isDragging, setIsDragging] = useState(false);
  const [localPos, setLocalPos] = useState<Position | null>(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const comments = useQuery(api.comments.getCommentsByGroup, {
    groupId: bubble.id,
    mapId: (mapId || "") as Id<"affinityMaps">,
  });

  const screenPos = {
    x: (localPos?.x ?? bubble.position.x) * zoom + pan.x,
    y: (localPos?.y ?? bubble.position.y) * zoom + pan.y,
  };

  const totalComments = comments?.length || 0;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setShowContextMenu(false);
      }
    };
    if (showContextMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showContextMenu]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button === 2) return;
    e.stopPropagation();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !dragStartRef.current) return;
    
    const dx = (e.clientX - dragStartRef.current.x) / zoom;
    const dy = (e.clientY - dragStartRef.current.y) / zoom;
    
    setLocalPos({
      x: bubble.position.x + dx,
      y: bubble.position.y + dy,
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    
    const finalPos = localPos ?? bubble.position;
    onDragEnd(finalPos);
    
    setIsDragging(false);
    setLocalPos(null);
    dragStartRef.current = null;
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowContextMenu(true);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowContextMenu(false);
    onDelete();
  };

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      className={`
        absolute transition-all duration-150
        ${isSelected ? "z-50" : "z-40"}
        ${isDragging ? "cursor-grabbing" : "cursor-grab"}
      `}
      style={{
        left: screenPos.x,
        top: screenPos.y,
        transform: `translate(-50%, -50%) scale(${isDragging ? 1.1 : 1})`,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={(e) => {
        if (!isDragging && !showContextMenu) {
          e.stopPropagation();
          onClick();
        }
      }}
      onContextMenu={handleContextMenu}
    >
      <motion.div
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className={`
          relative w-8 h-8 rounded-full flex items-center justify-center shadow-lg
          transition-all duration-150
          ${bubble.resolved 
            ? "bg-green-500 text-white" 
            : "bg-primary text-primary-foreground"
          }
          ${isSelected ? "ring-2 ring-offset-2 ring-primary" : ""}
        `}
      >
        <MessageSquare className="w-4 h-4" />
        
        {totalComments > 0 && !bubble.resolved && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {totalComments > 9 ? "9+" : totalComments}
          </span>
        )}

        {bubble.resolved && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-white text-green-500 rounded-full flex items-center justify-center">
            <Check className="w-3 h-3" />
          </span>
        )}
      </motion.div>

      {showContextMenu && (
        <motion.div
          ref={contextMenuRef}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute left-full top-1/2 -translate-y-1/2 ml-2 w-40 bg-card border border-border rounded-lg shadow-lg overflow-hidden z-50"
        >
          <button
            onClick={handleDelete}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Supprimer
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}

interface CommentBubbleThreadProps {
  bubble: CommentBubbleData;
  anchorRect: DOMRect;
  onClose: () => void;
  onResolve: () => void;
  onDelete: () => void;
  mapId: string;
  projectId: string;
  presenceUsers: { id: string; name: string }[];
  projectMembers?: Array<{ userId: string; name?: string; email?: string }>;
}

export function CommentBubbleThread({
  bubble,
  anchorRect,
  onClose,
  onResolve,
  onDelete,
  mapId,
  projectId,
  presenceUsers,
  projectMembers = [],
}: CommentBubbleThreadProps) {
  const { userId } = useAuth();
  const { user } = useUser();
  const [text, setText] = useState("");
  const [isExpanded, setIsExpanded] = useState(true);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const userName = user?.fullName || user?.firstName || user?.emailAddresses?.[0]?.emailAddress || "You";

  const comments = useQuery(api.comments.getCommentsByGroup, {
    groupId: bubble.id,
    mapId: mapId as Id<"affinityMaps">,
  });

  const addComment = useMutation(api.comments.addComment);
  const markAsViewed = useMutation(api.comments.markAsViewed);

  const allUsers = [
    ...presenceUsers,
    ...(projectMembers || []).map(m => ({ id: m.userId, name: m.name || m.email || "Unknown" })),
  ];
  const uniqueUsers = allUsers.filter((u, i, arr) => arr.findIndex(x => x.id === u.id) === i);

  const filteredUsers = mentionQuery
    ? uniqueUsers.filter(u => u.name.toLowerCase().includes(mentionQuery.toLowerCase()))
    : uniqueUsers.slice(0, 5);

  useEffect(() => {
    if (!comments || !userId) return;
    const commentIds = comments.map((c) => c._id as Id<"comments">);
    markAsViewed({ commentIds, userId });
  }, [comments, userId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setShowContextMenu(false);
      }
    };
    if (showContextMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showContextMenu]);

  const handleTextChange = (value: string) => {
    setText(value);
    const mentionMatch = value.match(/@(\w*)$/);
    if (mentionMatch) {
      setMentionQuery(mentionMatch[1]);
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (userName: string, userId: string) => {
    const newText = text.replace(/@\w*$/, `@${userName} `);
    setText(newText);
    setShowMentions(false);
    setMentionQuery("");
    inputRef.current?.focus();
  };

  const createMentionNotification = useMutation(api.notifications.createMentionNotification);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    
    try {
      await addComment({
        mapId: mapId as Id<"affinityMaps">,
        groupId: bubble.id,
        text: text.trim(),
        userName,
      });

      const mentionedUsers = uniqueUsers.filter(u => text.includes(`@${u.name}`));
      for (const mentionedUser of mentionedUsers) {
        try {
          await createMentionNotification({
            mentionedUserId: mentionedUser.id,
            mentionedByUserId: userId || "",
            mentionedByUserName: userName,
            groupId: bubble.id,
            groupTitle: bubble.targetType === "sticky" ? "sticky" : bubble.targetType === "label" ? "cluster" : "comment",
            projectId,
          });
        } catch (notifError) {
          console.error("Failed to send mention notification:", notifError);
        }
      }
      
      setText("");
    } catch (error) {
      console.error("Failed to add comment:", error);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowContextMenu(true);
  };

  const position = {
    left: Math.min(anchorRect.left, window.innerWidth - 340),
    top: anchorRect.top,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className="fixed z-[100] bg-card rounded-xl shadow-2xl border border-border overflow-hidden w-80"
      style={position}
      onContextMenu={handleContextMenu}
    >
      {/* Header */}
      <div className="p-3 border-b border-border flex items-center justify-between bg-muted/30">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">
            {bubble.targetType === "sticky" ? "Commentaire" : 
             bubble.targetType === "label" ? "Commentaire du groupe" : 
             "Commentaire"}
          </span>
          {bubble.resolved && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
              Résolu
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onResolve}
            className="p-1.5 rounded hover:bg-accent transition-colors"
            title={bubble.resolved ? "Rouvrir" : "Résoudre"}
          >
            <Check className="w-4 h-4 text-muted-foreground" />
          </button>
          <div className="relative" ref={contextMenuRef}>
            <button
              onClick={() => setShowContextMenu(!showContextMenu)}
              className="p-1.5 rounded hover:bg-accent transition-colors"
              title="Plus d'options"
            >
              <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
            </button>
            
            {showContextMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute right-0 top-full mt-1 w-40 bg-card border border-border rounded-lg shadow-lg overflow-hidden z-50"
              >
                <button
                  onClick={() => {
                    onDelete();
                    setShowContextMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Supprimer
                </button>
              </motion.div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-accent transition-colors"
            title="Fermer"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Comments list */}
      <div className="max-h-48 overflow-y-auto">
        {comments?.length === 0 && (
          <div className="p-6 text-center text-muted-foreground text-sm">
            Aucun commentaire. Soyez le premier !
          </div>
        )}
        
        {comments?.map((comment) => (
          <div key={comment._id} className="p-3 border-b border-border last:border-b-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
                {(comment.userName || "?").slice(0, 2).toUpperCase()}
              </div>
              <span className="text-sm font-medium text-foreground">{comment.userName}</span>
              <span className="text-xs text-muted-foreground ml-auto">
                {new Date(comment.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <p className="text-sm text-foreground pl-8">{comment.text}</p>
          </div>
        ))}
      </div>

      {/* Input with @mentions */}
      <div className="p-3 border-t border-border relative">
        {showMentions && filteredUsers.length > 0 && (
          <div className="absolute bottom-full left-0 right-0 mb-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden max-h-40 overflow-y-auto">
            {filteredUsers.map((u) => (
              <button
                key={u.id}
                onClick={() => insertMention(u.name, u.id)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors"
              >
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-foreground">{u.name}</span>
              </button>
            ))}
          </div>
        )}
        
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !showMentions) {
                e.preventDefault();
                handleSubmit();
              }
              if (e.key === "Escape" && showMentions) {
                setShowMentions(false);
              }
            }}
            placeholder="Ajouter un commentaire... (@ pour mentionner)"
            className="flex-1 px-3 py-2 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground"
          />
          <button
            onClick={handleSubmit}
            disabled={!text.trim()}
            className="px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
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
  projectMembers?: Array<{ userId: string; name?: string; email?: string }>;
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
  presenceUsers,
  projectMembers,
}: CommentBubblesLayerProps) {
  const comments = useQuery(api.comments.getCommentsByGroup, {
    groupId: selectedBubbleId || "",
    mapId: mapId as Id<"affinityMaps">,
  });

  const selectedBubble = bubbles.find(b => b.id === selectedBubbleId);
  const selectedBubbleIndex = selectedBubbleId ? bubbles.findIndex(b => b.id === selectedBubbleId) : -1;

  return (
    <>
      {bubbles.map((bubble) => (
        <CommentBubble
          key={bubble.id}
          bubble={bubble}
          zoom={zoom}
          pan={pan}
          isSelected={bubble.id === selectedBubbleId}
          unreadCount={0}
          onClick={() => onBubbleClick(bubble.id)}
          onResolve={() => {}}
          onDelete={() => onBubbleDelete(bubble.id)}
          onDragEnd={(pos) => onBubblePositionChange(bubble.id, pos)}
          mapId={mapId}
        />
      ))}

      <AnimatePresence>
        {selectedBubble && selectedBubbleIndex >= 0 && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[90]"
              onClick={() => onBubbleClick(selectedBubble.id)}
            />
            <CommentBubbleThread
              bubble={selectedBubble}
              anchorRect={new DOMRect(
                selectedBubble.position.x * zoom + pan.x,
                selectedBubble.position.y * zoom + pan.y,
                0,
                0
              )}
              onClose={() => onBubbleClick(selectedBubble.id)}
              onResolve={() => {}}
              onDelete={() => {
                onBubbleDelete(selectedBubble.id);
              }}
              mapId={mapId}
              projectId={projectId}
              presenceUsers={presenceUsers}
              projectMembers={projectMembers}
            />
          </>
        )}
      </AnimatePresence>
    </>
  );
}
