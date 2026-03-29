"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";

export interface ActivityNotification {
  id: string;
  type: "create" | "update" | "delete" | "comment" | "mention";
  message: string;
  timestamp: number;
  isRead: boolean;
}

interface UseActivityNotificationsOptions {
  mapId: Id<"affinityMaps">;
  pollInterval?: number;
  maxNotifications?: number;
  onMention?: (userName: string) => void;
}

interface UseActivityNotificationsReturn {
  notifications: ActivityNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  lastActivityTime: number | null;
}

export function useActivityNotifications({
  mapId,
  pollInterval = 5000,
  maxNotifications = 50,
  onMention,
}: UseActivityNotificationsOptions): UseActivityNotificationsReturn {
  const [notifications, setNotifications] = useState<ActivityNotification[]>([]);
  const [lastActivityTime, setLastActivityTime] = useState<number | null>(null);
  const previousActivityCountRef = useRef(0);
  const previousIdsRef = useRef<Set<string>>(new Set());

  const activities = useQuery(api.activityLog.getActivityForMap, { 
    mapId, 
    limit: maxNotifications 
  });

  useEffect(() => {
    if (!activities || activities.length === 0) return;

    // Initialize previous IDs on first load
    if (previousIdsRef.current.size === 0) {
      activities.forEach(a => previousIdsRef.current.add(a._id));
      return;
    }

    // Find NEW activities (not in previous IDs)
    const newActivities = activities.filter(a => !previousIdsRef.current.has(a._id));
    
    // Update previous IDs
    activities.forEach(a => previousIdsRef.current.add(a._id));

    if (newActivities.length > 0) {
      const newNotifications: ActivityNotification[] = newActivities
        .map(activity => {
          let type: ActivityNotification["type"] = "update";
          let message = "";

          const action = activity.action as string;
          if (action.includes("created")) {
            type = "create";
            message = `${activity.userName || "Someone"} added ${activity.targetName}`;
          } else if (action.includes("deleted")) {
            type = "delete";
            message = `${activity.userName || "Someone"} deleted ${activity.targetName}`;
          } else if (action === "comment_added") {
            type = "comment";
            message = `${activity.userName || "Someone"} commented on ${activity.targetName}`;
          } else if (action === "user_mentioned") {
            type = "mention";
            message = `${activity.userName || "Someone"} mentioned you`;
            // Show toast for mention
            toast.info(`${activity.userName || "Someone"} vous a mentionné`, {
              description: activity.targetName || "dans un commentaire",
              duration: 5000,
            });
            onMention?.(activity.userName || "Someone");
          } else {
            type = "update";
            message = `${activity.userName || "Someone"} updated ${activity.targetName}`;
          }

          return {
            id: activity._id,
            type,
            message,
            timestamp: activity.timestamp,
            isRead: false,
          };
        });

      if (newNotifications.length > 0) {
        setNotifications(prev => {
          const updated = [...newNotifications, ...prev];
          return updated.slice(0, maxNotifications);
        });
        setLastActivityTime(Date.now());
      }
    }
  }, [activities, maxNotifications, onMention]);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, isRead: true } : n)
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    notifications,
    unreadCount: notifications.filter(n => !n.isRead).length,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    lastActivityTime,
  };
}

export function useNotificationBadge(
  count: number,
  options: { max?: number; animate?: boolean } = {}
) {
  const { max = 99, animate = true } = options;
  
  if (count === 0) return null;
  
  const displayCount = count > max ? `${max}+` : count.toString();
  
  return {
    count: displayCount,
    shouldAnimate: animate && count > 0,
    isOverflow: count > max,
  };
}
