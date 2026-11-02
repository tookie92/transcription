"use client";

import React, { useMemo, useState } from "react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Plus, Search, X, Filter, Check, Trash2 } from "lucide-react";
import type { StickyNoteData, StickyColor } from "@/types/figjam";
import { SlipFace, SlipStamp, slipKindOf } from "@/components/myComponents/affinity/SlipFace";
import { SLIP_KINDS, slipTilt, type SlipKind } from "@/lib/slip";

type FilterType = "all" | SlipKind;

interface InsightCardProps {
  sticky: StickyNoteData;
  onDragStart: (sticky: StickyNoteData) => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
  canDelete?: boolean;
  onDelete?: (stickyId: string) => void;
  onClick?: (stickyId: string) => void;
}

function InsightCard({ sticky, onDragStart, onDragEnd, isDragging, canDelete = false, onDelete, onClick }: InsightCardProps) {
  const kind = slipKindOf(sticky.color, sticky.source);

  return (
    <div
      className={cn(
        "relative group cursor-grab active:cursor-grabbing",
        isDragging && "opacity-50"
      )}
      draggable={true}
      onDragStart={(e) => {
        e.dataTransfer.setData("application/sticky-id", sticky.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart(sticky);
      }}
      onDragEnd={() => onDragEnd?.()}
      onClick={() => onClick?.(sticky.id)}
    >
      {canDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete?.(sticky.id);
          }}
          className="absolute top-1 right-1 z-10 p-1 opacity-0 group-hover:opacity-100 transition-transform duration-150 ease-out active:scale-[0.97]"
          aria-label="Remove slip"
        >
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      )}
      <SlipFace
        kind={kind}
        dragging={isDragging}
        className="p-3"
        style={{ transform: `rotate(${slipTilt(sticky.id)}deg)` }}
      >
        <SlipStamp kind={kind} />
        <p
          className={cn(
            "text-xs leading-relaxed line-clamp-4 mt-1",
            kind === "quote" && "italic"
          )}
        >
          {sticky.content || "Empty"}
        </p>
      </SlipFace>
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
  const [selectedKind, setSelectedKind] = useState<SlipKind>("quote");

  const handleSubmit = () => {
    if (content.trim()) {
      onCreate(content.trim(), selectedKind);
      setContent("");
      setSelectedKind("quote");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-mono text-xs tracking-widest uppercase">
            New slip
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center gap-1 border border-border p-1">
            {SLIP_KINDS.map((kind) => (
              <Button
                key={kind.id}
                type="button"
                size="sm"
                variant="ghost"
                className={cn(
                  "h-8 flex-1 font-mono text-[11px] tracking-widest uppercase transition-transform duration-150 ease-out active:scale-[0.97]",
                  selectedKind === kind.id && "bg-accent"
                )}
                onClick={() => setSelectedKind(kind.id)}
              >
                <span className="text-muted-foreground mr-1.5">{kind.key}</span>
                {kind.label}
              </Button>
            ))}
          </div>

          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="The line that belongs on the table"
            className="min-h-[100px] resize-none text-sm"
            autoFocus
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!content.trim()}
            className="font-mono text-[11px] uppercase tracking-widest"
          >
            Add to tray
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
  onDragEnd?: () => void;
  draggingStickyId: string | null;
  currentUserId?: string;
  currentUserName?: string;
  onDeleteSticky?: (stickyId: string) => void;
  onCleanDrafts?: (stickyIds: string[]) => void;
  sittingFilter?: boolean;
  onSlipClick?: (stickyId: string) => void;
}

