"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth, useUser } from "@clerk/nextjs";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Command, CommandInput, CommandList, CommandItem, CommandGroup } from "@/components/ui/command";
import { MentionUser, useMentions } from "@/hooks/useMentions";

interface CommentPanelProps {
  mapId: string;
  groupId: string;
  onClose: () => void;
  screenRect: DOMRect;
  presenceUsers: MentionUser[];
  groupTitle: string;
  projectId: string;
}

export function CommentPanel({ mapId, groupId, onClose, screenRect, presenceUsers, groupTitle, projectId }: CommentPanelProps) {
  const { userId } = useAuth();
  const { user } = useUser();
  const [text, setText] = useState("");

  const comments = useQuery(api.comments.getCommentsByGroup, {
    groupId,
    mapId: mapId as Id<"affinityMaps">,
  });

  const createMentionNotification = useMutation(api.notifications.createMentionNotification);

  const userName =
    user?.fullName || user?.firstName || user?.emailAddresses?.[0]?.emailAddress || "You";

  const addComment = useMutation(api.comments.addComment);
  const markAsViewed = useMutation(api.comments.markAsViewed);

  const { query, setQuery, suggestions, reset } = useMentions(presenceUsers);

  /* -------- @mention logic -------- */
const handleInput = (val: string) => {
  console.log("📨 handleInput", val); // ← ajoute ça
  setText(val);
  const match = val.match(/@([\p{L}\p{N}_]*)$/u);
  setQuery(match ? match[1] : "");
};

  const insertMention = (user: MentionUser) => {
    const newText = text.replace(/@\w*$/, `@${user.name} `);
    setText(newText);
    reset();
  };


   // 🆕 FONCTION POUR DÉTECTER ET TRAITER LES MENTIONS
const handleMentions = useCallback(async (commentText: string, userName: string) => {
  if (!presenceUsers.length) return;

  console.log("🔍 Checking mentions in:", commentText);
  console.log("👥 Available users:", presenceUsers);

  const mentionRegex = /@([\p{L}\p{N}_]+)/gu;
  const mentions = Array.from(commentText.matchAll(mentionRegex));
  
  if (mentions.length === 0) return;

  for (const mention of mentions) {
    const mentionedName = mention[1].toLowerCase();
    console.log(`🔍 Looking for user: ${mentionedName}`);
    
    // 🆕 MEILLEURE DÉTECTION - PLUS TOLÉRANTE
    const mentionedUser = presenceUsers.find(user => {
      const userNameLower = user.name.toLowerCase();
      return (
        userNameLower === mentionedName ||
        userNameLower.includes(mentionedName) ||
        mentionedName.includes(userNameLower) ||
        // 🆕 DÉTECTION PAR INITIALES OU PRÉNOM
        userNameLower.split(' ').some(part => part.startsWith(mentionedName)) ||
        mentionedName.split(' ').some(part => userNameLower.includes(part))
      );
    });

    console.log(`🎯 Found user:`, mentionedUser);

    if (mentionedUser && mentionedUser.id !== userId) {
      try {
        console.log(`📨 Sending mention notification to ${mentionedUser.name}`);
        
        await createMentionNotification({
          mentionedUserId: mentionedUser.id,
          mentionedByUserId: userId!,
          mentionedByUserName: userName,
          groupId,
          groupTitle: groupTitle,
          projectId: projectId,
        });
        
        toast.success(`Mention envoyée à ${mentionedUser.name}`);
      } catch (error) {
        console.error("❌ Failed to send mention notification:", error);
        toast.error("Erreur lors de l'envoi de la mention");
      }
    } else if (!mentionedUser) {
      console.warn(`❌ User "${mentionedName}" not found in presence users`);
      toast.info(`Utilisateur "${mentionedName}" non trouvé ou non connecté`);
    }
  }
}, [presenceUsers, userId, groupId, groupTitle, projectId, createMentionNotification]);


  /* -------- submit -------- */
 const handleSubmit = async () => {
    if (!text.trim()) return;
    
    try {
      // Ajouter le commentaire (existant)
      await addComment({
        mapId: mapId as Id<"affinityMaps">,
        groupId,
        text: text.trim(),
        userName,
      });

      // 🆕 TRAITER LES MENTIONS APRÈS L'AJOUT DU COMMENTAIRE
      await handleMentions(text.trim(), userName);

      setText("");
      reset();
      toast.success("Commentaire ajouté");
      
    } catch (error) {
      console.error("Erreur lors de l'ajout du commentaire:", error);
      toast.error("Erreur lors de l'ajout du commentaire");
    }
  };

 


  useEffect(() => {
    if (!comments || !userId) return;
    const commentIds = comments.map((c) => c._id as Id<"comments">);
    markAsViewed({ commentIds, userId });
     console.log("🔍 presenceUsers", presenceUsers);
  }, [comments, userId]);


// console.log({ query, suggestions });


console.log("👥 Presence users available for mentions:", presenceUsers);
  /* -------- render -------- */
  return (
    <div
      className="fixed z-50 bg-white rounded-lg shadow-xl border p-3 w-80"
      style={{
        left: Math.min(screenRect.right + 8, window.innerWidth - 340),
        top: screenRect.top,
      }}
    >
    {/* Menu flottant des @mentions */}
    {suggestions.length > 0 && (
      <div className="absolute top-12 left-3 right-3 bg-white border rounded-md shadow-md z-20">
        {suggestions.map((u) => (
          <button
            key={u.id}
            onClick={() => insertMention(u)}
            className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
          >
            {u.name}
          </button>
        ))}
      </div>
    )}

      {/* header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold">Comments</span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      {/* messages scrollables */}
      <Command className="border-0 shadow-none">
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

      {/* pied : CommandInput à la place de <input> natif */}
      {/* Pied / saisie – CommandInput définitif */}
<div className="flex gap-2 mt-2">
  <Command className="flex-1 border-0 shadow-none">
    <CommandInput
      value={text}
      onValueChange={(val) => handleInput(val)} // ← fonction simple, pas de log
      placeholder="Type a comment…"
      onKeyDown={(e) => e.key === "Enter" && !query && handleSubmit()}
    />
  </Command>
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