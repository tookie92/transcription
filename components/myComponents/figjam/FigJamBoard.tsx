"use client";

import React, { useCallback, useRef, useState, useEffect } from "react";
import { useFigJamBoard } from "@/hooks/useFigJamBoard";
import { useContainment, isInsideSection } from "@/hooks/useContainment";
import { StickyNote } from "./StickyNote";
import { Section } from "./Section";
import { FigJamToolbar } from "./FigJamToolbar";
import { DotVotingControls, VotingLeaderboard, VotingModeBanner } from "./DotVoting";
import type { FigJamElement, Position, StickyColor, StickyNoteData, SectionData } from "@/types/figjam";

// ─── Canvas dot grid ──────────────────────────────────────────────────────────

function CanvasGrid({ zoom, pan }: { zoom: number; pan: Position }) {
  const spacing = 24 * zoom;
  const offsetX = (pan.x % spacing + spacing) % spacing;
  const offsetY = (pan.y % spacing + spacing) % spacing;

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
      <defs>
        <pattern
          id="figjam-grid"
          x={offsetX} y={offsetY}
          width={spacing} height={spacing}
          patternUnits="userSpaceOnUse"
        >
          <circle cx={spacing / 2} cy={spacing / 2} r={1.5} fill="#d1d5db" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#figjam-grid)" />
    </svg>
  );
}

// ─── FigJamBoard ──────────────────────────────────────────────────────────────

interface FigJamBoardProps {
  projectName?: string;
  maxVotesPerUser?: number;
  storageKey?: string; // localStorage key, e.g. "figjam-board-{projectId}"
  onChange?: (elements: Record<string, FigJamElement>) => void;
  initialElements?: Record<string, FigJamElement>; // Optional external initial data
}

