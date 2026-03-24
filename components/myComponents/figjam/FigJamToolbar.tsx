"use client";

import React from "react";
import type { ToolType, StickyColor } from "@/types/figjam";
import { STICKY_COLORS } from "./StickyNote";
import { VotingSettings } from "./VotingSettings";

// ─── Types ───────────────────────────────────────────────────────────────────

interface VotingConfig {
  dotsPerUser: number;
  durationMinutes: number | null;
}

interface FigJamToolbarProps {
  activeTool: ToolType;
  zoom: number;
  selectedCount: number;
  onToolChange: (tool: ToolType) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onAddSticky: (color?: StickyColor) => void;
  onAddSection: () => void;
  onGroupSelected: () => void;
  votingConfig?: VotingConfig;
  onVotingConfigChange?: (config: VotingConfig) => void;
  isVotingActive?: boolean;
  timerSeconds?: number;
  onStartVoting?: () => void;
  onEndVoting?: () => void;
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

const STICKY_PALETTE: StickyColor[] = ["yellow", "pink", "green", "blue", "purple", "orange", "white"];

// ─── Component ───────────────────────────────────────────────────────────────

export function FigJamToolbar({
  activeTool,
  zoom,
  selectedCount,
  onToolChange,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onAddSticky,
  onAddSection,
  onGroupSelected,
  votingConfig,
  onVotingConfigChange,
  isVotingActive,
  timerSeconds,
  onStartVoting,
  onEndVoting,
}: FigJamToolbarProps) {
  const [showStickyPicker, setShowStickyPicker] = React.useState(false);

  return (
    <>
      {/* ── Header Voting Button ── */}
      {onVotingConfigChange && votingConfig && (
        <div className="absolute top-3 right-4 z-30">
          <VotingSettings
            config={votingConfig}
            onConfigChange={onVotingConfigChange}
            isVotingActive={isVotingActive}
            timerSeconds={timerSeconds}
            onStartVoting={onStartVoting}
            onEndVoting={onEndVoting}
          />
        </div>
      )}

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
        <div className="relative">
          <ToolButton
            active={showStickyPicker}
            label="Sticky note"
            shortcut="S"
            onClick={() => setShowStickyPicker((v) => !v)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15.5 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3z"/>
              <path d="M15 3v6h6"/>
            </svg>
          </ToolButton>

          {showStickyPicker && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowStickyPicker(false)}/>
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-2xl border border-gray-100 p-2 flex gap-1.5 z-50">
                {STICKY_PALETTE.map((color) => (
                  <button
                    key={color}
                    title={color}
                    className="w-7 h-7 rounded-lg border-2 border-white shadow hover:scale-110 transition-transform"
                    style={{ background: STICKY_COLORS[color].bg, borderColor: STICKY_COLORS[color].header }}
                    onClick={() => {
                      onAddSticky(color);
                      setShowStickyPicker(false);
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </div>

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
