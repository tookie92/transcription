"use client";

import React, { useState, useMemo } from "react";
import { 
  Filter, 
  Search, 
  X, 
  Eye, 
  EyeOff,
  User,
  StickyNote,
  CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { StickyColor, StickyNoteData } from "@/types/figjam";

interface FiltersPanelProps {
  isOpen: boolean;
  onClose: () => void;
  stickies: StickyNoteData[];
  commentCount?: number;
  resolvedCommentCount?: number;
  onFiltersChange?: (filters: FilterState) => void;
  initialFilters?: Partial<FilterState>;
}

export interface FilterState {
  searchQuery: string;
  stickyTypes: StickyColor[];
  authors: string[];
  showResolvedComments: boolean;
  showUngrouped: boolean;
}

interface AuthorFilter {
  name: string;
  count: number;
}

export function FiltersPanel({
  isOpen,
  onClose,
  stickies,
  commentCount = 0,
  resolvedCommentCount = 0,
  onFiltersChange,
}: FiltersPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<Set<StickyColor>>(new Set());
  const [selectedAuthors, setSelectedAuthors] = useState<Set<string>>(new Set());
  const [showResolved, setShowResolved] = useState(true);
  const [showUngrouped, setShowUngrouped] = useState(true);

  const stickyTypes: StickyColor[] = ["pain-point", "quote", "insight", "follow-up"];

  const authors = useMemo<AuthorFilter[]>(() => {
    const authorCounts = new Map<string, number>();
    stickies.forEach((sticky) => {
      const author = sticky.authorName || sticky.author || "Unknown";
      if (author && author !== "Unknown") {
        authorCounts.set(author, (authorCounts.get(author) || 0) + 1);
      }
    });
    return Array.from(authorCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [stickies]);

  const toggleType = (type: StickyColor) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      notifyChange({
        searchQuery,
        stickyTypes: Array.from(next),
        authors: Array.from(selectedAuthors),
        showResolvedComments: showResolved,
        showUngrouped,
      });
      return next;
    });
  };

  const toggleAuthor = (author: string) => {
    setSelectedAuthors((prev) => {
      const next = new Set(prev);
      if (next.has(author)) {
        next.delete(author);
      } else {
        next.add(author);
      }
      notifyChange({
        searchQuery,
        stickyTypes: Array.from(selectedTypes),
        authors: Array.from(next),
        showResolvedComments: showResolved,
        showUngrouped,
      });
      return next;
    });
  };

  const notifyChange = (filters: FilterState) => {
    onFiltersChange?.(filters);
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedTypes(new Set());
    setSelectedAuthors(new Set());
    setShowResolved(true);
    setShowUngrouped(true);
    notifyChange({
      searchQuery: "",
      stickyTypes: [],
      authors: [],
      showResolvedComments: true,
      showUngrouped: true,
    });
  };

  const hasActiveFilters =
    searchQuery.length > 0 ||
    selectedTypes.size > 0 ||
    selectedAuthors.size > 0 ||
    !showResolved ||
    !showUngrouped;

  const activeFilterCount = 
    (searchQuery.length > 0 ? 1 : 0) +
    selectedTypes.size +
    selectedAuthors.size +
    (!showResolved ? 1 : 0) +
    (!showUngrouped ? 1 : 0);

  if (!isOpen) return null;

  return (
    <div className="fixed left-4 top-20 z-40 w-72 bg-white dark:bg-card rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.12),0_1px_4px_rgba(0,0,0,0.06)] border border-[#e8e8e8] dark:border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#e8e8e8] dark:border-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#f5f5f5] dark:bg-muted flex items-center justify-center">
            <Filter className="w-3.5 h-3.5 text-[#666] dark:text-muted-foreground" />
          </div>
          <span className="text-sm font-semibold text-[#1d1d1b] dark:text-foreground">Filters</span>
          {activeFilterCount > 0 && (
            <Badge className="text-[10px] h-5 min-w-[20px] justify-center bg-[#1d1d1b] dark:bg-primary text-white dark:text-primary-foreground">
              {activeFilterCount}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-[#666] hover:text-[#1d1d1b] hover:bg-[#f5f5f5] dark:text-muted-foreground dark:hover:text-foreground dark:hover:bg-accent"
              onClick={clearAllFilters}
            >
              Clear all
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg hover:bg-[#f5f5f5] dark:hover:bg-accent"
            onClick={onClose}
          >
            <X className="w-4 h-4 text-[#999] dark:text-muted-foreground" />
          </Button>
        </div>
      </div>

      <ScrollArea className="max-h-[60vh]">
        <div className="p-3 space-y-4">
          {/* Search */}
          <div className="space-y-2">
            <Label className="text-[10px] font-semibold text-[#999] dark:text-muted-foreground uppercase tracking-wide">
              Search
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#bbb]" />
              <Input
                placeholder="Search insights..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  notifyChange({
                    searchQuery: e.target.value,
                    stickyTypes: Array.from(selectedTypes),
                    authors: Array.from(selectedAuthors),
                    showResolvedComments: showResolved,
                    showUngrouped,
                  });
                }}
                className="pl-9 h-9 rounded-lg border-[#e8e8e8] dark:border-border bg-[#fafafa] dark:bg-muted/50 text-sm placeholder:text-[#bbb]"
              />
            </div>
          </div>

          <Separator className="bg-[#f0f0f0] dark:bg-border" />

          {/* Sticky Types */}
          <div className="space-y-2">
            <Label className="text-[10px] font-semibold text-[#999] dark:text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <StickyNote className="w-3 h-3" />
              Type
            </Label>
            <div className="grid grid-cols-2 gap-1.5">
              {stickyTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => toggleType(type)}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-all ${
                    selectedTypes.has(type)
                      ? "bg-[#1d1d1b] dark:bg-primary text-white dark:text-primary-foreground"
                      : "bg-[#f5f5f5] dark:bg-muted hover:bg-[#eee] dark:hover:bg-accent text-[#666] dark:text-muted-foreground"
                  }`}
                >
                  <div className={`w-2.5 h-2.5 rounded-sm ${
                    type === "pain-point" ? "bg-[#FFCDD2]" :
                    type === "quote" ? "bg-[#E1BEE7]" :
                    type === "insight" ? "bg-[#C8E6C9]" :
                    "bg-[#BBDEFB]"
                  }`} />
                  {type.replace("-", " ")}
                </button>
              ))}
            </div>
          </div>

          <Separator className="bg-[#f0f0f0] dark:bg-border" />

          {/* Authors */}
          {authors.length > 0 && (
            <>
              <div className="space-y-2">
                <Label className="text-[10px] font-semibold text-[#999] dark:text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <User className="w-3 h-3" />
                  Authors
                </Label>
                <div className="space-y-1">
                  {authors.slice(0, 5).map((author) => (
                    <button
                      key={author.name}
                      onClick={() => toggleAuthor(author.name)}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-all ${
                          selectedAuthors.has(author.name)
                            ? "bg-[#1d1d1b] dark:bg-primary text-white dark:text-primary-foreground"
                            : "hover:bg-[#f5f5f5] dark:hover:bg-accent text-[#666] dark:text-muted-foreground"
                      }`}
                    >
                      <span className="truncate">{author.name}</span>
                      <Badge variant="secondary" className="text-[10px] h-4 bg-[#eee] dark:bg-muted text-[#999] dark:text-muted-foreground">
                        {author.count}
                      </Badge>
                    </button>
                  ))}
                  {authors.length > 5 && (
                    <p className="text-[10px] text-[#999] dark:text-muted-foreground text-center py-1">
                      +{authors.length - 5} more
                    </p>
                  )}
                </div>
              </div>

              <Separator className="bg-[#f0f0f0] dark:bg-border" />
            </>
          )}

          {/* Canvas Options */}
          <div className="space-y-2">
            <Label className="text-[10px] font-semibold text-[#999] dark:text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Eye className="w-3 h-3" />
              Canvas
            </Label>
            <div className="space-y-1">
              <button
                onClick={() => {
                  setShowResolved(!showResolved);
                  notifyChange({
                    searchQuery,
                    stickyTypes: Array.from(selectedTypes),
                    authors: Array.from(selectedAuthors),
                    showResolvedComments: !showResolved,
                    showUngrouped,
                  });
                }}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-all ${
                  showResolved
                    ? "bg-[#1d1d1b] dark:bg-primary text-white dark:text-primary-foreground"
                    : "hover:bg-[#f5f5f5] dark:hover:bg-accent text-[#666] dark:text-muted-foreground"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3" />
                  Afficher résolus
                </span>
                {showResolved && <span className="text-[10px] opacity-60">✓</span>}
              </button>
              <div className="flex items-center justify-between px-2.5 py-1.5 text-[11px] text-[#999] dark:text-muted-foreground bg-[#fafafa] dark:bg-muted/50 rounded-lg">
                <span>{commentCount - resolvedCommentCount} ouverts</span>
                <span>{resolvedCommentCount} résolus</span>
              </div>
            </div>
          </div>

          <Separator className="bg-[#f0f0f0] dark:bg-border" />

          {/* Ungrouped Stickies */}
          <div className="space-y-2">
            <Label className="text-[10px] font-semibold text-[#999] dark:text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <StickyNote className="w-3 h-3" />
              Non groupés
            </Label>
            <button
              onClick={() => {
                setShowUngrouped(!showUngrouped);
                notifyChange({
                  searchQuery,
                  stickyTypes: Array.from(selectedTypes),
                  authors: Array.from(selectedAuthors),
                  showResolvedComments: showResolved,
                  showUngrouped: !showUngrouped,
                });
              }}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-all ${
                showUngrouped
                  ? "bg-[#1d1d1b] dark:bg-primary text-white dark:text-primary-foreground"
                  : "hover:bg-[#f5f5f5] dark:hover:bg-accent text-[#666] dark:text-muted-foreground"
              }`}
            >
              <span>Afficher les non groupés</span>
              {showUngrouped ? (
                <Eye className="w-3 h-3" />
              ) : (
                <EyeOff className="w-3 h-3" />
              )}
            </button>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
