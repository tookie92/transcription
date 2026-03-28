"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell } from "lucide-react";

interface NotificationBadgeProps {
  count: number;
  max?: number;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  className?: string;
  onClick?: () => void;
}

export function NotificationBadge({
  count,
  max = 99,
  size = "md",
  showIcon = false,
  className = "",
  onClick,
}: NotificationBadgeProps) {
  if (count <= 0) return null;

  const displayCount = count > max ? `${max}+` : count.toString();

  const sizeClasses = {
    sm: "text-[10px] min-w-[16px] h-4 px-1",
    md: "text-xs min-w-[18px] h-5 px-1.5",
    lg: "text-sm min-w-[22px] h-6 px-2",
  };

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  return (
    <div className={`relative inline-flex items-center ${className}`} onClick={onClick}>
      {showIcon && (
        <Bell className={`${iconSizes[size]} text-muted-foreground`} />
      )}
      
      <AnimatePresence>
        <motion.span
          key={count}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 25 }}
          className={`
            absolute -top-1 -right-1 flex items-center justify-center
            font-medium rounded-full bg-red-500 text-white
            ${sizeClasses[size]}
            shadow-sm
          `}
        >
          {displayCount}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

interface ActivityIndicatorProps {
  lastActivityTime: number | null;
  className?: string;
}

export function ActivityIndicator({ lastActivityTime, className = "" }: ActivityIndicatorProps) {
  if (!lastActivityTime) return null;

  const timeSinceActivity = Date.now() - lastActivityTime;
  const isRecent = timeSinceActivity < 10000;

  return (
    <div className={`relative inline-flex items-center gap-1 ${className}`}>
      <motion.div
        className="w-2 h-2 rounded-full bg-green-500"
        animate={isRecent ? { scale: [1, 1.2, 1], opacity: [1, 0.7, 1] } : {}}
        transition={{ repeat: isRecent ? Infinity : 0, duration: 1.5 }}
      />
      <span className="text-xs text-muted-foreground">Live</span>
    </div>
  );
}

interface ActivityButtonWithBadgeProps {
  count: number;
  isActive: boolean;
  onClick: () => void;
  className?: string;
}

export function ActivityButtonWithBadge({
  count,
  isActive,
  onClick,
  className = "",
}: ActivityButtonWithBadgeProps) {
  return (
    <button
      onClick={onClick}
      className={`
        relative px-3 py-1.5 rounded-lg border flex items-center gap-2 text-sm transition-all
        ${isActive
          ? "bg-primary/20 border-primary text-primary"
          : "bg-muted border-border text-foreground hover:bg-accent"
        }
        ${className}
      `}
    >
      <span>📋</span>
      <span>Activity</span>
      <NotificationBadge count={count} size="sm" />
    </button>
  );
}
