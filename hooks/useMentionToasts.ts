"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { useAuth } from "@clerk/nextjs";

interface MentionToastOptions {
  setBouncingBubbleId?: (id: string | null) => void;
}

export function useMentionToasts({ setBouncingBubbleId }: MentionToastOptions = {}) {
  const { userId } = useAuth();
  const [lastNotificationId, setLastNotificationId] = useState<string | null>(null);
  const [bouncingBubbleIds, setBouncingBubbleIds] = useState<Set<string>>(new Set());
  
  const notifications = useQuery(api.notifications.getUserNotifications, {
    limit: 20,
  });

  useEffect(() => {
    if (!notifications || notifications.length === 0) return;
    
    const latestNotification = notifications[0];
    
    // First time - just remember the latest
    if (!lastNotificationId) {
      setLastNotificationId(latestNotification._id);
      return;
    }
    
    // Check if there's a NEW notification
    if (latestNotification._id !== lastNotificationId) {
      // Found new notification!
      setLastNotificationId(latestNotification._id);
      
      // Show toast for mention notification
      if (latestNotification.type === "user_mentioned" && latestNotification.userId === userId) {
        // Extract bubble ID from relatedId
        const bubbleId = latestNotification.relatedId || "";
        
        // Make bubble pulse with attention effect
        if (bubbleId && setBouncingBubbleId) {
          setBouncingBubbleId(bubbleId);
        }
        
        // Add to bouncing set
        if (bubbleId) {
          setBouncingBubbleIds(prev => new Set(prev).add(bubbleId));
        }
        
        // Simple toast - user can open manually when ready
        toast.info(`${latestNotification.message || "Vous avez été mentionné"}`, {
          description: "Cliquez sur la bulle pour voir le commentaire quand vous voulez",
          duration: 4000,
          icon: "💬",
        });
      }
    }
  }, [notifications, lastNotificationId, userId, setBouncingBubbleId]);
  
  // Keep bouncing until thread is opened
  const clearBounce = (bubbleId: string) => {
    setBouncingBubbleIds(prev => {
      const next = new Set(prev);
      next.delete(bubbleId);
      return next;
    });
    if (bouncingBubbleIds.size <= 1) {
      setBouncingBubbleId?.(null);
    }
  };
  
  return { bouncingBubbleIds, clearBounce };
}

interface MentionToastProps {
  setBouncingBubbleId?: (id: string | null) => void;
}

export function MentionToastProvider({ setBouncingBubbleId }: MentionToastProps) {
  useMentionToasts({ setBouncingBubbleId });
  return null;
}
