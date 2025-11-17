"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

import { useAuth, useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Comment } from "@/types";

interface CommentPanelProps {
  mapId: string;
  groupId: string;
  onClose: () => void;
}

export function CommentPanel({ mapId, groupId, onClose }: CommentPanelProps) {
  const { userId } = useAuth();
  const {user } = useUser();
  const [text, setText] = useState("");

  const comments = useQuery(api.comments.getCommentsByGroup, {
    groupId,
    mapId: mapId as Id<"affinityMaps">,
  });

  const userName = user?.fullName || user?.firstName || user?.emailAddresses[0]?.emailAddress || "You";

  const addComment = useMutation(api.comments.addComment);

  const markAsViewed = useMutation(api.comments.markAsViewed);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    await addComment({
      mapId: mapId as Id<"affinityMaps">,
      groupId,
      text: text.trim(),
      userName
    });
    setText("");
    toast.success("Comment added");
    console.log("🧪 userName envoyé =", userName);

  };

useEffect(() => {
  if (!comments || !userId) return;
  const commentIds = comments.map(c => c._id as Id<"comments">);
  markAsViewed({
    commentIds,
    userId,
  });
}, [comments, userId])


  return (
    <div className="absolute top-0 right-0 w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-30">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">Comments</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto mb-3">
        {comments?.map((comment: Comment) => (
        <div key={comment._id} className="text-sm p-2 bg-gray-50 rounded">
            <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
                <Avatar className="w-6 h-6">
                <AvatarFallback>
                    {(comment.userName || "?").slice(0, 2).toUpperCase()}
                </AvatarFallback>
                </Avatar>
                <span className="font-medium text-gray-700">{comment.userName}</span>
            </div>
            <span className="text-xs text-gray-500">
                {new Date(comment.createdAt).toLocaleString()}
            </span>
            </div>
            <div className="text-gray-800">{comment.text}</div>
        </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a comment..."
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