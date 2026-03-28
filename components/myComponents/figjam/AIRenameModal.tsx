"use client";

import { useState, useEffect, useRef } from "react";
import { Sparkles, Loader2, Check, X, ArrowRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface NameSuggestion {
  title: string;
  reason: string;
  confidence: number;
  category: "descriptive" | "actionable" | "thematic" | "problem-focused";
}

interface AIRenameModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentName: string;
  insights: Array<{ text: string; type: string }>;
  projectContext?: string;
  onApplyName: (newName: string) => void;
}

const CATEGORY_LABELS: Record<NameSuggestion["category"], { label: string; color: string }> = {
  descriptive: { label: "Descriptive", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  actionable: { label: "Actionable", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  thematic: { label: "Thematic", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  "problem-focused": { label: "Problem", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function AIRenameModal({
  isOpen,
  onClose,
  currentName,
  insights,
  projectContext,
  onApplyName,
}: AIRenameModalProps) {
  const [suggestions, setSuggestions] = useState<NameSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [fromCache, setFromCache] = useState(false);
  
  const cachedSuggestionsRef = useRef<NameSuggestion[]>([]);
  const lastFetchTimeRef = useRef<number>(0);
  const lastInsightsHashRef = useRef<string>("");

  // Auto-load cached suggestions when modal opens
  useEffect(() => {
    if (isOpen && cachedSuggestionsRef.current.length > 0) {
      const cacheAge = Date.now() - lastFetchTimeRef.current;
      // Check if insights haven't changed
      const currentHash = insights.map(i => i.text).join("|");
      if (cacheAge < CACHE_DURATION && currentHash === lastInsightsHashRef.current) {
        setSuggestions(cachedSuggestionsRef.current);
        setFromCache(true);
        setSelectedIndex(null);
      }
    }
  }, [isOpen, insights]);

  const fetchSuggestions = async (forceRefresh = false) => {
    // Check cache first
    if (!forceRefresh && cachedSuggestionsRef.current.length > 0) {
      const cacheAge = Date.now() - lastFetchTimeRef.current;
      const currentHash = insights.map(i => i.text).join("|");
      if (cacheAge < CACHE_DURATION && currentHash === lastInsightsHashRef.current) {
        setSuggestions(cachedSuggestionsRef.current);
        setFromCache(true);
        setSelectedIndex(null);
        toast.success("Loaded cached suggestions");
        return;
      }
    }

    setIsLoading(true);
    setFromCache(false);
    setSuggestions([]);
    setSelectedIndex(null);

    try {
      const response = await fetch("/api/suggest-group-names", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          insights,
          currentTitle: currentName,
          projectContext,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch suggestions");
      }

      const data = await response.json();
      
      // Cache the suggestions
      cachedSuggestionsRef.current = data.suggestions || [];
      lastFetchTimeRef.current = Date.now();
      lastInsightsHashRef.current = insights.map(i => i.text).join("|");
      
      setSuggestions(data.suggestions || []);

      if (!data.suggestions?.length) {
        toast.error("No suggestions available");
      } else {
        toast.success(`Got ${data.suggestions.length} suggestions`);
      }
    } catch {
      toast.error("Failed to generate suggestions");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = (suggestion: NameSuggestion) => {
    onApplyName(suggestion.title);
    toast.success(`Renamed to "${suggestion.title}"`);
    onClose();
  };

  const handleClose = () => {
    setSuggestions([]);
    setSelectedIndex(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles size={18} className="text-violet-500" />
            AI Rename Suggestions
          </DialogTitle>
          <DialogDescription>
            Get AI-powered name suggestions based on the insights in this cluster
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Current name */}
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Current name</p>
            <p className="font-medium text-foreground">{currentName || "Untitled"}</p>
          </div>

          {/* Insights preview */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground mb-2">
              Analyzing {insights.length} insight{insights.length !== 1 ? "s" : ""}
            </p>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {insights.slice(0, 4).map((insight, i) => (
                <p key={i} className="text-xs text-muted-foreground truncate">
                  {insight.text}
                </p>
              ))}
              {insights.length > 4 && (
                <p className="text-xs text-muted-foreground">
                  +{insights.length - 4} more...
                </p>
              )}
            </div>
          </div>

          {/* Generate button */}
          {!suggestions.length && !isLoading && (
            <Button onClick={() => fetchSuggestions()} className="w-full">
              <Sparkles size={16} className="mr-2" />
              Generate Suggestions
            </Button>
          )}

          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Analyzing insights...</span>
            </div>
          )}

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">
                    {suggestions.length} suggestions
                  </p>
                  {fromCache && (
                    <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                      Cached
                    </Badge>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={() => fetchSuggestions(true)}>
                  <RefreshCw size={14} className="mr-1" />
                  New Request
                </Button>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedIndex(index)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selectedIndex === index
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="font-medium text-foreground">{suggestion.title}</p>
                      <Badge
                        variant="secondary"
                        className={`text-xs shrink-0 ${CATEGORY_LABELS[suggestion.category].color}`}
                      >
                        {CATEGORY_LABELS[suggestion.category].label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {suggestion.reason}
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${suggestion.confidence * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {Math.round(suggestion.confidence * 100)}%
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={handleClose} className="flex-1">
                  <X size={16} className="mr-1" />
                  Cancel
                </Button>
                <Button
                  onClick={() => selectedIndex !== null && handleApply(suggestions[selectedIndex])}
                  disabled={selectedIndex === null}
                  className="flex-1"
                >
                  <Check size={16} className="mr-1" />
                  Apply
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
