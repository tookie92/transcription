"use client";

import React from "react";
import type { ToolType, StickyColor } from "@/types/figjam";
import { STICKY_COLORS } from "./StickyNote";
import { VotingSettings } from "./VotingSettings";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Trophy, BarChart3 } from "lucide-react";


// ─── Types ───────────────────────────────────────────────────────────────────

interface VotingConfig {
  dotsPerUser: number;
  durationMinutes: number | null;
}

interface SectionVoteResult {
  sectionId: string;
  title: string;
  voteCount: number;
  colors: string[];
}

interface FigJamToolbarProps {
  activeTool: ToolType;
  zoom: number;
  selectedCount: number;
  onToolChange: (tool: ToolType) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  showStickyPicker?: boolean;
  onToggleStickyPicker?: () => void;
  onAddSticky: (color?: StickyColor) => void;
  onAddSection: () => void;
  onGroupSelected: () => void;
  votingConfig?: VotingConfig;
  onVotingConfigChange?: (config: VotingConfig) => void;
  isVotingActive?: boolean;
  votingPhase?: "setup" | "voting" | "revealed" | "completed";
  isCreator?: boolean;
  remainingTime?: number | null;
  voteResults?: SectionVoteResult[];
  onStartVoting?: (durationMinutes?: number | null) => void;
  onStopAndReveal?: () => void;
  onStartNewVote?: () => void;
}

// ─── Tool definitions ────────────────────────────────────────────────────────

const TOOLS: { id: ToolType; label: string; shortcut: string; icon: React.ReactNode }[] = [
  {
    id: "select",
    label: "Select",
    shortcut: "V",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M4 0l16 12-7 2-4 8L4 0z"/>
      </svg>
    ),
  },
  {
    id: "hand",
    label: "Hand",
    shortcut: "H",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/>
        <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>
      </svg>
    ),
  },
  {
    id: "text",
    label: "Text",
    shortcut: "T",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M4 6V4h16v2h-7v14h-2V6H4z"/>
      </svg>
    ),
  },
  {
    id: "connector",
    label: "Connector",
    shortcut: "X",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M18 6L6 18M6 6l3 3M15 18l3-3"/>
        <circle cx="18" cy="6" r="2" fill="currentColor"/>
        <circle cx="6" cy="18" r="2" fill="currentColor"/>
      </svg>
    ),
  },
  {
    id: "shape",
    label: "Shape",
    shortcut: "S",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
      </svg>
    ),
  },
  {
    id: "stamp",
    label: "Stamp",
    shortcut: "E",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 9V5a3 3 0 0 0-3-3l-4 9h11a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h2.5"/>
      </svg>
    ),
  },
];

// Only 4 insight types for sticky notes
const STICKY_PALETTE: StickyColor[] = ["pain-point", "quote", "insight", "follow-up"];

const STICKY_PALETTE_INFO: Record<string, { label: string; description: string }> = {
  "pain-point": { label: "Pain Point", description: "User frustrations & problems" },
  "quote": { label: "Quote", description: "Notable user quotes" },
  "insight": { label: "Insight", description: "Key observations" },
  "follow-up": { label: "Follow-up", description: "Questions to explore" },
};

// ─── Component ───────────────────────────────────────────────────────────────

