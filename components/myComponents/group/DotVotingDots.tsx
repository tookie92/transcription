"use client";

import { DotVotingSession } from "@/types";

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
}

export function DotVotingDots({
  localDots,
  groupDots,
  currentUserId,
  activeSession,
  getUserColor,
}: DotVotingDotsProps) {
  return (
    <>
      {/* DOTS DE VOTE LOCAUX */}
      {localDots.map((dot) => (
        <div
          key={dot.id}
          className="absolute w-10 h-10 rounded-full border-4 border-white shadow-2xl flex items-center justify-center z-40 animate-pop-in"
          style={{
            left: dot.x,
            top: dot.y,
            background: `radial-gradient(circle, ${dot.color}, ${dot.color}CC)`,
            filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.3))",
          }}
          title="Your vote"
        >
          <span className="text-white text-sm font-bold">✓</span>
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
              className="absolute w-10 h-10 rounded-full border-4 border-white shadow-2xl flex items-center justify-center z-30 transition-all hover:scale-125 hover:rotate-12"
              style={{
                left: dot.position.x,
                top: dot.position.y,
                background: `radial-gradient(circle, ${dot.color || getUserColor(dot.userId)}, ${dot.color || getUserColor(dot.userId)}CC)`,
                filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.3))",
              }}
              title={isMyDot ? "Your vote" : "Participant vote"}
            >
              {isMyDot && (
                <span className="text-white text-sm font-bold animate-pulse">
                  ✓
                </span>
              )}
            </div>
          );
        })}
    </>
  );
}
