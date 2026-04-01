"use client";

import React, { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Plus, GripVertical, Search, X } from "lucide-react";
import type { StickyNoteData, StickyColor } from "@/types/figjam";

const STICKY_COLORS: Record<string, { bg: string; header: string; text: string; accent: string }> = {
  yellow:  { bg: "#FFF59D", header: "#FFF176", text: "#3E2723", accent: "#F9A825" },
  pink:    { bg: "#F8BBD9", header: "#F48FB1", text: "#4A148C", accent: "#E91E63" },
  green:   { bg: "#C8E6C9", header: "#A5D6A7", text: "#1B5E20", accent: "#43A047" },
  blue:    { bg: "#BBDEFB", header: "#90CAF9", text: "#0D47A1", accent: "#1976D2" },
  purple:  { bg: "#E1BEE7", header: "#CE93D8", text: "#4A148C", accent: "#8E24AA" },
  orange:  { bg: "#FFE0B2", header: "#FFCC80", text: "#E65100", accent: "#FB8C00" },
  white:   { bg: "#FAFAFA", header: "#EEEEEE", text: "#424242", accent: "#757575" },
  "pain-point":  { bg: "#FFCDD2", header: "#EF9A9A", text: "#B71C1C", accent: "#E53935" },
  "quote":       { bg: "#E1BEE7", header: "#CE93D8", text: "#4A148C", accent: "#8E24AA" },
  "insight":     { bg: "#C8E6C9", header: "#A5D6A7", text: "#1B5E20", accent: "#43A047" },
  "follow-up":   { bg: "#BBDEFB", header: "#90CAF9", text: "#0D47A1", accent: "#1976D2" },
};

const STICKY_TYPES: { id: StickyColor; label: string; desc: string }[] = [
  { id: "insight", label: "Insight", desc: "Key discovery" },
  { id: "pain-point", label: "Pain Point", desc: "Problem" },
  { id: "quote", label: "Quote", desc: "Quote" },
  { id: "follow-up", label: "Follow-up", desc: "To follow" },
];

interface InsightCardProps {
  sticky: StickyNoteData;
  onDragStart: (sticky: StickyNoteData) => void;
  isDragging?: boolean;
}