export function FigJamToolbar({
  activeTool,
  zoom,
  selectedCount,
  onToolChange,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  showStickyPicker,
  onToggleStickyPicker,
  onAddSticky,
  onAddSection,
  onGroupSelected,
  votingConfig,
  onVotingConfigChange,
  isVotingActive,
  votingPhase,
  isCreator,
  remainingTime,
  voteResults,
  onStartVoting,
  onStopAndReveal,
  onStartNewVote,
}: FigJamToolbarProps) {

  // Format remaining time
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Sort results by vote count (descending)
  const sortedResults = [...(voteResults || [])].sort((a, b) => b.voteCount - a.voteCount);

  return (
    <>
      {/* ── Main toolbar ── */}
      <div className="absolute left-1/2 bottom-6 -translate-x-1/2 z-30 flex items-center gap-1 bg-white rounded-2xl shadow-2xl border border-gray-100 px-3 py-2">

        {/* Navigation tools */}
        <ToolGroup>
          {TOOLS.slice(0, 2).map((tool) => (
            <ToolButton
              key={tool.id}
              active={activeTool === tool.id}
              label={tool.label}
              shortcut={tool.shortcut}
              onClick={() => onToolChange(tool.id)}
            >
              {tool.icon}
            </ToolButton>
          ))}
        </ToolGroup>

        <Divider />

        {/* Sticky note button with color picker */}
        <Popover open={showStickyPicker} onOpenChange={onToggleStickyPicker}>
          <PopoverTrigger asChild>
            <ToolButton
              active={!!showStickyPicker}
              label="Sticky note"
              shortcut="S"
              onClick={() => {}}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15.5 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3z"/>
                <path d="M15 3v6h6"/>
              </svg>
            </ToolButton>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" side="top" sideOffset={8}>
            <div className="flex flex-row gap-1">
              {STICKY_PALETTE.map((color) => (
                <Button
                  key={color}
                  variant="ghost"
                  size="sm"
                  className="flex flex-col gap-1 px-3 py-2 h-auto min-w-[80px]"
                  title={`${STICKY_PALETTE_INFO[color].label}: ${STICKY_PALETTE_INFO[color].description}`}
                  onClick={() => {
                    onAddSticky(color);
                    onToggleStickyPicker?.();
                  }}
                >
                  <div 
                    className="w-5 h-5 rounded shrink-0" 
                    style={{ background: STICKY_COLORS[color].bg, border: `2px solid ${STICKY_COLORS[color].header}` }}
                  />
                  <span className="text-[10px] font-medium text-gray-700">{STICKY_PALETTE_INFO[color].label}</span>
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Section / Frame button */}
        <ToolButton
          active={activeTool === "section"}
          label="Frame"
          shortcut="F"
          onClick={onAddSection}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
          </svg>
        </ToolButton>

        <Divider />

        {/* Voting Controls */}
        <VotingSettings
          config={votingConfig || { dotsPerUser: 5, durationMinutes: null }}
          onConfigChange={onVotingConfigChange || (() => {})}
          isVotingActive={isVotingActive}
          votingPhase={votingPhase}
          isCreator={isCreator}
          remainingTime={remainingTime}
          onStartVoting={onStartVoting}
          onStopAndReveal={onStopAndReveal}
          onStartNewVote={onStartNewVote}
        />

        <Divider />

        {/* Ranking popover - shown when votes are revealed */}
        {voteResults && voteResults.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <BarChart3 className="w-4 h-4" />
                Ranking
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" align="end">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase">Vote Results</p>
                {sortedResults.map((result, index) => (
                  <div key={result.sectionId} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
                    <span className={`text-xs font-bold w-5 ${index === 0 ? "text-yellow-500" : "text-gray-400"}`}>
                      #{index + 1}
                    </span>
                    <div className="flex gap-1 flex-1">
                      {result.colors.slice(0, 5).map((color, i) => (
                        <div key={i} className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                      ))}
                      {result.colors.length > 5 && (
                        <span className="text-xs text-gray-400">+{result.colors.length - 5}</span>
                      )}
                    </div>
                    <span className="text-sm font-medium">{result.voteCount} vote{result.voteCount !== 1 ? "s" : ""}</span>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* ── Selection indicator (bottom left) ── */}
      {selectedCount > 0 && (
        <div className="absolute left-5 bottom-6 z-30 flex items-center gap-2 bg-blue-500 text-white rounded-xl shadow-lg px-3 py-1.5">
          <span className="text-sm font-medium">{selectedCount} selected</span>
        </div>
      )}

      {/* ── Zoom controls (bottom right) ── */}
      <div className="absolute right-5 bottom-6 z-30 flex items-center gap-1 bg-white rounded-xl shadow-lg border border-gray-100 px-2 py-1.5">
        <button
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600 text-lg leading-none transition-colors"
          onClick={onZoomOut}
        >
          −
        </button>
        <button
          className="px-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg py-1 tabular-nums min-w-[48px] text-center transition-colors"
          onClick={onZoomReset}
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600 text-lg leading-none transition-colors"
          onClick={onZoomIn}
        >
          +
        </button>
      </div>
    </>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ToolGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-0.5">{children}</div>;
}

function Divider() {
  return <div className="w-px h-6 bg-gray-200 mx-1" />;
}

interface ToolButtonProps {
  active: boolean;
  label: string;
  shortcut: string;
  onClick: () => void;
  children: React.ReactNode;
  accent?: "blue" | "violet";
}

function ToolButton({ active, label, shortcut, onClick, children, accent = "blue" }: ToolButtonProps) {
  const activeClass =
    accent === "violet"
      ? "bg-violet-100 text-violet-700"
      : "bg-blue-100 text-blue-700";

  return (
    <button
      title={shortcut ? `${label} (${shortcut})` : label}
      className={`relative w-9 h-9 flex items-center justify-center rounded-xl transition-all ${
        active ? activeClass : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
