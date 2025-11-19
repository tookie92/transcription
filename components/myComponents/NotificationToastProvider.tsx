// components/NotificationToastProvider.tsx - NOUVEAU COMPOSANT

"use client";

import { useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@clerk/nextjs";
import { NotificationToast } from "./NotificationToast";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";

export function NotificationToastProvider() {
  const { userId } = useAuth();
  
  // 🎯 SURVEILLER LES NOUVELLES NOTIFICATIONS NON LUES
  const unreadNotifications = useQuery(api.notifications.getUserNotifications, {
    limit: 5,
    unreadOnly: true,
  });

  // 🎯 GÉRER L'AFFICHAGE DES TOASTS
  useEffect(() => {
    if (!unreadNotifications || !userId) return;

    // 🎯 FILTRER LES NOUVELLES NOTIFICATIONS (moins de 10 secondes)
    const newNotifications = unreadNotifications.filter(notification => 
      Date.now() - notification.createdAt < 10000 // 10 secondes
    );

    // 🎯 AFFICHER LES TOASTS
    newNotifications.forEach(notification => {
      toast.custom(
        (t) => (
          <NotificationToast
            notification={{
              _id: notification._id,
              _creationTime: notification._creationTime,
              userId: notification.userId,
              type: notification.type,
              title: notification.title,
              message: notification.message,
              relatedId: notification.relatedId,
              relatedType: notification.relatedType,
              read: notification.read,
              createdAt: notification.createdAt,
              actionUrl: notification.actionUrl,
            }}
            onClose={() => toast.dismiss(t)}
            onClick={() => {
              // TODO: Navigation vers l'élément concerné
              console.log("Navigate to:", notification.actionUrl);
            }}
          />
        ),
        {
          duration: 6000,
        }
      );
    });
  }, [unreadNotifications, userId]);

  return null; // Ce composant ne rend rien visuellement
}