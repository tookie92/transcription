"use client";

import { useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { MessageSquare, UserPlus, FolderPlus, UserCheck, Bell } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";

export function NotificationToastProvider() {
  const { userId } = useAuth();
  
  const unreadNotifications = useQuery(api.notifications.getUserNotifications, {
    limit: 5,
    unreadOnly: true,
  });

  useEffect(() => {
    if (!unreadNotifications || !userId) return;

    const newNotifications = unreadNotifications.filter(notification => 
      Date.now() - notification.createdAt < 10000
    );

    newNotifications.forEach(notification => {
      const getIcon = () => {
        switch (notification.type) {
          case "user_mentioned":
            return <MessageSquare className="h-4 w-4" />;
          case "comment_added":
            return <MessageSquare className="h-4 w-4" />;
          case "group_created":
            return <FolderPlus className="h-4 w-4" />;
          case "invite_accepted":
            return <UserCheck className="h-4 w-4" />;
          default:
            return <Bell className="h-4 w-4" />;
        }
      };

      const getVariant = () => {
        switch (notification.type) {
          case "user_mentioned":
            return "mention";
          case "comment_added":
            return "info";
          case "group_created":
            return "success";
          case "invite_accepted":
            return "success";
          default:
            return "default";
        }
      };

      toast(notification.title, {
        description: notification.message,
        icon: getIcon(),
        id: notification._id,
        duration: 6000,
      });
    });
  }, [unreadNotifications, userId]);

  return null;
}
