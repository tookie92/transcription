// components/NotificationBell.tsx - NOUVEAU COMPOSANT

"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, BellRing } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { NotificationCenter } from "./NotificationCenter"
import { NotificationBellProps } from "@/types";

// export function NotificationBell({ className = "" }: NotificationBellProps) {
//   const [isOpen, setIsOpen] = useState(false);
//   const bellRef = useRef<HTMLButtonElement>(null);

//   const { notifications, unreadCount } = useNotifications();
  
 

//   // 🎯 FERMETURE QUAND ON CLIC DEHORS
//   useEffect(() => {
//     const handleClickOutside = (event: MouseEvent) => {
//       if (bellRef.current && !bellRef.current.contains(event.target as Node)) {
//         setIsOpen(false);
//       }
//     };

//     document.addEventListener("mousedown", handleClickOutside);
//     return () => document.removeEventListener("mousedown", handleClickOutside);
//   }, []);

//   const toggleNotifications = () => {
//     setIsOpen(!isOpen);
//   };

//     // 🆕 DEBUG
//   useEffect(() => {
//     console.log("🔔 NotificationBell - State:", {
//       totalNotifications: notifications.length,
//       unreadCount: unreadCount,
//       notifications: notifications.map(n => ({
//         id: n._id,
//         type: n.type,
//         title: n.title,
//         read: n.read,
//         createdAt: new Date(n.createdAt).toLocaleTimeString(),
//       }))
//     });
//   }, [notifications, unreadCount]);

//   return (
//     <div className={`relative ${className}`}>
//       {/* 🎯 BOUTON CLOCHE */}
//       <button
//         ref={bellRef}
//         onClick={toggleNotifications}
//         className={`
//           relative p-2 rounded-lg border transition-all duration-200
//           ${isOpen 
//             ? 'bg-blue-100 border-blue-300 text-blue-700' 
//             : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
//           }
//         `}
//         aria-label="Notifications"
//       >
//         {unreadCount > 0 ? (
//           <BellRing size={20} className="text-orange-500" />
//         ) : (
//           <Bell size={20} />
//         )}
        
//         {/* 🎯 BADGE NON LU */}
//         {unreadCount > 0 && (
//           <span className="
//             absolute -top-1 -right-1
//             bg-red-500 text-white text-xs
//             min-w-5 h-5 rounded-full
//             flex items-center justify-center
//             font-semibold
//             animate-pulse
//           ">
//             {unreadCount > 99 ? '99+' : unreadCount}
//           </span>
//         )}
//       </button>

//       {/* 🎯 PANEL NOTIFICATIONS */}
//       {isOpen && (
//         <div className="absolute top-full right-0 mt-2 z-50">
//           <NotificationCenter 
//             isOpen={isOpen}
//             onClose={() => setIsOpen(false)}
//           />
//         </div>
//       )}
//     </div>
//   );
// }

// components/NotificationBell.tsx - CORRIGER LE CLICK OUTSIDE

export function NotificationBell({ className = "" }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const bellRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  
  const { unreadCount } = useNotifications();

  // 🎯 CORRECTION : NE PAS FERMER SI CLIC DANS LE PANEL
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // 🆕 VÉRIFIER SI LE CLIC EST DANS LA BELL OU LE PANEL
      const isClickInBell = bellRef.current?.contains(event.target as Node);
      const isClickInPanel = panelRef.current?.contains(event.target as Node);
      
      if (!isClickInBell && !isClickInPanel) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleNotifications = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className={`relative ${className}`}>
      {/* 🎯 BOUTON CLOCHE */}
      <button
        ref={bellRef}
        onClick={toggleNotifications}
        className={`
          relative p-2 rounded-lg border transition-all duration-200
          ${isOpen 
            ? 'bg-blue-100 border-blue-300 text-blue-700' 
            : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
          }
        `}
        aria-label="Notifications"
      >
        {unreadCount > 0 ? (
          <BellRing size={20} className="text-orange-500" />
        ) : (
          <Bell size={20} />
        )}
        
        {/* BADGE */}
        {unreadCount > 0 && (
          <span className="
            absolute -top-1 -right-1
            bg-red-500 text-white text-xs
            min-w-5 h-5 rounded-full
            flex items-center justify-center
            font-semibold
            animate-pulse
          ">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* 🎯 PANEL NOTIFICATIONS - AJOUTER REF */}
      {isOpen && (
        <div ref={panelRef} className="absolute top-full right-0 mt-2 z-50">
          <NotificationCenter 
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
          />
        </div>
      )}
    </div>
  );
}