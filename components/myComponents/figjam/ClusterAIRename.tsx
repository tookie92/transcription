"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { useMutation, useQuery } from "convex/react";
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
  const autoRanRef = useRef(false);

  const userCredits = useQuery(api.credits.getUserCredits);
  const userConsent = useQuery(api.credits.getConsent);
  const deductCredits = useMutation(api.credits.deductCredits);
  const initializeCredits = useMutation(api.credits.initializeCredits);

  const generateFallback = useCallback(() => {
    const words = stickyTexts
      .flatMap((t) => t.toLowerCase().split(/\s+/))
      .filter((w) => w.length > 3);

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
        title: topWords.join(" / ") || clusterTitle || "Untitled",
        reason: "From the slips in this packet",
        category: "descriptive",
      },
    ];
    setSuggestions(fallback);
    setSelectedIndex(0);
    setCustomName(fallback[0]?.title ?? "");
  }, [stickyTexts, clusterTitle]);

  const checkCredits = useCallback(async () => {
    if (userConsent === undefined) return false;
    if (userConsent !== true) {
      onNeedConsent?.();
      return false;
    }

    try {
      await initializeCredits({});
    } catch {
      // already initialized
    }

    const creditsData = userCredits || {
      credits: 150,
      costs: { transcription: 20, aiGrouping: 10, aiRename: 5 },
    };

    if (creditsData.credits < creditsData.costs.aiRename) {
      toast.error("Not enough credits to suggest a name");
      return false;
    }

    try {
      await deductCredits({ operation: "aiRename" });
      return true;
    } catch {
      toast.error("Not enough credits to suggest a name");
      return false;
    }
  }, [userConsent, userCredits, initializeCredits, deductCredits, onNeedConsent]);

  const fetchSuggestions = useCallback(async () => {
    if (userConsent === undefined) return;

    const hasCredits = await checkCredits();
    if (!hasCredits) {
      setIsLoading(false);
      generateFallback();
      return;
    }

    setIsLoading(true);

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
        const next = (data.suggestions || []) as Suggestion[];
        setSuggestions(next);
        setSelectedIndex(0);
        setCustomName(next[0]?.title || clusterTitle || "");
      } else {
        generateFallback();
      }
    } catch {
      generateFallback();
    } finally {
      setIsLoading(false);
    }
  }, [stickyTexts, clusterTitle, checkCredits, generateFallback, userConsent]);

  useEffect(() => {
    if (!isOpen) {
      autoRanRef.current = false;
      setSuggestions([]);
      setSelectedIndex(0);
      setCustomName("");
      setIsLoading(true);
      return;
    }
    if (autoRanRef.current) return;
    if (userConsent === undefined) return;
    autoRanRef.current = true;
    void fetchSuggestions();
  }, [isOpen, userConsent, fetchSuggestions]);

  const handleApply = () => {
    const nameToApply = customName.trim() || suggestions[selectedIndex]?.title || clusterTitle;
    if (!nameToApply) {
      toast.error("Type a name first");
      return;
    }
    onRename(clusterId, nameToApply);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Suggest a name</DialogTitle>
          <DialogDescription>
            From {stickyTexts.length} slip{stickyTexts.length === 1 ? "" : "s"} in this packet.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col gap-3 py-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner />
              Reading slips
            </div>
            <Skeleton className="h-12 rounded-none" />
            <Skeleton className="h-12 rounded-none" />
            <Skeleton className="h-9 rounded-none" />
          </div>
        ) : (
          <div className="flex flex-col gap-4 py-1">
            {suggestions.length > 0 ? (
              <RadioGroup
                value={String(selectedIndex)}
                onValueChange={(value) => {
                  const index = Number(value);
                  setSelectedIndex(index);
                  setCustomName(suggestions[index]?.title || "");
                }}
                className="flex flex-col gap-2"
              >
                {suggestions.map((suggestion, index) => (
                  <label
                    key={`${suggestion.title}-${index}`}
                    className="flex cursor-pointer items-start gap-3 border border-border p-3 has-data-[state=checked]:border-foreground has-data-[state=checked]:bg-accent"
                  >
                    <RadioGroupItem value={String(index)} className="mt-0.5 rounded-none" />
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="font-mono text-[11px] tracking-widest uppercase">
                        {suggestion.title}
                      </span>
                      {suggestion.reason ? (
                        <span className="text-xs text-muted-foreground">{suggestion.reason}</span>
                      ) : null}
                    </span>
                  </label>
                ))}
              </RadioGroup>
            ) : null}

            <div className="flex flex-col gap-2">
              <Label htmlFor="packet-name" className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground">
                Stamp
              </Label>
              <Input
                id="packet-name"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleApply();
                }}
                placeholder="Untitled"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => void fetchSuggestions()}
            disabled={isLoading}
          >
            Again
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={isLoading || !customName.trim()}>
            Stamp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