function InsightCard({ sticky, onDragStart, isDragging }: InsightCardProps) {
  const colors = STICKY_COLORS[sticky.color] || STICKY_COLORS.insight;
  
  return (
    <div
      className={cn(
        "relative rounded-xl cursor-grab active:cursor-grabbing transition-all duration-150",
        "hover:shadow-md group",
        isDragging && "opacity-50 scale-95"
      )}
      style={{
        backgroundColor: colors.bg,
        boxShadow: "0 2px 8px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)",
      }}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("application/sticky-id", sticky.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart(sticky);
      }}
    >
      <div className="flex items-start p-2.5 gap-2">
        <div className="shrink-0 mt-0.5 opacity-0 group-hover:opacity-40 transition-opacity">
          <GripVertical className="w-3.5 h-3.5" style={{ color: colors.text }} />
        </div>
        <div className="flex-1 min-w-0">
          <p 
            className="text-[11px] leading-relaxed line-clamp-4"
            style={{ color: colors.text }}
          >
            {sticky.content || "Empty insight"}
          </p>
          <div className="flex items-center justify-between mt-2">
            {sticky.authorName && (
              <p 
                className="text-[9px] opacity-50 truncate max-w-[80px]"
                style={{ color: colors.text }}
              >
                {sticky.authorName}
              </p>
            )}
            <div 
              className="w-2 h-2 rounded-full ml-auto opacity-60"
              style={{ backgroundColor: colors.header }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

interface CreateStickyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (content: string, color: StickyColor) => void;
}

function CreateStickyDialog({ open, onOpenChange, onCreate }: CreateStickyDialogProps) {
  const [content, setContent] = useState("");
  const [selectedColor, setSelectedColor] = useState<StickyColor>("insight");

  const handleSubmit = () => {
    if (content.trim()) {
      onCreate(content.trim(), selectedColor);
      setContent("");
      setSelectedColor("insight");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">New Insight</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block uppercase tracking-wide">Type</label>
            <div className="grid grid-cols-4 gap-2">
              {STICKY_TYPES.map((type) => {
                const colors = STICKY_COLORS[type.id];
                return (
                  <button
                    key={type.id}
                    onClick={() => setSelectedColor(type.id)}
                    className={cn(
                      "p-2 rounded-lg border-2 transition-all text-center",
                      selectedColor === type.id ? "border-[#1d1d1b]" : "border-transparent"
                    )}
                    style={{ backgroundColor: colors.bg }}
                  >
                    <div 
                      className="w-full h-1.5 rounded mb-1.5" 
                      style={{ backgroundColor: colors.header }}
                    />
                    <span className="text-[10px] font-semibold" style={{ color: colors.text }}>
                      {type.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block uppercase tracking-wide">Content</label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your insight..."
              className="min-h-[100px] resize-none text-sm"
              autoFocus
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!content.trim()}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface InsightsSidebarProps {
  ungroupedStickies: StickyNoteData[];
  onCreateSticky: (content: string, color: StickyColor) => string;
  onDragStart: (sticky: StickyNoteData) => void;
  draggingStickyId: string | null;
}

const SIDEBAR_HEIGHT = 520;

export function InsightsSidebar({
  ungroupedStickies,
  onCreateSticky,
  onDragStart,
  draggingStickyId,
}: InsightsSidebarProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredStickies = searchQuery 
    ? ungroupedStickies.filter(s => 
        s.content?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : ungroupedStickies;

  const handleCreate = (content: string, color: StickyColor) => {
    onCreateSticky(content, color);
  };

  return (
    <>
      {/* Sidebar */}
      <div
        className={cn(
          "fixed left-3 top-1/2 z-40",
          "-translate-y-1/2",
          "flex flex-col",
          "bg-white dark:bg-card",
          "rounded-2xl",
          "shadow-[0_4px_24px_rgba(0,0,0,0.12),0_1px_4px_rgba(0,0,0,0.06)]",
          "border border-[#e8e8e8] dark:border-border",
          "transition-all duration-300 ease-in-out",
          isOpen 
            ? "w-[272px] h-[610px] opacity-100 visible" 
            : "w-[272px] h-[52px] opacity-0 invisible"
        )}
      >
        {/* Header */}
        <div className="shrink-0 p-3 border-b border-[#e8e8e8] dark:border-border">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm text-[#1d1d1b] dark:text-foreground">Insights</h3>
              <p className="text-[10px] text-muted-foreground">
                {filteredStickies.length} / {ungroupedStickies.length}
              </p>
            </div>
            <Button
              size="sm"
              className="h-7 px-2.5 text-[11px] font-medium rounded-lg bg-[#1d1d1b] hover:bg-[#333] text-white dark:bg-primary dark:hover:bg-primary/90 dark:text-primary-foreground"
              onClick={() => setShowCreateDialog(true)}
            >
              <Plus className="w-3 h-3 mr-1" />
              Add
            </Button>
          </div>
        </div>
        
        {/* Search */}
        <div className="shrink-0 p-3 pb-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#bbb]" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs rounded-lg border-[#e8e8e8] dark:border-border bg-[#fafafa] dark:bg-muted/50 placeholder:text-[#bbb]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-[#eee] rounded"
              >
                <X className="w-3 h-3 text-[#999]" />
              </button>
            )}
          </div>
        </div>
        
        {/* Scrollable Content */}
        <ScrollArea className="flex-1 px-3 pb-3">
          <div className="space-y-2">
            {filteredStickies.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-10 h-10 rounded-xl bg-[#f5f5f5] dark:bg-muted flex items-center justify-center mb-3">
                  <svg className="w-5 h-5 text-[#999]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-xs text-[#666] dark:text-muted-foreground font-medium">
                  {searchQuery ? "No results" : "No insights yet"}
                </p>
                {!searchQuery && (
                  <p className="text-[10px] text-[#999] mt-1">Click {`Add`} to create</p>
                )}
              </div>
            ) : (
              filteredStickies.map((sticky) => (
                <InsightCard
                  key={sticky.id}
                  sticky={sticky}
                  onDragStart={onDragStart}
                  isDragging={draggingStickyId === sticky.id}
                />
              ))
            )}
          </div>
        </ScrollArea>
        
        {/* Footer Hint */}
        <div className="shrink-0 p-2 border-t border-[#e8e8e8] dark:border-border bg-[#fafafa] dark:bg-muted/50">
          <p className="text-[10px] text-[#999] dark:text-muted-foreground/70 text-center">
            Drag to clusters
          </p>
        </div>
      </div>

      <CreateStickyDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreate={handleCreate}
      />
    </>
  );
}