export function FigJamBoard({
  projectName,
  maxVotesPerUser = 5,
  storageKey = "figjam-default",
  onChange,
  initialElements,
}: FigJamBoardProps) {
  const board = useFigJamBoard();
  const { state } = board;

  const [isVotingMode, setIsVotingMode] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Which sticky is currently being dragged (for section hover highlight)
  const [draggingStickyId, setDraggingStickyId] = useState<string | null>(null);

  // Lasso selection state
  const [lassoStart, setLassoStart] = useState<Position | null>(null);
  const [lassoEnd, setLassoEnd] = useState<Position | null>(null);
  const isLassoing = lassoStart !== null;

  // ── Load from localStorage on mount ────────────────────────────────────
  useEffect(() => {
    // Priority: 1. initialElements prop, 2. localStorage
    if (initialElements && Object.keys(initialElements).length > 0) {
      board.loadElements(initialElements);
    } else {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as Record<string, FigJamElement>;
          board.loadElements(parsed);
        } catch (e) {
          console.error("Failed to load board from localStorage:", e);
        }
      }
    }
    setIsLoaded(true);
  }, [storageKey, initialElements]);

  // ── Save to localStorage on every change ────────────────────────────────
  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem(storageKey, JSON.stringify(state.elements));
  }, [state.elements, storageKey, isLoaded]);

  // ── Derived state (for keyboard shortcuts) ───────────────────────────
  const allStickies = Object.values(state.elements).filter(
    (el): el is StickyNoteData => el.type === "sticky"
  );

  // ── Containment: auto-grow sections when stickies overflow ─────────────
  // NOTE: Stickies are always free-floating. Sections are visual containers only.

  useContainment({
    elements: state.elements,
    onResizeSection: (sectionId, size) => {
      board.updateElement(sectionId, { size } as any);
    },
  });

  // ── Canvas pan / zoom ────────────────────────────────────────────────────

  const canvasRef = useRef<HTMLDivElement>(null);
  const isPanning = useRef(false);
  const panStart  = useRef<Position>({ x: 0, y: 0 });
  const panOrigin = useRef<Position>({ x: 0, y: 0 });

  const screenToCanvas = useCallback(
    (screenX: number, screenY: number): Position => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: (screenX - rect.left  - state.pan.x) / state.zoom,
        y: (screenY - rect.top   - state.pan.y) / state.zoom,
      };
    },
    [state.pan, state.zoom]
  );

  // Wheel zoom centred on cursor
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const delta  = e.deltaY < 0 ? 1.08 : 1 / 1.08;
      const newZoom = Math.min(4, Math.max(0.1, state.zoom * delta));
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      board.setZoom(newZoom);
      board.setPan({
        x: mx - (mx - state.pan.x) * (newZoom / state.zoom),
        y: my - (my - state.pan.y) * (newZoom / state.zoom),
      });
    },
    [state.zoom, state.pan, board]
  );

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  // ── Canvas pointer events ────────────────────────────────────────────────

  const handleCanvasPointerDown = useCallback(
    (e: React.PointerEvent) => {
      const isMiddle   = e.button === 1;
      const isHandTool = state.activeTool === "hand";

      if (isMiddle || isHandTool) {
        isPanning.current = true;
        panStart.current  = { x: e.clientX, y: e.clientY };
        panOrigin.current = { ...state.pan };
        e.currentTarget.setPointerCapture(e.pointerId);
        return;
      }

      // Start lasso selection on canvas click (not on sticky)
      const target = e.target as HTMLElement;
      if (target === canvasRef.current || target.closest(".lasso-area")) {
        const pos = screenToCanvas(e.clientX, e.clientY);
        setLassoStart(pos);
        setLassoEnd(pos);
        e.currentTarget.setPointerCapture(e.pointerId);
      }

      board.clearSelection();

      if (state.activeTool === "sticky") {
        const pos = screenToCanvas(e.clientX, e.clientY);
        board.addStickyNote({ x: pos.x - 100, y: pos.y - 80 });
        board.setTool("select");
      }
      if (state.activeTool === "section") {
        const pos = screenToCanvas(e.clientX, e.clientY);
        board.addSection({ x: pos.x - 240, y: pos.y - 160 });
        board.setTool("select");
      }
    },
    [state.activeTool, state.pan, board, screenToCanvas]
  );

  const handleCanvasPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (isLassoing) {
        const pos = screenToCanvas(e.clientX, e.clientY);
        setLassoEnd(pos);
        return;
      }
      
      if (!isPanning.current) return;
      board.setPan({
        x: panOrigin.current.x + (e.clientX - panStart.current.x),
        y: panOrigin.current.y + (e.clientY - panStart.current.y),
      });
    },
    [board, isLassoing, screenToCanvas]
  );

  const handleCanvasPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (isLassoing && lassoStart && lassoEnd) {
        // Calculate lasso bounding box
        const minX = Math.min(lassoStart.x, lassoEnd.x);
        const maxX = Math.max(lassoStart.x, lassoEnd.x);
        const minY = Math.min(lassoStart.y, lassoEnd.y);
        const maxY = Math.max(lassoStart.y, lassoEnd.y);
        
        // Select all stickies that intersect with lasso
        const stickyW = 200;
        const stickyH = 200;
        
        allStickies.forEach((sticky) => {
          const sLeft = sticky.position.x;
          const sRight = sticky.position.x + stickyW;
          const sTop = sticky.position.y;
          const sBottom = sticky.position.y + stickyH;
          
          // Check if sticky intersects with lasso
          const intersects = !(sRight < minX || sLeft > maxX || sBottom < minY || sTop > maxY);
          
          if (intersects) {
            board.selectElement(sticky.id, true); // multi-select
          }
        });
      }
      
      setLassoStart(null);
      setLassoEnd(null);
      isPanning.current = false;
    },
    [isLassoing, lassoStart, lassoEnd, allStickies, board]
  );

  // ── Voting ───────────────────────────────────────────────────────────────

  const handleToggleVoting = useCallback(() => {
    setIsVotingMode((v) => !v);
    setShowLeaderboard(false);
  }, []);

  // ── Keyboard shortcuts ───────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // Undo/Redo
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        board.undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault();
        board.redo();
        return;
      }

      // Group selected (Ctrl+G)
      if ((e.ctrlKey || e.metaKey) && e.key === "g") {
        e.preventDefault();
        board.groupSelectedIntoSection();
        return;
      }

      // Select all (Ctrl+A)
      if ((e.ctrlKey || e.metaKey) && e.key === "a") {
        e.preventDefault();
        const allStickyIds = allStickies.map((s) => s.id);
        allStickyIds.forEach((id, i) => board.selectElement(id, i > 0));
        return;
      }

      switch (e.key) {
        case "v": case "V": board.setTool("select"); break;
        case "h": case "H": board.setTool("hand");   break;
        case "t": case "T": board.setTool("text");   break;
        case "Escape":
          board.setTool("select");
          board.clearSelection();
          setIsVotingMode(false);
          break;
        case "Backspace":
        case "Delete":
          state.selectedIds.forEach((id) => board.deleteElement(id));
          break;
        case "+": board.setZoom(state.zoom * 1.15); break;
        case "-": board.setZoom(state.zoom / 1.15); break;
        case "0": board.setZoom(1); board.setPan({ x: 0, y: 0 }); break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [board, state.selectedIds, state.zoom, allStickies]);

  useEffect(() => { onChange?.(state.elements); }, [state.elements, onChange]);

  // ── Sort elements for rendering ──────────────────────────────────────────

  const sorted   = Object.values(state.elements).sort((a, b) => a.zIndex - b.zIndex);
  const sections = sorted.filter((el): el is SectionData    => el.type === "section");
  const others   = sorted.filter((el) => el.type !== "section");
  const stickies = others.filter((el): el is StickyNoteData => el.type === "sticky");

  // Which section is the dragging sticky hovering over?
  // Only highlight sections if the sticky is attached to a section
  const hoveredSectionId = draggingStickyId
    ? (() => {
        const sticky = state.elements[draggingStickyId] as StickyNoteData | undefined;
        if (!sticky || !sticky.parentSectionId) return null;
        return sections.find((s) => s.id === sticky.parentSectionId)?.id ?? null;
      })()
    : null;

  // Calculate drag bounds for stickies in auto-resize sections
  const getStickyDragBounds = (sticky: StickyNoteData) => {
    if (!sticky.parentSectionId) return undefined;
    const parentSection = state.elements[sticky.parentSectionId] as SectionData | undefined;
    if (!parentSection || parentSection.type !== "section") return undefined;
    // Only constrain if auto-resize is enabled
    if (!parentSection.autoResize) return undefined;
    // Bounds = section area (title bar excluded)
    const TITLE_BAR_H = 40;
    return {
      minX: parentSection.position.x,
      minY: parentSection.position.y + TITLE_BAR_H,
      maxX: parentSection.position.x + parentSection.size.width,
      maxY: parentSection.position.y + parentSection.size.height,
    };
  };

  const cursorStyle =
    state.activeTool === "hand"    ? "cursor-grab"
    : state.activeTool === "sticky"  ? "cursor-crosshair"
    : state.activeTool === "section" ? "cursor-crosshair"
    : "cursor-default";

  return (
    <div
      className="relative w-full h-full overflow-hidden bg-[#f5f5f0] select-none"
      style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
    >
      {/* ── Top bar ── */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-2 bg-white/80 backdrop-blur-sm border-b border-gray-100">
        <div className="flex items-center gap-3">
          <svg width="20" height="20" viewBox="0 0 38 57" fill="none" className="shrink-0">
            <path d="M19 28.5a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0z" fill="#1ABCFE"/>
            <path d="M0 47.5A9.5 9.5 0 0 1 9.5 38H19v9.5a9.5 9.5 0 0 1-19 0z" fill="#0ACF83"/>
            <path d="M19 0v19h9.5a9.5 9.5 0 0 0 0-19H19z" fill="#FF7262"/>
            <path d="M0 9.5A9.5 9.5 0 0 0 9.5 19H19V0H9.5A9.5 9.5 0 0 0 0 9.5z" fill="#F24E1E"/>
            <path d="M0 28.5A9.5 9.5 0 0 0 9.5 38H19V19H9.5A9.5 9.5 0 0 0 0 28.5z" fill="#FF7262"/>
          </svg>
          <span className="font-semibold text-sm text-gray-800">{projectName || "FigJam Board"}</span>
          <span className="text-xs text-gray-400">
            {Object.keys(state.elements).length} element{Object.keys(state.elements).length !== 1 ? "s" : ""}
          </span>
        </div>
        <DotVotingControls
          isActive={isVotingMode}
          votesUsed={state.votesUsed}
          maxVotes={maxVotesPerUser}
          onToggle={handleToggleVoting}
          onReset={board.resetVotes}
        />
      </div>

      {/* ── Canvas ── */}
      <div
        ref={canvasRef}
        className={`absolute inset-0 top-12 ${cursorStyle}`}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={handleCanvasPointerUp}
      >
        <CanvasGrid zoom={state.zoom} pan={state.pan} />

        <div
          className="absolute origin-top-left lasso-area"
          style={{ transform: `translate(${state.pan.x}px, ${state.pan.y}px) scale(${state.zoom})` }}
        >
          {/* ── Lasso selection visual ── */}
          {lassoStart && lassoEnd && (
            <div
              className="absolute pointer-events-none border-2 border-blue-500 bg-blue-500/10 rounded-md"
              style={{
                left: Math.min(lassoStart.x, lassoEnd.x),
                top: Math.min(lassoStart.y, lassoEnd.y),
                width: Math.abs(lassoEnd.x - lassoStart.x),
                height: Math.abs(lassoEnd.y - lassoStart.y),
              }}
            />
          )}

          {/* ── Sections (behind everything) ── */}
          {sections.map((el) => (
            <Section
              key={el.id}
              section={el}
              zoom={state.zoom}
              isSelected={state.selectedIds.includes(el.id)}
              isHovered={hoveredSectionId === el.id}
              onSelect={board.selectElement}
              onMoveWithChildren={board.moveSectionWithChildren}
              onUpdate={(id, patch) => board.updateElement(id, patch as any)}
              onDelete={board.deleteElement}
              onArrangeSection={(sectionId) => board.autoArrange(sectionId)}
            />
          ))}

          {/* ── Sticky notes (above sections) ── */}
          {stickies.map((el) => (
            <StickyNote
              key={el.id}
              note={el}
              zoom={state.zoom}
              isSelected={state.selectedIds.includes(el.id)}
              isVotingMode={isVotingMode}
              currentUserId={state.currentUserId}
              votesUsed={state.votesUsed}
              maxVotes={maxVotesPerUser}
              onSelect={board.selectElement}
              onMove={(id, pos) => board.moveSticky(id, pos)}
              onUpdate={(id, patch) => board.updateElement(id, patch as any)}
              onDelete={board.deleteElement}
              onDuplicate={board.duplicateElement}
              onBringToFront={board.bringToFront}
              onCastVote={board.castVote}
              onRemoveVote={board.removeVote}
              onResize={(id, size) => board.updateElement(id, { size } as any)}
              onDragStart={(id) => setDraggingStickyId(id)}
              onDragEnd={() => setDraggingStickyId(null)}
              dragBounds={getStickyDragBounds(el)}
            />
          ))}
        </div>
      </div>

      {/* ── Toolbar ── */}
      <FigJamToolbar
        activeTool={state.activeTool}
        zoom={state.zoom}
        isVotingMode={isVotingMode}
        votesUsed={state.votesUsed}
        maxVotes={maxVotesPerUser}
        onToolChange={board.setTool}
        onZoomIn={() => board.setZoom(state.zoom * 1.2)}
        onZoomOut={() => board.setZoom(state.zoom / 1.2)}
        onZoomReset={() => { board.setZoom(1); board.setPan({ x: 0, y: 0 }); }}
        onAddSticky={(color?: StickyColor) =>
          board.addStickyNote({ x: 200 / state.zoom, y: 200 / state.zoom }, color)
        }
        onAddSection={() =>
          board.addSection({ x: 100 / state.zoom, y: 100 / state.zoom })
        }
        onToggleVoting={handleToggleVoting}
        onResetVotes={board.resetVotes}
        onShowLeaderboard={() => setShowLeaderboard((v) => !v)}
        onGroupSelected={() => board.groupSelectedIntoSection()}
        selectedCount={state.selectedIds.length}
      />

      {isVotingMode && (
        <VotingModeBanner votesUsed={state.votesUsed} maxVotes={maxVotesPerUser} />
      )}
      {showLeaderboard && (
        <VotingLeaderboard stickies={stickies} onClose={() => setShowLeaderboard(false)} />
      )}

      {Object.keys(state.elements).length === 0 && (
        <div className="absolute inset-0 top-12 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-gray-300 text-4xl mb-3">✦</p>
            <p className="text-gray-400 text-sm font-medium">Click the sticky note tool to start</p>
            <p className="text-gray-300 text-xs mt-1">Or press S, Ctrl+scroll to zoom</p>
          </div>
        </div>
      )}
    </div>
  );
}
