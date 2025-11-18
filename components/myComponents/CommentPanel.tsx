"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth, useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Command, CommandInput, CommandList, CommandItem, CommandGroup } from "@/components/ui/command";

interface CommentPanelProps {
  mapId: string;
  groupId: string;
  onClose: () => void;
  screenRect: DOMRect; // position écran réelle du groupe
}

export function CommentPanel({ mapId, groupId, onClose, screenRect }: CommentPanelProps) {
  const { userId } = useAuth();
  const { user } = useUser();
  const [text, setText] = useState("");

  const comments = useQuery(api.comments.getCommentsByGroup, {
    groupId,
    mapId: mapId as Id<"affinityMaps">,
  });

  const userName =
    user?.fullName || user?.firstName || user?.emailAddresses?.[0]?.emailAddress || "You";

  const addComment = useMutation(api.comments.addComment);
  const markAsViewed = useMutation(api.comments.markAsViewed);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    await addComment({
      mapId: mapId as Id<"affinityMaps">,
      groupId,
      text: text.trim(),
      userName,
    });
    setText("");
    toast.success("Comment added");
  };

  useEffect(() => {
    if (!comments || !userId) return;
    const commentIds = comments.map((c) => c._id as Id<"comments">);
    markAsViewed({ commentIds, userId });
  }, [comments, userId]);

  return (
    <div
      className="fixed z-50 bg-white rounded-lg shadow-xl border p-3 w-80"
      style={{
        left: Math.min(screenRect.right + 8, window.innerWidth - 340),
        top: screenRect.top,
      }}
    >
      {/* En-tête */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold">Comments</span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      {/* Liste des commentaires via Command */}
      <Command className="border-0 shadow-none">
        {/* 🔒 1. Input toujours visible
        <div className="sticky top-0 bg-white z-10 pb-2">
          <CommandInput
            placeholder="Add a comment…"
            value={text}
            onValueChange={setText}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
        </div> */}
    <CommandList className="max-h-44 overflow-y-auto">
        <CommandGroup>
            {comments?.map((comment) => (
               <CommandItem
                  key={comment._id}
                  className="flex flex-col items-start gap-1 px-2 py-2"
                >
                <div className="flex items-center gap-2">
                  <Avatar className="w-6 h-6">
                    <AvatarFallback>
                      {(comment.userName || "?").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-xs text-gray-700">{comment.userName}</span>
                  <span className="text-xs text-gray-500 ml-auto">
                    {new Date(comment.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-gray-800 pl-8">{comment.text}</p>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>

      {/* Pied / saisie */}
      <div className="flex gap-2 mt-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a comment…"
          className="flex-1 px-3 py-2 border rounded text-sm"
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />
        <button
          onClick={handleSubmit}
          className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}