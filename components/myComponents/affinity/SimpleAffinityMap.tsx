"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type StickyColor = "yellow" | "pink" | "green" | "blue";

interface Sticky {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  color: StickyColor;
}

interface Cluster {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  color: string;
}

const COLORS: Record<StickyColor, string> = {
  yellow: "#fef08a",
  pink: "#fbcfe8",
  green: "#bbf7d0",
  blue: "#bfdbfe",
};

const CLUSTER_COLORS = ["#8b5cf6", "#06b6d4", "#10b981", "#f59e0b"];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export default function SimpleAffinityMap() {
  const [stickies, setStickies] = useState<Sticky[]>([]);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tool, setTool] = useState<"select" | "sticky" | "cluster">("select");
  const [stickyColor, setStickyColor] = useState<StickyColor>("yellow");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; itemX: number; itemY: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (tool === "sticky") {
      const id = uid();
      setStickies((prev) => [...prev, {
        id,
        x: x - 100,
        y: y - 60,
        width: 200,
        height: 120,
        content: "",
        color: stickyColor,
      }]);
      setTool("select");
      toast.success("Sticky created");
      return;
    }
    
    if (tool === "cluster") {
      const id = uid();
      const colorIndex = clusters.length % CLUSTER_COLORS.length;
      setClusters((prev) => [...prev, {
        id,
        x: x - 250,
        y: y - 150,
        width: 500,
        height: 350,
        title: "New Group",
        color: CLUSTER_COLORS[colorIndex],
      }]);
      setTool("select");
      toast.success("Cluster created");
      return;
    }
    
    setSelectedId(null);
  }, [tool, stickyColor, clusters.length]);

  const handleStickyPointerDown = useCallback((e: React.PointerEvent, sticky: Sticky) => {
    e.stopPropagation();
    setSelectedId(sticky.id);
    
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      itemX: sticky.x,
      itemY: sticky.y,
    };
    setIsDragging(true);
  }, []);

  const handleClusterPointerDown = useCallback((e: React.PointerEvent, cluster: Cluster) => {
    e.stopPropagation();
    setSelectedId(cluster.id);
    
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      itemX: cluster.x,
      itemY: cluster.y,
    };
    setIsDragging(true);
  }, []);

  const handleDoubleClick = useCallback((e: React.MouseEvent, sticky: Sticky) => {
    e.stopPropagation();
    setEditingId(sticky.id);
    setEditContent(sticky.content);
  }, []);

  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      if (!dragRef.current || !isDragging) return;
      
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      
      const selected = [...stickies, ...clusters].find((s) => s.id === selectedId);
      if (!selected) return;
      
      if (stickies.some((s) => s.id === selectedId)) {
        setStickies((prev) =>
          prev.map((s) =>
            s.id === selectedId
              ? { ...s, x: dragRef.current!.itemX + dx, y: dragRef.current!.itemY + dy }
              : s
          )
        );
      } else {
        setClusters((prev) =>
          prev.map((c) =>
            c.id === selectedId
              ? { ...c, x: dragRef.current!.itemX + dx, y: dragRef.current!.itemY + dy }
              : c
          )
        );
      }
    };

    const handleUp = () => {
      dragRef.current = null;
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
    }

    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [isDragging, selectedId, stickies, clusters]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Delete" || e.key === "Backspace") {
      if (editingId) return;
      if (selectedId) {
        setStickies((prev) => prev.filter((s) => s.id !== selectedId));
        setClusters((prev) => prev.filter((c) => c.id !== selectedId));
        setSelectedId(null);
        toast.success("Deleted");
      }
    }
  }, [selectedId, editingId]);

  const finishEditing = useCallback(() => {
    if (editingId) {
      setStickies((prev) =>
        prev.map((s) => (s.id === editingId ? { ...s, content: editContent } : s))
      );
      setEditingId(null);
    }
  }, [editingId, editContent]);

  const handleExport = useCallback(() => {
    const data = { clusters, stickies };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `affinity-${Date.now()}.json`;
    a.click();
    toast.success("Exported!");
  }, [clusters, stickies]);

  const handleClear = useCallback(() => {
    if (confirm("Delete all?")) {
      setStickies([]);
      setClusters([]);
      setSelectedId(null);
    }
  }, []);

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className="relative w-full h-full bg-muted/30 outline-none overflow-hidden"
      style={{ cursor: tool === "sticky" || tool === "cluster" ? "crosshair" : "default" }}
      onPointerDown={handlePointerDown}
      onKeyDown={handleKeyDown}
    >
      {/* Toolbar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-background/95 backdrop-blur border border-border rounded-lg shadow-lg px-3 py-2">
        <Button
          variant={tool === "select" ? "default" : "ghost"}
          size="sm"
          onClick={() => setTool("select")}
        >
          Select
        </Button>
        <Button
          variant={tool === "sticky" ? "default" : "ghost"}
          size="sm"
          onClick={() => setTool("sticky")}
        >
          <div className="w-4 h-4 rounded-sm mr-1" style={{ backgroundColor: COLORS[stickyColor] }} />
          Sticky
        </Button>
        <Button
          variant={tool === "cluster" ? "default" : "ghost"}
          size="sm"
          onClick={() => setTool("cluster")}
        >
          Cluster
        </Button>
        <div className="border-l border-border pl-2 flex gap-1">
          <Button variant="ghost" size="sm" onClick={handleExport}>Export</Button>
          <Button variant="ghost" size="sm" onClick={handleClear} className="text-muted-foreground">Clear</Button>
        </div>
      </div>

      {/* Canvas */}
      <div className="absolute inset-0" style={{
        backgroundImage: "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }} />

      {/* Clusters */}
      {clusters.map((cluster) => (
        <div
          key={cluster.id}
          className="absolute rounded-xl"
          style={{
            left: cluster.x,
            top: cluster.y,
            width: cluster.width,
            height: cluster.height,
            border: `3px dashed ${selectedId === cluster.id ? cluster.color : cluster.color + "80"}`,
            backgroundColor: cluster.color + "10",
            zIndex: selectedId === cluster.id ? 10 : 0,
          }}
          onPointerDown={(e) => handleClusterPointerDown(e, cluster)}
        >
          <div className="absolute -top-8 left-0 flex items-center gap-2">
            <div
              className="h-7 px-3 flex items-center rounded-md bg-background shadow-md text-sm font-semibold"
              style={{ color: cluster.color }}
            >
              {cluster.title}
            </div>
            <div
              className="h-6 px-2 flex items-center rounded-full text-xs font-medium bg-background shadow-md"
              style={{ color: cluster.color }}
            >
              {stickies.filter((s) => 
                s.x >= cluster.x && s.x + s.width <= cluster.x + cluster.width &&
                s.y >= cluster.y && s.y + s.height <= cluster.y + cluster.height
              ).length}
            </div>
          </div>
        </div>
      ))}

      {/* Stickies */}
      {stickies.map((sticky) => (
        <div
          key={sticky.id}
          className="absolute rounded-lg shadow-md flex flex-col overflow-hidden"
          style={{
            left: sticky.x,
            top: sticky.y,
            width: sticky.width,
            height: sticky.height,
            backgroundColor: COLORS[sticky.color],
            border: selectedId === sticky.id ? `2px solid ${sticky.color === "yellow" ? "#eab308" : sticky.color === "pink" ? "#ec4899" : sticky.color === "green" ? "#22c55e" : "#3b82f6"}` : "2px solid transparent",
            zIndex: selectedId === sticky.id ? 100 : 1,
            cursor: isDragging && selectedId === sticky.id ? "grabbing" : "grab",
          }}
          onPointerDown={(e) => handleStickyPointerDown(e, sticky)}
          onDoubleClick={(e) => handleDoubleClick(e, sticky)}
        >
          {editingId === sticky.id ? (
            <textarea
              autoFocus
              className="flex-1 p-3 resize-none border-0 bg-transparent outline-none text-sm"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onBlur={finishEditing}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setEditingId(null);
                }
              }}
              onPointerDown={(e) => e.stopPropagation()}
            />
          ) : (
            <div className="flex-1 p-3 text-sm text-gray-800 overflow-hidden">
              {sticky.content || <span className="text-gray-400 italic">Double-click to edit</span>}
            </div>
          )}
        </div>
      ))}

      {/* Status */}
      <div className="absolute bottom-4 left-4 text-xs text-muted-foreground">
        {stickies.length} stickies • {clusters.length} clusters
      </div>
    </div>
  );
}
