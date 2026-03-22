"use client";

import React from "react";
import type { StickyNoteData } from "@/types/figjam";

// ─── DotVotingControls ───────────────────────────────────────────────────────
// Banner shown at the top when voting mode is active

interface DotVotingControlsProps {
  isActive: boolean;
  votesUsed: number;
  maxVotes: number;
  onToggle: () => void;
  onReset: () => void;
}

export function DotVotingControls({
  isActive,
  votesUsed,
  maxVotes,
  onToggle,
  onReset,
}: DotVotingControlsProps) {
  const remaining = maxVotes - votesUsed;

  return (
    <div
      className={`flex items-center gap-3 px-4 py-2 rounded-xl border transition-all text-sm font-medium shadow-sm ${
        isActive
          ? "bg-violet-600 text-white border-violet-700"
          : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
      }`}
    >
      {isActive ? (
        <>
          {/* Dot indicators */}
          <div className="flex gap-1">
            {Array.from({ length: maxVotes }).map((_, i) => (
              <div
                key={i}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  i < remaining ? "bg-white" : "bg-violet-400"
                }`}
              />
            ))}
          </div>
          <span className="text-xs opacity-90">
            {remaining} dot{remaining !== 1 ? "s" : ""} left
          </span>
          <div className="w-px h-4 bg-violet-400" />
          <button
            className="text-xs underline opacity-75 hover:opacity-100"
            onClick={onReset}
          >
            Reset all
          </button>
          <button
            className="ml-1 px-3 py-1 bg-white text-violet-700 rounded-lg text-xs font-semibold hover:bg-violet-50 transition-colors"
            onClick={onToggle}
          >
            Done voting
          </button>
        </>
      ) : (
        <button
          className="flex items-center gap-2"
          onClick={onToggle}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" className="text-violet-500">
            <circle cx="8" cy="8" r="7" strokeWidth="1.5" stroke="currentColor" fill="none"/>
            <circle cx="8" cy="8" r="3"/>
          </svg>
          Dot voting
        </button>
      )}
    </div>
  );
}

// ─── VotingLeaderboard ───────────────────────────────────────────────────────
// Sidebar showing ranked sticky notes by votes

interface VotingLeaderboardProps {
  stickies: StickyNoteData[];
  onClose: () => void;
}

export function VotingLeaderboard({ stickies, onClose }: VotingLeaderboardProps) {
  const ranked = [...stickies]
    .filter((s) => s.votes > 0)
    .sort((a, b) => b.votes - a.votes);

  if (ranked.length === 0) {
    return (
      <div className="absolute right-4 top-16 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 p-5 z-50">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800 text-sm">Results</h3>
          <button className="text-gray-400 hover:text-gray-600 text-xs" onClick={onClose}>✕</button>
        </div>
        <p className="text-gray-400 text-xs text-center py-4">No votes yet</p>
      </div>
    );
  }

  return (
    <div className="absolute right-4 top-16 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h3 className="font-semibold text-gray-800 text-sm">🏆 Voting Results</h3>
        <button className="text-gray-400 hover:text-gray-600 text-xs" onClick={onClose}>✕</button>
      </div>

      {/* Ranked list */}
      <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
        {ranked.map((sticky, index) => {
          const maxVotes = ranked[0].votes;
          const pct = maxVotes > 0 ? (sticky.votes / maxVotes) * 100 : 0;
          const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : null;

          return (
            <div key={sticky.id} className="px-4 py-3">
              <div className="flex items-start gap-2 mb-1.5">
                <span className="text-sm shrink-0">{medal ?? `#${index + 1}`}</span>
                <p className="text-xs text-gray-700 flex-1 line-clamp-2 leading-snug">
                  {sticky.content || "(empty)"}
                </p>
                <span className="text-xs font-bold text-violet-600 shrink-0">
                  {sticky.votes}
                </span>
              </div>
              {/* Vote bar */}
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden ml-6">
                <div
                  className="h-full bg-violet-400 rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── VotingModeBanner ────────────────────────────────────────────────────────
// Floating banner during voting mode

interface VotingModeBannerProps {
  votesUsed: number;
  maxVotes: number;
}

export function VotingModeBanner({ votesUsed, maxVotes }: VotingModeBannerProps) {
  const remaining = maxVotes - votesUsed;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div className="flex items-center gap-3 bg-gray-900 text-white text-sm px-5 py-3 rounded-2xl shadow-2xl">
        <div className="flex gap-1.5">
          {Array.from({ length: maxVotes }).map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full transition-all ${
                i < remaining
                  ? "bg-violet-400 shadow-[0_0_6px_rgba(167,139,250,0.8)]"
                  : "bg-gray-600"
              }`}
            />
          ))}
        </div>
        <span className="text-gray-300">
          {remaining === 0
            ? "All votes used!"
            : `${remaining} vote${remaining !== 1 ? "s" : ""} remaining — click stickies to vote`}
        </span>
      </div>
    </div>
  );
}
