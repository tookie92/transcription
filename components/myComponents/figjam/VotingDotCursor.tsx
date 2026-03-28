"use client";

import { motion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface VotingDotCursorProps {
  x: number;
  y: number;
  color: string;
  userName?: string;
  showTooltip?: boolean;
  isAnimating?: boolean;
}

export function VotingDotCursor({
  x,
  y,
  color,
  userName = "You",
  showTooltip = false,
  isAnimating = false,
}: VotingDotCursorProps) {
  return (
    <motion.div
      className="absolute pointer-events-none z-50"
      initial={isAnimating ? { scale: 0, opacity: 0 } : false}
      animate={{ 
        scale: 1, 
        opacity: 1,
        x: x - 12,
        y: y - 12,
      }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ 
        type: "spring", 
        stiffness: 300, 
        damping: 20,
        scale: { duration: 0.2 },
      }}
      style={{ left: 0, top: 0 }}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            className="w-6 h-6 rounded-full border-2 border-white shadow-lg cursor-pointer"
            style={{ backgroundColor: color }}
            animate={isAnimating ? { 
              scale: [1, 1.2, 1],
              boxShadow: [
                `0 0 0 0 ${color}`,
                `0 0 0 8px ${color}40`,
                `0 0 0 0 ${color}`,
              ]
            } : {}}
            transition={{ duration: 0.4 }}
          />
        </TooltipTrigger>
        {showTooltip && (
          <TooltipContent side="right" className="bg-popover border-border">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: color }}
              />
              <span className="text-sm font-medium">{userName}</span>
            </div>
          </TooltipContent>
        )}
      </Tooltip>
    </motion.div>
  );
}

interface VotingDotProps {
  color: string;
  userName?: string;
  isRevealed?: boolean;
  size?: "sm" | "md" | "lg";
  animate?: boolean;
}

export function VotingDot({
  color,
  userName,
  isRevealed = false,
  size = "md",
  animate = false,
}: VotingDotProps) {
  const sizeClasses = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.div
          className={`${sizeClasses[size]} rounded-full border-2 border-white shadow-sm cursor-default`}
          style={{ backgroundColor: color }}
          initial={animate ? { scale: 0, opacity: 0 } : false}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ 
            type: "spring", 
            stiffness: 400, 
            damping: 15,
          }}
        />
      </TooltipTrigger>
      {isRevealed && userName && (
        <TooltipContent side="top" className="bg-popover border-border">
          <div className="flex items-center gap-2">
            <div 
              className="w-2 h-2 rounded-full" 
              style={{ backgroundColor: color }}
            />
            <span className="text-xs">{userName}</span>
          </div>
        </TooltipContent>
      )}
    </Tooltip>
  );
}
