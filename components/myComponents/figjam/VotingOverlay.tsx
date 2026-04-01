"use client";

import React, { useState, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface VoteData {
  _id: string;
  userId: string;
  targetId: string;
  color: string;
  position: { x: number; y: number };
}

interface VotingOverlayProps {
  votes: VoteData[];
  currentUserId: string;
  currentUserColor: string;
  currentUserName: string;
  onVote: (position: { x: number; y: number }) => void;
}

export const VotingOverlay = memo(function VotingOverlay({
  votes,
  currentUserId,
  currentUserColor,
  currentUserName,
  onVote,
}: VotingOverlayProps) {
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  
  // Get user's placed dots
  const userDots = votes.filter(v => v.userId === currentUserId);
  
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  }, []);
  
  const handleMouseLeave = useCallback(() => {
    setMousePos(null);
  }, []);
  
  const handleClick = useCallback((e: React.MouseEvent) => {
    onVote({ x: e.clientX, y: e.clientY });
  }, [onVote]);

  return (
    <div
      className="fixed inset-0 z-40 pointer-events-auto"
      style={{ cursor: 'crosshair' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {/* Current user's placed dots */}
      <AnimatePresence>
        {userDots.map((dot) => (
          <motion.div
            key={dot._id}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
            className="absolute pointer-events-none"
            style={{
              left: dot.position.x,
              top: dot.position.y,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div
              className="w-10 h-10 rounded-full border-[3px] border-white shadow-xl"
              style={{ backgroundColor: dot.color }}
            />
          </motion.div>
        ))}
      </AnimatePresence>
      
      {/* Other users' dots (smaller, different style) */}
      {votes
        .filter(v => v.userId !== currentUserId)
        .map((dot) => (
          <div
            key={dot._id}
            className="absolute pointer-events-none"
            style={{
              left: dot.position.x,
              top: dot.position.y,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div
              className="w-7 h-7 rounded-full border-2 border-white/50 shadow-lg opacity-80"
              style={{ backgroundColor: dot.color }}
            />
          </div>
        ))}
      
      {/* Preview dot following cursor */}
      {mousePos && (
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.7 }}
          className="absolute pointer-events-none"
          style={{
            left: mousePos.x,
            top: mousePos.y,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div
            className="w-10 h-10 rounded-full border-[3px] border-white shadow-xl animate-pulse"
            style={{ backgroundColor: currentUserColor }}
          />
        </motion.div>
      )}
      
      {/* Instructions */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none">
        <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg px-5 py-3 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div 
              className="w-6 h-6 rounded-full border-2 border-white shadow"
              style={{ backgroundColor: currentUserColor }}
            />
            <span className="text-sm font-medium text-gray-700">{currentUserName}</span>
          </div>
          <div className="w-px h-6 bg-gray-300" />
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
            </svg>
            Click anywhere to place a vote
          </div>
        </div>
      </div>
    </div>
  );
});
