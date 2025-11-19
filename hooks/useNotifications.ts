// hooks/useNotifications.ts - NOUVEAU FICHIER

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useCallback } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { Notification, UseNotificationsReturn } from "@/types";

export function useNotifications(): UseNotificationsReturn {
  // 🎯 QUERIES
  const notificationsData = useQuery(api.notifications.getUserNotifications, {
    limit: 50,
    unreadOnly: false, // 🆕 GARDER TOUTES LES NOTIFS POUR L'HISTORIQUE
  });

  const unreadCountData = useQuery(api.notifications.getUnreadCount);

  // 🎯 MUTATIONS
  const markAsReadMutation = useMutation(api.notifications.markAsRead);
  const markAllAsReadMutation = useMutation(api.notifications.markAllAsRead);

  // 🎯 STATE LOCAL
  const [isLoading, setIsLoading] = useState(false);

  // 🎯 FONCTIONS
const markAsRead = useCallback(async (notificationId: Id<"notifications">) => {
    try {
      setIsLoading(true);
      await markAsReadMutation({ notificationId });
      // 🆕 PAS BESOIN DE REFRESH MANUEL - CONVEX GÈRE AUTOMATIQUEMENT
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    } finally {
      setIsLoading(false);
    }
  }, [markAsReadMutation])

  const markAllAsRead = useCallback(async () => {
    try {
      setIsLoading(true);
      await markAllAsReadMutation();
      // 🆕 CONVEX METTRA À JOUR AUTOMATIQUEMENT LES QUERIES
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    } finally {
      setIsLoading(false);
    }
  }, [markAllAsReadMutation]);

  const refresh = useCallback(() => {
    // Les queries Convex se rafraîchissent automatiquement
    // Cette fonction est pour la compatibilité avec l'interface
  }, []);

  // 🎯 TRANSFORMATION DES DONNÉES
  const notifications: Notification[] = (notificationsData || []).map(notif => ({
    _id: notif._id,
    _creationTime: notif._creationTime,
    userId: notif.userId,
    type: notif.type,
    title: notif.title,
    message: notif.message,
    relatedId: notif.relatedId,
    relatedType: notif.relatedType,
    read: notif.read,
    createdAt: notif.createdAt,
    actionUrl: notif.actionUrl,
  }));

  const unreadCount = unreadCountData || 0;

  return {
    notifications: notificationsData || [], // 🆕 TOUTES les notifications
    unreadCount: unreadCountData || 0, 
    markAsRead,
    markAllAsRead,
    isLoading,
    refresh:()=>{},
  };
}


