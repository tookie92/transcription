"use client";

import { DotVotingSession } from "@/types";
import { X } from "lucide-react";

interface DotVotingDotsProps {
  localDots: Array<{ id: string; x: number; y: number; color: string }>;
  groupDots?: Array<{
    _id: string;
    userId: string;
    position: { x: number; y: number };
    color?: string;
  }>;
  currentUserId?: string;
  activeSession?: DotVotingSession;
  getUserColor: (userId: string) => string;
  onRemoveDot?: (dotId: string) => void;
  onRemoveLocalDot?: (dotId: string) => void;
}

export function DotVotingDots({
  localDots,
  groupDots,
  currentUserId,
  activeSession,
  getUserColor,
  onRemoveDot,
  onRemoveLocalDot,
}: DotVotingDotsProps) {
  return (
    <>
      {/* DOTS DE VOTE LOCAUX */}
      {localDots.map((dot) => (
        <div
          key={dot.id}
          className="absolute w-10 h-10 rounded-full border-4 border-white shadow-2xl flex items-center justify-center z-40 animate-pop-in cursor-pointer hover:scale-110 transition-transform"
          style={{
            left: dot.x,
            top: dot.y,
            background: `radial-gradient(circle, ${dot.color}, ${dot.color}CC)`,
            filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.3))",
          }}
          title="Click to remove"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onRemoveLocalDot?.(dot.id);
          }}
        >
          <X size={20} className="text-white opacity-0 hover:opacity-100" />
        </div>
      ))}

      {/* DOTS DE VOTE DE LA BASE */}
      {groupDots &&
        groupDots.map((dot) => {
          const isMyDot = dot.userId === currentUserId;
          const isVisible =
            isMyDot ||
            !activeSession?.isSilentMode ||
            activeSession?.votingPhase !== "voting";

          if (!isVisible) return null;

          return (
            <div
              key={dot._id}
              className={`absolute rounded-full border-4 border-white shadow-2xl flex items-center justify-center z-50 transition-all group
                ${isMyDot ? "cursor-pointer" : ""}`}
              style={{
                left: dot.position.x,
                top: dot.position.y,
                width: 40,
                height: 40,
                background: `radial-gradient(circle, ${dot.color || getUserColor(dot.userId)}, ${dot.color || getUserColor(dot.userId)}CC)`,
                filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.3))",
              }}
              title={isMyDot ? "Click to remove your vote" : `Vote by user`}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                if (isMyDot) {
                  onRemoveDot?.(dot._id);
                }
              }}
            >
              {isMyDot ? (
                <X size={20} className="text-white opacity-0 hover:opacity-100 transition-opacity" />
              ) : (
                <span className="text-white/50 text-xs">•</span>
              )}
            </div>
          );
        })}
    </>
  );
}