export function InsightsSidebar({
  ungroupedStickies,
  onCreateSticky,
  onDragStart,
  onDragEnd,
  draggingStickyId,
  currentUserName,
  onDeleteSticky,
  onCleanDrafts,
  sittingFilter = false,
  onSlipClick,
}: InsightsSidebarProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [filterAuthor, setFilterAuthor] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const draftStickies = useMemo(() => {
    return ungroupedStickies.filter((s) => !s.content?.trim());
  }, [ungroupedStickies]);
  const draftCount = draftStickies.length;

  const authors = useMemo(() => {
    const authorSet = new Set<string>();
    ungroupedStickies.forEach((s) => {
      if (s.authorName) authorSet.add(s.authorName);
    });
    return Array.from(authorSet).sort();
  }, [ungroupedStickies]);

  const filteredStickies = useMemo(() => {
    return ungroupedStickies.filter((s) => {
      if (searchQuery && !s.content?.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (filterType !== "all" && slipKindOf(s.color, s.source) !== filterType) {
        return false;
      }
      if (filterAuthor && s.authorName !== filterAuthor) {
        return false;
      }
      return true;
    });
  }, [ungroupedStickies, searchQuery, filterType, filterAuthor]);

  const hasActiveFilters = filterType !== "all" || filterAuthor !== null;
  const activeFilterCount = (filterType !== "all" ? 1 : 0) + (filterAuthor ? 1 : 0);

  const handleCreate = (content: string, color: StickyColor) => {
    onCreateSticky(content, color);
  };

  const clearFilters = () => {
    setFilterType("all");
    setFilterAuthor(null);
  };

  const count = filteredStickies.length;

  return (
    <>
      <div className="relative z-20 flex h-full w-72 shrink-0 flex-col border-r border-border bg-card">
        <div className="shrink-0 px-4 py-3 border-b border-border">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-mono text-[11px] tracking-widest uppercase text-muted-foreground">
                Still in the tray
              </p>
              <p className="text-sm mt-1">
                {count} {count === 1 ? "slip" : "slips"}
                {sittingFilter ? " this sitting" : ""}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {draftCount > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 font-mono text-[10px] tracking-widest uppercase"
                  onClick={() => {
                    if (confirm(`Delete ${draftCount} empty draft${draftCount > 1 ? "s" : ""}?`)) {
                      onCleanDrafts?.(draftStickies.map((s) => s.id));
                    }
                  }}
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Clean
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 font-mono text-[10px] tracking-widest uppercase transition-transform duration-150 ease-out active:scale-[0.97]"
                onClick={() => setShowCreateDialog(true)}
              >
                <Plus className="w-3 h-3 mr-1" />
                Add
              </Button>
            </div>
          </div>
        </div>

        <div className="shrink-0 p-3 pb-2">
          <div className="relative flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5"
                  aria-label="Clear search"
                >
                  <X className="w-3 h-3 text-muted-foreground" />
                </button>
              )}
            </div>

            <Popover open={showFilters} onOpenChange={setShowFilters}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn("h-8 px-2", hasActiveFilters && "bg-accent")}
                >
                  <Filter className="w-3.5 h-3.5" />
                  {activeFilterCount > 0 && (
                    <span className="ml-1 font-mono text-[10px]">{activeFilterCount}</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-0" align="end" sideOffset={4}>
                <div className="p-3 border-b border-border">
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-[11px] tracking-widest uppercase text-muted-foreground">
                      Filter
                    </p>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground hover:text-foreground"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-3 border-b border-border">
                  <p className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground mb-2">
                    Kind
                  </p>
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => setFilterType("all")}
                      className={cn(
                        "w-full text-left px-2 py-1.5 text-sm flex items-center justify-between",
                        filterType === "all" ? "bg-accent" : "hover:bg-accent"
                      )}
                    >
                      All
                      {filterType === "all" && <Check className="w-3.5 h-3.5" />}
                    </button>
                    {SLIP_KINDS.map((kind) => (
                      <button
                        key={kind.id}
                        type="button"
                        onClick={() => setFilterType(kind.id)}
                        className={cn(
                          "w-full text-left px-2 py-1.5 text-sm flex items-center justify-between",
                          filterType === kind.id ? "bg-accent" : "hover:bg-accent"
                        )}
                      >
                        <SlipStamp kind={kind.id} />
                        {filterType === kind.id && <Check className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                </div>

                {authors.length > 0 && (
                  <div className="p-3">
                    <p className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground mb-2">
                      Author
                    </p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      <button
                        type="button"
                        onClick={() => setFilterAuthor(null)}
                        className={cn(
                          "w-full text-left px-2 py-1.5 text-sm flex items-center justify-between",
                          filterAuthor === null ? "bg-accent" : "hover:bg-accent"
                        )}
                      >
                        All
                        {filterAuthor === null && <Check className="w-3.5 h-3.5" />}
                      </button>
                      {authors.map((author) => (
                        <button
                          key={author}
                          type="button"
                          onClick={() => setFilterAuthor(author)}
                          className={cn(
                            "w-full text-left px-2 py-1.5 text-sm flex items-center justify-between truncate",
                            filterAuthor === author ? "bg-accent" : "hover:bg-accent"
                          )}
                        >
                          <span className="truncate">{author}</span>
                          {filterAuthor === author && <Check className="w-3.5 h-3.5 shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <ScrollArea className="flex-1 min-h-0 px-3 pb-3">
          <div className="space-y-2 pr-2">
            {filteredStickies.length === 0 ? (
              <p className="text-sm text-muted-foreground px-1 py-8">
                {searchQuery || hasActiveFilters ? "No match." : "Empty."}
              </p>
            ) : (
              filteredStickies.map((sticky) => {
                const canDeleteThis = !!(
                  currentUserName &&
                  onDeleteSticky &&
                  sticky.authorName === currentUserName
                );
                return (
                  <InsightCard
                    key={sticky.id}
                    sticky={sticky}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                    isDragging={draggingStickyId === sticky.id}
                    canDelete={canDeleteThis}
                    onDelete={onDeleteSticky}
                    onClick={onSlipClick}
                  />
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>

      <CreateStickyDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreate={handleCreate}
      />
    </>
  );
}
