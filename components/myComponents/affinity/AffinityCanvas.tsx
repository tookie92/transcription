"use client";

import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import type {
  AffinityElement,
  StickyNote,
  Cluster,
  Position,
  StickyColor,
} from "./types";

const STICKY_COLORS: Record<StickyColor, { bg: string; border: string }> = {
  yellow: { bg: "#fef08a", border: "#eab308" },
  pink: { bg: "#fbcfe8", border: "#ec4899" },
  green: { bg: "#bbf7d0", border: "#22c55e" },
  blue: { bg: "#bfdbfe", border: "#3b82f6" },
  purple: { bg: "#e9d5ff", border: "#a855f7" },
  orange: { bg: "#fed7aa", border: "#f97316" },
  gray: { bg: "#e5e7eb", border: "#6b7280" },
};

const CLUSTER_COLORS = [
  "#8b5cf6",
  "#06b6d4",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#6366f1",
];

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

interface ToolbarProps {
  activeTool: "select" | "sticky" | "cluster";
  onToolChange: (tool: "select" | "sticky" | "cluster") => void;
  stickyColor: StickyColor;
  onStickyColorChange: (color: StickyColor) => void;
  onClearAll: () => void;
  onExport: () => void;
}

function Toolbar({
  activeTool,
  onToolChange,
  stickyColor,
  onStickyColorChange,
  onClearAll,
  onExport,
}: ToolbarProps) {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-lg px-3 py-2">
      <div className="flex items-center gap-1 border-r border-border pr-2">
        <Button
          variant={activeTool === "select" ? "default" : "ghost"}
          size="sm"
          onClick={() => onToolChange("select")}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
          </svg>
          Select
        </Button>

        <Button
          variant={activeTool === "sticky" ? "default" : "ghost"}
          size="sm"
          onClick={() => onToolChange("sticky")}
        >
          <div
            className="w-4 h-4 rounded-sm mr-1"
            style={{ backgroundColor: STICKY_COLORS[stickyColor].bg }}
          />
          Sticky
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {(Object.keys(STICKY_COLORS) as StickyColor[]).map((color) => (
              <DropdownMenuItem
                key={color}
                onClick={() => onStickyColorChange(color)}
                className="flex items-center gap-2"
              >
                <div
                  className="w-4 h-4 rounded-sm"
                  style={{ backgroundColor: STICKY_COLORS[color].bg }}
                />
                <span className="capitalize">{color}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant={activeTool === "cluster" ? "default" : "ghost"}
          size="sm"
          onClick={() => onToolChange("cluster")}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" strokeDasharray="4 2" />
          </svg>
          Cluster
        </Button>
      </div>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={onExport}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="text-muted-foreground hover:text-destructive"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </Button>
      </div>
    </div>
  );
}

interface StickyNoteProps {
  note: StickyNote;
  isSelected: boolean;
  onSelect: (id: string, multi?: boolean) => void;
  onUpdate: (id: string, patch: Partial<StickyNote>) => void;
  onDelete: (id: string) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDrag: (id: string, dx: number, dy: number) => void;
  zoom: number;
}

function StickyNoteComponent({
  note,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  onDragStart,
  onDragEnd,
  onDrag,
  zoom,
}: StickyNoteProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(note.content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  const colors = STICKY_COLORS[note.color];

  useEffect(() => {
    if (!isEditing) {
      setEditContent(note.content);
    }
  }, [note.content, isEditing]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (isEditing) return;
      e.stopPropagation();

      if (e.shiftKey || e.ctrlKey || e.metaKey) {
        onSelect(note.id, true);
      } else {
        onSelect(note.id, false);
      }

      dragStartRef.current = { x: e.clientX, y: e.clientY };
      onDragStart();

      const handleMove = (moveEvent: PointerEvent) => {
        if (!dragStartRef.current) return;

        const dx = (moveEvent.clientX - dragStartRef.current.x) / zoom;
        const dy = (moveEvent.clientY - dragStartRef.current.y) / zoom;

        onDrag(note.id, dx, dy);
        dragStartRef.current = { x: moveEvent.clientX, y: moveEvent.clientY };
      };

      const handleUp = () => {
        dragStartRef.current = null;
        onDragEnd();
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
      };

      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
    },
    [note.id, isEditing, onSelect, onDragStart, onDragEnd, onDrag, zoom]
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsEditing(true);
      setEditContent(note.content);
      setTimeout(() => textareaRef.current?.focus(), 0);
    },
    [note.content]
  );

  const finishEditing = useCallback(() => {
    setIsEditing(false);
    if (editContent !== note.content) {
      onUpdate(note.id, { content: editContent });
    }
  }, [editContent, note.content, note.id, onUpdate]);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onDelete(note.id);
    },
    [note.id, onDelete]
  );

  return (
    <div
      className="group select-none"
      style={{
        width: note.size.width,
        height: note.size.height,
      }}
      onPointerDown={handlePointerDown}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
    >
      <div
        className="w-full h-full rounded-lg shadow-md transition-all duration-150 flex flex-col overflow-hidden"
        style={{
          backgroundColor: colors.bg,
          border: `2px solid ${isSelected ? colors.border : "transparent"}`,
          transform: isSelected ? "scale(1.02)" : "scale(1)",
        }}
      >
        {isEditing ? (
          <Textarea
            ref={textareaRef}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onBlur={finishEditing}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setEditContent(note.content);
                setIsEditing(false);
              }
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                finishEditing();
              }
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="flex-1 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 p-3 text-sm"
            placeholder="Type something..."
          />
        ) : (
          <div className="flex-1 p-3 text-sm text-gray-800 overflow-hidden">
            {note.content || (
              <span className="text-gray-400 italic">Double-click to edit</span>
            )}
          </div>
        )}

        <div className="h-6 bg-black/5 flex items-center justify-center text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
          {note.content.length > 0 ? `${note.content.length}` : "Empty"}
        </div>
      </div>
    </div>
  );
}

