// components/NotificationToast.tsx - NOUVEAU COMPOSANT

"use client";

import { useEffect } from "react";
import { X, ExternalLink } from "lucide-react";
import { NotificationToastProps } from "@/types";
import { useNotifications } from "@/hooks/useNotifications";

export function NotificationToast({ 
  notification, 
  onClose, 
  onClick 
}: NotificationToastProps) {
  const { markAsRead } = useNotifications();

  // 🎯 AUTO-FERMETURE APRÈS 6 SECONDES
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 6000);

    return () => clearTimeout(timer);
  }, [onClose]);

  // 🎯 GESTIONNAIRE DE CLIC
  const handleClick = () => {
    if (!notification.read) {
      markAsRead(notification._id);
    }
    onClick?.();
    onClose();
  };

  // 🎯 COULEUR PAR TYPE
  const getToastColor = (type: string) => {
    switch (type) {
      case "user_mentioned":
        return "bg-gradient-to-r from-pink-500 to-rose-500";
      case "comment_added":
        return "bg-gradient-to-r from-indigo-500 to-purple-500";
      case "group_created":
        return "bg-gradient-to-r from-green-500 to-emerald-500";
      case "invite_accepted":
        return "bg-gradient-to-r from-teal-500 to-cyan-500";
      default:
        return "bg-gradient-to-r from-blue-500 to-sky-500";
    }
  };

  return (
    <div className={`
      relative w-80 rounded-lg shadow-lg text-white overflow-hidden
      animate-in slide-in-from-right-8 duration-300
      ${getToastColor(notification.type)}
    `}>
      {/* 🎯 CONTENU PRINCIPAL */}
      <div 
        className="p-4 cursor-pointer hover:opacity-90 transition-opacity"
        onClick={handleClick}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm mb-1">
              {notification.title}
            </h4>
            <p className="text-sm opacity-90 leading-tight">
              {notification.message}
            </p>
          </div>
          
          <ExternalLink size={16} className="flex-shrink-0 mt-1 ml-2 opacity-70" />
        </div>
      </div>

      {/* 🎯 BARRE DE PROGRÈS */}
      <div className="h-1 bg-white/30">
        <div 
          className="h-full bg-white/70 transition-all duration-6000 ease-linear"
          style={{ width: '100%' }}
        />
      </div>

      {/* 🎯 BOUTON FERMETURE */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute top-2 right-2 p-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
}