"use client";

import React, { useCallback, useRef, useState, useEffect } from "react";
import { useFigJamBoard } from "@/hooks/useFigJamBoard";
import { useContainment } from "@/hooks/useContainment";
import { StickyNote } from "./StickyNote";
import { Section } from "./Section";
import { FigJamToolbar } from "./FigJamToolbar";
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
  storageKey?: string;
  onChange?: (elements: Record<string, FigJamElement>) => void;
  initialElements?: Record<string, FigJamElement>;
}

export function FigJamBoard({
  projectName,
  storageKey = "figjam-default",
  onChange,
  initialElements,
}: FigJamBoardProps) {
  const board = useFigJamBoard();
  const { state } = board;

  const [isLoaded, setIsLoaded] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  const [draggingStickyId, setDraggingStickyId] = useState<string | null>(null);

  const [lassoStart, setLassoStart] = useState<Position | null>(null);
  const [lassoEnd, setLassoEnd] = useState<Position | null>(null);
  const isLassoing = lassoStart !== null;

  const [renameSectionId, setRenameSectionId] = useState<string | null>(null);

  // ── Load from localStorage on mount ────────────────────────────────────
  useEffect(() => {
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
  }, [storageKey, initialElements, board]);

  // ── Save to localStorage on every change ────────────────────────────────
  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem(storageKey, JSON.stringify(state.elements));
  }, [state.elements, storageKey, isLoaded]);

  // ── Context menu event handlers ─────────────────────────────────────
  useEffect(() => {
    const handleRenameSection = (e: Event) => {
      const sectionId = (e as CustomEvent).detail;
      setRenameSectionId(sectionId);
    };

    const handleDuplicateSection = (e: Event) => {
      const sectionId = (e as CustomEvent).detail;
      board.duplicateElement(sectionId);
    };

    window.addEventListener("renameSection", handleRenameSection);
    window.addEventListener("duplicateSection", handleDuplicateSection);

    return () => {
      window.removeEventListener("renameSection", handleRenameSection);
      window.removeEventListener("duplicateSection", handleDuplicateSection);
    };
  }, [board]);

  // ── Derived state ───────────────────────────────────────────────────
  const allStickies = Object.values(state.elements).filter(
    (el): el is StickyNoteData => el.type === "sticky"
  );
  const allSections = Object.values(state.elements).filter(
    (el): el is SectionData => el.type === "section"
  );

  // ── Containment ─────────────────────────────────────────────────────
  useContainment({
    elements: state.elements,
    onResizeSection: (sectionId, size) => {
      board.updateElement(sectionId, { size } as any);
    },
  });

  // ── Space key for pan ────────────────────────────────────────────────────
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        setIsSpacePressed(true);
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsSpacePressed(false);
        isPanning.current = false;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

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
      const isSpacePan = isSpacePressed;

      // Pan with space + click or middle mouse or hand tool
      if (isMiddle || isHandTool || isSpacePan) {
        isPanning.current = true;
        panStart.current  = { x: e.clientX, y: e.clientY };
        panOrigin.current = { ...state.pan };
        e.currentTarget.setPointerCapture(e.pointerId);
        
        if (isSpacePan) {
          document.body.style.cursor = "grabbing";
        }
        return;
      }

      // Start lasso selection on canvas click
      const target = e.target as HTMLElement;
      if (target === canvasRef.current || target.closest(".lasso-area")) {
        const pos = screenToCanvas(e.clientX, e.clientY);
        setLassoStart(pos);
        setLassoEnd(pos);
        e.currentTarget.setPointerCapture(e.pointerId);
        if (!e.ctrlKey && !e.metaKey) {
          board.clearSelection();
        }
      }

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
    [state.activeTool, state.pan, board, screenToCanvas, isSpacePressed]
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
        const minX = Math.min(lassoStart.x, lassoEnd.x);
        const maxX = Math.max(lassoStart.x, lassoEnd.x);
        const minY = Math.min(lassoStart.y, lassoEnd.y);
        const maxY = Math.max(lassoStart.y, lassoEnd.y);
        
        allStickies.forEach((sticky) => {
          const sRight = sticky.position.x + 200;
          const sBottom = sticky.position.y + 200;
          
          const intersects = !(sRight < minX || sticky.position.x > maxX || sBottom < minY || sticky.position.y > maxY);
          
          if (intersects) {
            board.selectElement(sticky.id, true);
          }
        });

        allSections.forEach((section) => {
          const sRight = section.position.x + section.size.width;
          const sBottom = section.position.y + section.size.height;
          
          const intersects = !(sRight < minX || section.position.x > maxX || sBottom < minY || section.position.y > maxY);
          
          if (intersects) {
            board.selectElement(section.id, true);
          }
        });
      }
      
      setLassoStart(null);
      setLassoEnd(null);
      isPanning.current = false;
    },
    [isLassoing, lassoStart, lassoEnd, allStickies, allSections, board]
  );

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

      // Arrow keys for moving selected elements
      const arrowKeys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
      if (arrowKeys.includes(e.key) && state.selectedIds.length > 0) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        let dx = 0, dy = 0;
        switch (e.key) {
          case "ArrowUp": dy = -step; break;
          case "ArrowDown": dy = step; break;
          case "ArrowLeft": dx = -step; break;
          case "ArrowRight": dx = step; break;
        }
        
        const selectedStickies = state.selectedIds
          .map((id) => state.elements[id])
          .filter((el): el is StickyNoteData => el?.type === "sticky");
        
        const patches = selectedStickies.map((sticky) => ({
          id: sticky.id,
          patch: {
            position: {
              x: sticky.position.x + dx,
              y: sticky.position.y + dy,
            },
          },
        }));
        
        if (patches.length > 0) {
          board.updateMany(patches as any);
        }

        const selectedSections = state.selectedIds
          .map((id) => state.elements[id])
          .filter((el): el is SectionData => el?.type === "section");

        selectedSections.forEach((section) => {
          board.moveSectionWithChildren(section.id, dx, dy);
        });

        return;
      }

      switch (e.key) {
        case "v": case "V": board.setTool("select"); break;
        case "h": case "H": board.setTool("hand");   break;
        case "t": case "T": board.setTool("text");   break;
        case "s": case "S": board.setTool("sticky"); break;
        case "f": case "F": board.setTool("section"); break;
        case "F2":
          if (state.selectedIds.length === 1) {
            const selectedEl = state.elements[state.selectedIds[0]];
            if (selectedEl?.type === "section") {
              e.preventDefault();
              setRenameSectionId(state.selectedIds[0]);
            }
          }
          break;
        case "Escape":
          board.setTool("select");
          board.clearSelection();
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
  }, [board, state.selectedIds, state.zoom, state.elements, allStickies]);

  useEffect(() => { onChange?.(state.elements); }, [state.elements, onChange]);

  // ── Sort elements for rendering ──────────────────────────────────────────

  const sorted   = Object.values(state.elements).sort((a, b) => a.zIndex - b.zIndex);
  const sections = sorted.filter((el): el is SectionData    => el.type === "section");
  const others   = sorted.filter((el) => el.type !== "section");
  const stickies = others.filter((el): el is StickyNoteData => el.type === "sticky");

  // Which section is the dragging sticky hovering over?
  const hoveredSectionId = draggingStickyId
    ? (() => {
        const sticky = state.elements[draggingStickyId] as StickyNoteData | undefined;
        if (!sticky) return null;

        const stickySize = sticky.size ?? { width: 200, height: 200 };

        for (const section of sections) {
          const sectionRight = section.position.x + section.size.width;
          const sectionBottom = section.position.y + section.size.height;

          const stickyCenterX = sticky.position.x + stickySize.width / 2;
          const stickyCenterY = sticky.position.y + stickySize.height / 2;

          const isInside =
            stickyCenterX > section.position.x &&
            stickyCenterX < sectionRight &&
            stickyCenterY > section.position.y + 40 &&
            stickyCenterY < sectionBottom;

          if (isInside) {
            return section.id;
          }
        }
        return null;
      })()
    : null;

  const attachedSectionId = draggingStickyId
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
    if (!parentSection.autoResize) return undefined;
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
    : isSpacePressed ? "cursor-grab"
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

          {/* ── Sections ── */}
          {sections.map((el) => (
            <Section
              key={el.id}
              section={el}
              zoom={state.zoom}
              isSelected={state.selectedIds.includes(el.id)}
              isHovered={attachedSectionId === el.id}
              onSelect={board.selectElement}
              onMoveWithChildren={board.moveSectionWithChildren}
              onMoveSelected={board.moveSelected}
              selectedIds={state.selectedIds}
              onUpdate={(id, patch) => board.updateElement(id, patch as any)}
              onDelete={board.deleteElement}
              onArrangeSection={(sectionId) => board.autoArrange(sectionId)}
              renameTrigger={renameSectionId}
            />
          ))}

          {/* ── Sticky notes ── */}
          {stickies.map((el) => (
            <StickyNote
              key={el.id}
              note={el}
              zoom={state.zoom}
              isSelected={state.selectedIds.includes(el.id)}
              onSelect={board.selectElement}
              onMove={(id, pos) => board.moveSticky(id, pos)}
              onMoveSelected={board.moveSelected}
              selectedIds={state.selectedIds}
              onUpdate={(id, patch) => board.updateElement(id, patch as any)}
              onDelete={board.deleteElement}
              onDuplicate={board.duplicateElement}
              onBringToFront={board.bringToFront}
              onResize={(id, size) => board.updateElement(id, { size } as any)}
              onDragStart={(id) => setDraggingStickyId(id)}
              onDragEnd={(id) => {
                if (hoveredSectionId) {
                  const sticky = state.elements[id] as StickyNoteData | undefined;
                  if (sticky) {
                    board.updateElement(id, { parentSectionId: hoveredSectionId } as any);
                  }
                }
                setDraggingStickyId(null);
              }}
              dragBounds={getStickyDragBounds(el)}
            />
          ))}
        </div>
      </div>

      {/* ── Toolbar ── */}
      <FigJamToolbar
        activeTool={state.activeTool}
        zoom={state.zoom}
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
        onGroupSelected={() => board.groupSelectedIntoSection()}
        selectedCount={state.selectedIds.length}
      />

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
