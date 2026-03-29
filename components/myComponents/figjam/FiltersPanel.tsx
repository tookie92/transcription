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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
    <div className="fixed left-4 top-20 z-40 w-72 bg-card/95 backdrop-blur-sm rounded-xl shadow-lg border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Filters</span>
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {activeFilterCount}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={clearAllFilters}
            >
              Clear all
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="p-3 space-y-4 max-h-[70vh] overflow-y-auto">
        {/* Search */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground uppercase">
            Search
          </Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search stickies..."
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
              className="pl-9 h-9"
            />
          </div>
        </div>

        <Separator />

        {/* Sticky Types */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1.5">
            <StickyNote className="w-3 h-3" />
            Sticky Type
          </Label>
          <div className="grid grid-cols-2 gap-1.5">
            {stickyTypes.map((type) => (
              <button
                key={type}
                onClick={() => toggleType(type)}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedTypes.has(type)
                    ? "bg-primary/10 text-primary border border-primary/30"
                    : "bg-muted/50 hover:bg-muted text-muted-foreground"
                }`}
              >
                <div className={`w-2.5 h-2.5 rounded-sm ${
                  type === "pain-point" ? "bg-rose-400" :
                  type === "quote" ? "bg-blue-400" :
                  type === "insight" ? "bg-amber-400" :
                  "bg-emerald-400"
                }`} />
                {type.replace("-", " ")}
              </button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Authors */}
        {authors.length > 0 && (
          <>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1.5">
                <User className="w-3 h-3" />
                Authors
              </Label>
              <div className="space-y-1">
                {authors.slice(0, 5).map((author) => (
                  <button
                    key={author.name}
                    onClick={() => toggleAuthor(author.name)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                      selectedAuthors.has(author.name)
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted/50 text-muted-foreground"
                    }`}
                  >
                    <span className="truncate">{author.name}</span>
                    <Badge variant="secondary" className="text-[10px] h-4">
                      {author.count}
                    </Badge>
                  </button>
                ))}
                {authors.length > 5 && (
                  <p className="text-[10px] text-muted-foreground text-center py-1">
                    +{authors.length - 5} more
                  </p>
                )}
              </div>
            </div>

            <Separator />
          </>
        )}

        {/* Canvas Options */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1.5">
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
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                showResolved
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-muted/50 text-muted-foreground"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3" />
                Afficher résolus
              </span>
              {showResolved && <span className="text-[10px] opacity-60">✓</span>}
            </button>
            <div className="flex items-center justify-between px-2.5 py-1 text-xs text-muted-foreground">
              <span>{commentCount - resolvedCommentCount} ouverts</span>
              <span>{resolvedCommentCount} résolus</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Ungrouped Stickies */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1.5">
            <StickyNote className="w-3 h-3" />
            Stickies non groupés
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
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all ${
              showUngrouped
                ? "bg-primary/10 text-primary"
                : "hover:bg-muted/50 text-muted-foreground"
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
    </div>
  );
}

interface FiltersButtonProps {
  filterCount: number;
  onClick: () => void;
}

export function FiltersButton({ filterCount, onClick }: FiltersButtonProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 rounded-xl bg-card hover:bg-accent border border-border shadow-sm"
          onClick={onClick}
        >
          <Filter className="w-4 h-4" />
          <span className="text-sm font-medium">Filters</span>
          {filterCount > 0 && (
            <Badge variant="default" className="text-xs h-5 min-w-[20px] justify-center">
              {filterCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
    </Popover>
  );
}
