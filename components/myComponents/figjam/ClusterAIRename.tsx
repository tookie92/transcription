"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Sparkles, Loader2, Check, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

interface ClusterAIRenameProps {
  isOpen: boolean;
  onClose: () => void;
  clusterId: string;
  clusterTitle: string;
  stickyTexts: string[];
  onRename: (clusterId: string, newName: string) => void;
  onNeedConsent?: () => void;
}

interface Suggestion {
  title: string;
  reason: string;
  category: string;
}

export function ClusterAIRename({
  isOpen,
  onClose,
  clusterId,
  clusterTitle,
  stickyTexts,
  onRename,
  onNeedConsent,
}: ClusterAIRenameProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [customName, setCustomName] = useState("");

  // Credits & GDPR
  const userCredits = useQuery(api.credits.getUserCredits);
  const userConsent = useQuery(api.credits.getConsent);
  const deductCredits = useMutation(api.credits.deductCredits);
  const initializeCredits = useMutation(api.credits.initializeCredits);

  const checkCredits = async () => {
    // Check GDPR consent first
    if (!userConsent) {
      onNeedConsent?.();
      return false;
    }

    try {
      await initializeCredits({});
    } catch {
      // Ignore init errors
    }

    const creditsData = userCredits || { credits: 150, costs: { transcription: 20, aiGrouping: 10, aiRename: 5 } };
    
    if (creditsData.credits < creditsData.costs.aiRename) {
      toast.error(`Not enough credits for AI rename. You need ${creditsData.costs.aiRename} credits but have ${creditsData.credits}.`);
      return false;
    }

    try {
      await deductCredits({ operation: "aiRename" });
      return true;
    } catch (e) {
      toast.error(`Not enough credits for AI rename.`);
      return false;
    }
  };

  useEffect(() => {
    if (isOpen && stickyTexts.length > 0) {
      fetchSuggestions();
    } else if (isOpen && stickyTexts.length === 0) {
      setIsLoading(false);
      generateFallback();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setSuggestions([]);
      setSelectedIndex(0);
      setCustomName("");
      setIsLoading(true);
    }
  }, [isOpen]);

  const fetchSuggestions = useCallback(async () => {
    // Check credits first
    const hasCredits = await checkCredits();
    if (!hasCredits) {
      setIsLoading(false);
      generateFallback();
      return;
    }

    setIsLoading(true);
    console.log("AI Rename: Fetching for cluster:", clusterId);

    try {
      const response = await fetch("/api/suggest-group-names", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          insights: stickyTexts.slice(0, 10).map((text) => ({ text, type: "insight" })),
          currentTitle: clusterTitle,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("AI Rename: Got suggestions:", data.suggestions);
        setSuggestions(data.suggestions || []);
        setSelectedIndex(0);
        setCustomName(data.suggestions?.[0]?.title || clusterTitle || "");
      } else {
        generateFallback();
      }
    } catch (err) {
      console.error("AI Rename: Error", err);
      generateFallback();
    } finally {
      setIsLoading(false);
    }
  }, [stickyTexts, clusterTitle, clusterId]);

  const generateFallback = () => {
    const words = stickyTexts
      .flatMap((t) => t.toLowerCase().split(/\s+/))
      .filter((w) => w.length > 3)
      .filter(
        (w) =>
          !["that", "this", "with", "have", "from", "the", "and", "are", "was", "were", "been", "being", "have", "has", "had", "not", "you", "your", "they", "them", "their", "what", "when", "where", "which", "will", "would", "could", "should", "just", "like", "really", "very", "also", "than", "then", "some", "any", "most", "more", "pour", "avec", "mais", "dans", "sur", "une", "les", "des"].includes(w)
      );

    const wordCount: Record<string, number> = {};
    words.forEach((w) => {
      wordCount[w] = (wordCount[w] || 0) + 1;
    });

    const topWords = Object.entries(wordCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1));

    const fallback: Suggestion[] = [
      {
        title: topWords.join(" / ") || clusterTitle || "New Cluster",
        reason: "Keywords from insights",
        category: "descriptive",
      },
    ];
    setSuggestions(fallback);
    setSelectedIndex(0);
    setCustomName(fallback[0]?.title);
  };

  const handleApply = () => {
    const nameToApply = customName.trim() || suggestions[selectedIndex]?.title || clusterTitle;
    
    if (!nameToApply) {
      toast.error("Please enter a name");
      return;
    }

    console.log("AI Rename: Applying -", nameToApply);
    onRename(clusterId, nameToApply);
    toast.success(`Renamed to "${nameToApply}"`);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "Enter" && !isLoading) {
      handleApply();
    } else if (e.key === "ArrowDown" && suggestions.length > 1) {
      e.preventDefault();
      const nextIndex = (selectedIndex + 1) % suggestions.length;
      setSelectedIndex(nextIndex);
      setCustomName(suggestions[nextIndex]?.title || "");
    } else if (e.key === "ArrowUp" && suggestions.length > 1) {
      e.preventDefault();
      const prevIndex = selectedIndex === 0 ? suggestions.length - 1 : selectedIndex - 1;
      setSelectedIndex(prevIndex);
      setCustomName(suggestions[prevIndex]?.title || "");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Rename with AI
          </DialogTitle>
          <DialogDescription>
            Analyzing {stickyTexts.length} insight{stickyTexts.length !== 1 ? "s" : ""} to suggest a name
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Loading state - show immediately */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Generating suggestions...</span>
            </div>
          ) : (
            <>
              {/* Suggestions */}
              {suggestions.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Suggested names:</label>
                  <div className="space-y-1.5">
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setSelectedIndex(index);
                          setCustomName(suggestion.title);
                        }}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                          selectedIndex === index
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50 hover:bg-accent"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <div className="mt-0.5">
                            {selectedIndex === index ? (
                              <Check className="w-4 h-4 text-primary" />
                            ) : (
                              <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{suggestion.title}</p>
                            <p className="text-xs text-muted-foreground">{suggestion.reason}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom name input */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Custom name:</label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Or type a custom name..."
                  className="w-full px-3 py-2 border border-input rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  autoFocus
                />
              </div>
            </>
          )}
        </div>

        <div className="flex justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSuggestions}
            disabled={isLoading}
            className="gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Regenerate
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleApply} disabled={isLoading || !customName.trim()}>
              Apply
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
