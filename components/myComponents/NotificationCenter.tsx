// components/NotificationCenter.tsx - NOUVEAU COMPOSANT

"use client";

import { useNotifications } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  Bell, 
  CheckCircle2, 
  Trash2, 
  Users, 
  Move, 
  Edit, 
  MessageSquare, 
  Plus, 
  Lightbulb,
  AtSign
} from "lucide-react";
import { NotificationCenterProps } from "@/types";
import { Id } from "@/convex/_generated/dataModel";
import { useEffect } from "react";

export function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    isLoading 
  } = useNotifications();

  // 🎯 ICÔNES PAR TYPE DE NOTIFICATION
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "group_created": 
        return <Plus size={16} className="text-green-500" />;
      case "group_moved": 
        return <Move size={16} className="text-blue-500" />;
      case "group_renamed": 
        return <Edit size={16} className="text-orange-500" />;
      case "group_deleted": 
        return <Trash2 size={16} className="text-red-500" />;
      case "insight_added": 
      case "insight_moved": 
      case "insight_removed": 
        return <Lightbulb size={16} className="text-purple-500" />;
      case "comment_added": 
        return <MessageSquare size={16} className="text-indigo-500" />;
      case "user_mentioned": 
        return <AtSign size={16} className="text-pink-500" />;
      case "invite_accepted": 
      case "invite_received":
        return <Users size={16} className="text-teal-500" />;
      default: 
        return <Bell size={16} className="text-gray-500" />;
    }
  };

  // 🎯 GESTIONNAIRE DE CLIC SUR NOTIFICATION
//   const handleNotificationClick = (notificationId: Id<"notifications">, read: boolean) => {
//     if (!read) {
//       markAsRead(notificationId);
//     }
//     // TODO: Navigation vers l'élément concerné
//     onClose();
//   };

    // 🆕 DEBUG
  useEffect(() => {
    if (isOpen) {
      console.log("📋 NotificationCenter opened - State:", {
        totalNotifications: notifications.length,
        unreadCount: unreadCount,
        unreadNotifications: notifications.filter(n => !n.read).length
      });
    }
  }, [isOpen, notifications, unreadCount]);

   const handleNotificationClick = (notificationId: Id<"notifications">, read: boolean, event: React.MouseEvent) => {
    // 🆕 EMPÊCHER LA PROPAGATION POUR ÉVITER LA FERMETURE
    event.stopPropagation();
    event.preventDefault();
    
    console.log("🖱️ Notification clicked:", { notificationId, currentlyRead: read });
    
    if (!read) {
      markAsRead(notificationId);
    }
    
    // 🆕 NE PAS FERMER IMMÉDIATEMENT - LAISSER L'UTILISATEUR INTERAGIR
    // onClose(); // ❌ RETIRER CETTE LIGNE
  };


    const handleMarkAsReadClick = (notificationId: Id<"notifications">, event: React.MouseEvent) => {
    // 🆕 EMPÊCHER LA PROPAGATION
    event.stopPropagation();
    event.preventDefault();
    
    console.log("✅ Mark as read clicked:", notificationId);
    markAsRead(notificationId);
  };

   const handleMarkAllAsReadClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    
    console.log("✅ Mark ALL as read clicked");
    markAllAsRead();
  };
  if (!isOpen) return null;

return (
    <div 
      className="w-80 bg-card rounded-lg shadow-xl border border-border max-h-96 overflow-hidden flex flex-col"
      onClick={(e) => e.stopPropagation()}
    >
      {/* HEADER */}
      <div className="p-4 border-b border-border bg-muted">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell size={20} className="text-foreground" />
            <h3 className="font-semibold text-foreground">Notifications</h3>
            {unreadCount > 0 && (
              <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                {unreadCount} non lu{unreadCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
          
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsReadClick}
              disabled={isLoading}
              className="text-sm text-primary hover:text-primary/80 disabled:opacity-50"
            >
              Tout marquer comme lu
            </button>
          )}
        </div>
      </div>

      {/* LISTE DES NOTIFICATIONS */}
      <div className="flex-1 overflow-y-auto">
        {!isLoading && notifications.length > 0 && (
          <div className="divide-y divide-gray-100">
            {notifications.map((notification) => (
              <div
                key={notification._id}
                className={`
                  p-4 cursor-pointer transition-colors relative
                  ${notification.read 
                    ? 'bg-white hover:bg-accent' 
                    : 'bg-blue-50 hover:bg-blue-100 border-l-4 border-l-blue-500'
                  }
                `}
                onClick={(e) => handleNotificationClick(notification._id, notification.read, e)} // 🆕 PASSER L'EVENT
              >
                <div className="flex gap-3">
                  {/* ICÔNE */}
                  <div className="flex-shrink-0 mt-0.5">
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  {/* CONTENU */}
                  <div className="flex-1 min-w-0">
                    <h4 className={`font-medium text-sm ${
                      notification.read ? 'text-gray-900' : 'text-gray-900 font-semibold'
                    }`}>
                      {notification.title}
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      {formatDistanceToNow(notification.createdAt, { 
                        addSuffix: true,
                        locale: fr 
                      })}
                    </p>
                  </div>

                  {/* INDICATEUR NON LU */}
                  {!notification.read && (
                    <div className="flex-shrink-0">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    </div>
                  )}
                </div>

                {/* 🎯 BOUTON MARQUER COMME LU - CORRIGÉ */}
                {!notification.read && (
                  <button
                    onClick={(e) => handleMarkAsReadClick(notification._id, e)} // 🆕 UTILISER LE NOUVEAU HANDLER
                    className="absolute top-2 right-2 p-1 text-gray-400 hover:text-green-500 transition-colors"
                    title="Marquer comme lu"
                  >
                    <CheckCircle2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FOOTER */}
      {notifications.length > 0 && (
        <div className="p-3 border-t border-gray-200 bg-accent">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="w-full text-center text-sm text-gray-600 hover:text-gray-800 py-2"
          >
            Fermer
          </button>
        </div>
      )}
    </div>
  );
}