interface ClusterComponentProps {
  cluster: Cluster;
  isSelected: boolean;
  onSelect: (id: string, multi?: boolean) => void;
  onUpdate: (id: string, patch: Partial<Cluster>) => void;
  onDelete: (id: string) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDrag: (dx: number, dy: number) => void;
  stickies: StickyNote[];
  zoom: number;
  onStickySelect: (id: string, multi?: boolean) => void;
  onStickyUpdate: (id: string, patch: Partial<StickyNote>) => void;
  onStickyDelete: (id: string) => void;
  onStickyDrag: (id: string, dx: number, dy: number) => void;
  onStickyDragEnd: () => void;
}

function ClusterComponent({
  cluster,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  onDragStart,
  onDragEnd,
  onDrag,
  stickies,
  zoom,
  onStickySelect,
  onStickyUpdate,
  onStickyDelete,
  onStickyDrag,
  onStickyDragEnd,
}: ClusterComponentProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(cluster.title);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!isEditing) {
      setEditTitle(cluster.title);
    }
  }, [cluster.title, isEditing]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (isEditing) return;
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      if (target.closest('[data-sticky]')) return;

      e.stopPropagation();

      if (e.shiftKey || e.ctrlKey || e.metaKey) {
        onSelect(cluster.id, true);
      } else {
        onSelect(cluster.id, false);
      }

      dragStartRef.current = { x: e.clientX, y: e.clientY };
      setIsDragging(true);
      onDragStart();

      const handleMove = (moveEvent: PointerEvent) => {
        if (!dragStartRef.current) return;

        const dx = (moveEvent.clientX - dragStartRef.current.x);
        const dy = (moveEvent.clientY - dragStartRef.current.y);

        onDrag(dx, dy);
        dragStartRef.current = { x: moveEvent.clientX, y: moveEvent.clientY };
      };

      const handleUp = () => {
        dragStartRef.current = null;
        setIsDragging(false);
        onDragEnd();
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
      };

      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
    },
    [cluster.id, isEditing, onSelect, onDragStart, onDragEnd, onDrag]
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsEditing(true);
      setEditTitle(cluster.title);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
    },
    [cluster.title]
  );

  const finishEditing = useCallback(() => {
    setIsEditing(false);
    if (editTitle !== cluster.title) {
      onUpdate(cluster.id, { title: editTitle });
    }
  }, [editTitle, cluster.title, cluster.id, onUpdate]);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onDelete(cluster.id);
    },
    [cluster.id, onDelete]
  );

  return (
    <div
      className="absolute select-none"
      style={{
        left: cluster.position.x,
        top: cluster.position.y,
        zIndex: isSelected ? 50 : 0,
      }}
      onPointerDown={handlePointerDown}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
    >
      <div
        className="w-full h-full rounded-xl transition-all duration-150"
        style={{
          border: `3px dashed ${isSelected ? cluster.color : cluster.color + "80"}`,
          backgroundColor: cluster.color + "10",
        }}
      >
        <div
          className="absolute -top-9 left-0 flex items-center gap-2 z-10"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {isEditing ? (
            <Input
              ref={inputRef}
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={finishEditing}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === "Escape") {
                  setEditTitle(cluster.title);
                  setIsEditing(false);
                }
              }}
              className="h-7 text-sm font-semibold bg-background shadow-md"
              style={{ borderColor: cluster.color }}
            />
          ) : (
            <div
              className="h-7 px-3 flex items-center rounded-md shadow-md text-sm font-semibold cursor-text"
              style={{
                color: cluster.color,
                backgroundColor: "hsl(var(--background))",
              }}
            >
              {cluster.title || "Untitled"}
            </div>
          )}

          <div
            className="h-6 px-2 flex items-center rounded-full text-xs font-medium shadow-md"
            style={{
              color: cluster.color,
              backgroundColor: cluster.color + "15",
            }}
          >
            {stickies.length}
          </div>
        </div>

        <div
          className="absolute inset-0 pt-8 px-4 pb-4 overflow-auto"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="flex flex-wrap gap-2 content-start min-h-full">
            {stickies.map((sticky) => (
              <div key={sticky.id} data-sticky="true">
                <StickyNoteComponent
                  note={sticky}
                  isSelected={false}
                  onSelect={onStickySelect}
                  onUpdate={onStickyUpdate}
                  onDelete={onStickyDelete}
                  onDragStart={() => {}}
                  onDragEnd={onStickyDragEnd}
                  onDrag={onStickyDrag}
                  zoom={zoom}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface AffinityCanvasProps {
  initialElements?: Record<string, AffinityElement>;
  onChange?: (elements: Record<string, AffinityElement>) => void;
}

export function AffinityCanvas({ initialElements, onChange }: AffinityCanvasProps) {
  const [elements, setElements] = useState<Record<string, AffinityElement>>(() => {
    return initialElements || {};
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeTool, setActiveTool] = useState<"select" | "sticky" | "cluster">("select");
  const [stickyColor, setStickyColor] = useState<StickyColor>("yellow");
  const [pan, setPan] = useState<Position>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; y: number; pan: Position } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const stickies = useMemo(
    () => Object.values(elements).filter((el): el is StickyNote => el.type === "sticky"),
    [elements]
  );

  const clusters = useMemo(
    () => Object.values(elements).filter((el): el is Cluster => el.type === "cluster"),
    [elements]
  );

  const ungroupedStickies = useMemo(
    () => stickies.filter((s) => !s.clusterId),
    [stickies]
  );

  const getClusterStickies = useCallback(
    (clusterId: string) => stickies.filter((s) => s.clusterId === clusterId),
    [stickies]
  );

  useEffect(() => {
    onChange?.(elements);
  }, [elements, onChange]);

  const handleCanvasPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        setIsPanning(true);
        panStartRef.current = { x: e.clientX, y: e.clientY, pan };
        return;
      }

      if (e.button !== 0) return;

      if (activeTool === "sticky") {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        const x = (e.clientX - rect.left - pan.x) / zoom - 100;
        const y = (e.clientY - rect.top - pan.y) / zoom - 60;

        const id = uid();

        setElements((prev) => ({
          ...prev,
          [id]: {
            id,
            type: "sticky",
            content: "",
            color: stickyColor,
            position: { x, y },
            size: { width: 180, height: 120 },
            clusterId: null,
            createdAt: Date.now(),
          },
        }));

        setSelectedIds([id]);
        setActiveTool("select");
        toast.success("Sticky note created");
        return;
      }

      if (activeTool === "cluster") {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        const x = (e.clientX - rect.left - pan.x) / zoom;
        const y = (e.clientY - rect.top - pan.y) / zoom;

        const id = uid();
        const colorIndex = clusters.length % CLUSTER_COLORS.length;

        setElements((prev) => ({
          ...prev,
          [id]: {
            id,
            type: "cluster",
            title: "New Cluster",
            position: { x, y },
            size: { width: 500, height: 350 },
            color: CLUSTER_COLORS[colorIndex],
          },
        }));

        setSelectedIds([id]);
        setActiveTool("select");
        toast.success("Cluster created");
        return;
      }

      setSelectedIds([]);
    },
    [activeTool, stickyColor, pan, zoom, clusters.length]
  );

  const handleCanvasWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();

    if (e.ctrlKey || e.metaKey) {
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom((prev) => Math.min(3, Math.max(0.25, prev * delta)));
    } else {
      setPan((prev) => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY,
      }));
    }
  }, []);

  const handleGlobalPointerMove = useCallback(
    (e: PointerEvent) => {
      if (isPanning && panStartRef.current) {
        const dx = e.clientX - panStartRef.current.x;
        const dy = e.clientY - panStartRef.current.y;
        setPan({
          x: panStartRef.current.pan.x + dx,
          y: panStartRef.current.pan.y + dy,
        });
      }
    },
    [isPanning]
  );

  const handleGlobalPointerUp = useCallback(() => {
    setIsPanning(false);
    panStartRef.current = null;
  }, []);

  useEffect(() => {
    window.addEventListener("pointermove", handleGlobalPointerMove);
    window.addEventListener("pointerup", handleGlobalPointerUp);
    return () => {
      window.removeEventListener("pointermove", handleGlobalPointerMove);
      window.removeEventListener("pointerup", handleGlobalPointerUp);
    };
  }, [handleGlobalPointerMove, handleGlobalPointerUp]);

  const handleSelect = useCallback((id: string, multi?: boolean) => {
    if (multi) {
      setSelectedIds((prev) =>
        prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
      );
    } else {
      setSelectedIds([id]);
    }
  }, []);

  const handleStickyUpdate = useCallback((id: string, patch: Partial<StickyNote>) => {
    setElements((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...patch } as AffinityElement,
    }));
  }, []);

  const handleClusterUpdate = useCallback((id: string, patch: Partial<Cluster>) => {
    setElements((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...patch } as AffinityElement,
    }));
  }, []);

  const handleDelete = useCallback((id: string) => {
    setElements((prev) => {
      const newElements = { ...prev };
      
      const deleted = newElements[id];
      if (deleted?.type === "cluster") {
        Object.values(newElements).forEach((el) => {
          if (el.type === "sticky" && (el as StickyNote).clusterId === id) {
            (el as StickyNote).clusterId = null;
          }
        });
      }
      
      delete newElements[id];
      return newElements;
    });
    setSelectedIds((prev) => prev.filter((i) => i !== id));
    toast.success("Deleted");
  }, []);

  const handleStickyDrag = useCallback((id: string, dx: number, dy: number) => {
    const roundedDx = Math.round(dx);
    const roundedDy = Math.round(dy);
    
    setElements((prev) => {
      const sticky = prev[id];
      if (!sticky || sticky.type !== "sticky") return prev;

      return {
        ...prev,
        [id]: {
          ...sticky,
          position: {
            x: sticky.position.x + roundedDx,
            y: sticky.position.y + roundedDy,
          },
        } as StickyNote,
      };
    });
  }, []);

  const handleClusterDrag = useCallback((id: string, dx: number, dy: number) => {
    const roundedDx = Math.round(dx);
    const roundedDy = Math.round(dy);
    
    if (roundedDx === 0 && roundedDy === 0) return;
    
    setElements((prev) => {
      const cluster = prev[id];
      if (!cluster || cluster.type !== "cluster") return prev;

      return {
        ...prev,
        [id]: {
          ...cluster,
          position: {
            x: cluster.position.x + roundedDx,
            y: cluster.position.y + roundedDy,
          },
        } as Cluster,
      };
    });
  }, []);

  const handleDragEnd = useCallback(() => {
    setElements((prev) => {
      const newElements = { ...prev };
      let hasChanges = false;

      Object.values(newElements).forEach((element) => {
        if (element.type === "sticky") {
          const sticky = element as StickyNote;
          
          for (const cluster of Object.values(newElements).filter((el): el is Cluster => el.type === "cluster")) {
            const inCluster =
              sticky.position.x >= cluster.position.x &&
              sticky.position.x + sticky.size.width <= cluster.position.x + cluster.size.width &&
              sticky.position.y >= cluster.position.y &&
              sticky.position.y + sticky.size.height <= cluster.position.y + cluster.size.height;

            if (inCluster && !sticky.clusterId) {
              hasChanges = true;
              (element as StickyNote).clusterId = cluster.id;
              break;
            } else if (!inCluster && sticky.clusterId === cluster.id) {
              hasChanges = true;
              (element as StickyNote).clusterId = null;
              break;
            }
          }
        }
      });

      return hasChanges ? newElements : prev;
    });
  }, []);

  const handleClearAll = useCallback(() => {
    if (confirm("Are you sure you want to delete all elements?")) {
      setElements({});
      setSelectedIds([]);
      toast.success("Canvas cleared");
    }
  }, []);

  const handleExport = useCallback(() => {
    const data = {
      clusters: clusters.map((c) => ({
        id: c.id,
        title: c.title,
        position: c.position,
        size: c.size,
        color: c.color,
      })),
      stickies: stickies.map((s) => ({
        id: s.id,
        content: s.content,
        color: s.color,
        position: s.position,
        clusterId: s.clusterId,
      })),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `affinity-map-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success("Exported!");
  }, [clusters, stickies]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-muted/30 select-none"
      style={{
        cursor: isPanning
          ? "grabbing"
          : activeTool === "select"
          ? "default"
          : "crosshair",
      }}
      onPointerDown={handleCanvasPointerDown}
      onWheel={handleCanvasWheel}
    >
      <Toolbar
        activeTool={activeTool}
        onToolChange={setActiveTool}
        stickyColor={stickyColor}
        onStickyColorChange={setStickyColor}
        onClearAll={handleClearAll}
        onExport={handleExport}
      />

      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, var(--border) 1px, transparent 1px),
            linear-gradient(to bottom, var(--border) 1px, transparent 1px)
          `,
          backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      />

      <div
        className="absolute origin-top-left"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        }}
      >
        {clusters.map((cluster) => (
          <ClusterComponent
            key={cluster.id}
            cluster={cluster}
            isSelected={selectedIds.includes(cluster.id)}
            onSelect={handleSelect}
            onUpdate={handleClusterUpdate}
            onDelete={handleDelete}
            onDragStart={() => {}}
            onDragEnd={handleDragEnd}
            onDrag={(dx, dy) => handleClusterDrag(cluster.id, dx, dy)}
            stickies={getClusterStickies(cluster.id)}
            zoom={zoom}
            onStickySelect={handleSelect}
            onStickyUpdate={handleStickyUpdate}
            onStickyDelete={handleDelete}
            onStickyDrag={handleStickyDrag}
            onStickyDragEnd={handleDragEnd}
          />
        ))}

        {ungroupedStickies.map((sticky) => (
          <div
            key={sticky.id}
            className="absolute group select-none"
            style={{
              left: sticky.position.x,
              top: sticky.position.y,
            }}
          >
            <StickyNoteComponent
              note={sticky}
              isSelected={selectedIds.includes(sticky.id)}
              onSelect={handleSelect}
              onUpdate={handleStickyUpdate}
              onDelete={handleDelete}
              onDragStart={() => {}}
              onDragEnd={handleDragEnd}
              onDrag={handleStickyDrag}
              zoom={zoom}
            />
          </div>
        ))}
      </div>

      <div className="absolute bottom-4 right-4 flex items-center gap-2 z-50">
        <Button variant="outline" size="sm" onClick={() => setZoom((z) => Math.min(3, z * 1.2))}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="11" y1="8" x2="11" y2="14" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>
        </Button>
        <div className="px-3 py-1 bg-background border border-border rounded-md text-sm font-medium">
          {Math.round(zoom * 100)}%
        </div>
        <Button variant="outline" size="sm" onClick={() => setZoom((z) => Math.max(0.25, z / 1.2))}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
        >
          Reset
        </Button>
      </div>

      <div className="absolute bottom-4 left-4 z-50 flex items-center gap-4 text-xs text-muted-foreground">
        <span>{stickies.length} stickies</span>
        <span>{clusters.length} clusters</span>
        <span className="text-muted-foreground/60">
          {activeTool === "select"
            ? "Click to select • Drag to move • Right-click to delete"
            : activeTool === "sticky"
            ? "Click to create sticky"
            : "Click to create cluster"}
        </span>
      </div>
    </div>
  );
}

export default AffinityCanvas;
