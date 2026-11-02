"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Card, CardAction, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import type { StickyNoteData, ClusterLabelData } from "@/types/figjam";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { SlipStamp, slipKindOf } from "@/components/myComponents/affinity/SlipFace";
import { cn } from "@/lib/utils";

interface GroupingSuggestion {
  id: string;
  action: "create_new" | "add_to_existing";
  insightIds: string[];
  newGroupTitle?: string;
  targetGroupId?: string;
  reason?: string;
}

interface AIGroupingPanelProps {
  isOpen: boolean;
  onClose: () => void;
  ungroupedStickies: StickyNoteData[];
  existingClusters: ClusterLabelData[];
  projectContext?: string;
  onCreateCluster: (stickyIds: string[], title: string) => void;
  onAddToCluster?: (stickyIds: string[], clusterId: string) => void;
  onNeedConsent?: () => void;
}

export function AIGroupingPanel({
  isOpen,
  onClose,
  ungroupedStickies,
  existingClusters,
  projectContext,
  onCreateCluster,
  onAddToCluster,
  onNeedConsent,
}: AIGroupingPanelProps) {
  const [suggestions, setSuggestions] = useState<GroupingSuggestion[]>([]);
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [hasTried, setHasTried] = useState(false);
  const autoRanRef = useRef(false);

  const userCredits = useQuery(api.credits.getUserCredits);
  const userConsent = useQuery(api.credits.getConsent);
  const deductCredits = useMutation(api.credits.deductCredits);
  const initializeCredits = useMutation(api.credits.initializeCredits);

  const trayIds = useMemo(
    () => new Set(ungroupedStickies.map((s) => s.id)),
    [ungroupedStickies]
  );

  const visible = useMemo(() => {
    return suggestions.filter((suggestion) => {
      if (skipped.has(suggestion.id)) return false;
      const remaining = suggestion.insightIds.filter((id) => trayIds.has(id));
      return remaining.length >= 2;
    });
  }, [suggestions, skipped, trayIds]);

  const packetTitle = useCallback(
    (suggestion: GroupingSuggestion): string => {
      if (suggestion.action === "add_to_existing") {
        const cluster = existingClusters.find((c) => c.id === suggestion.targetGroupId);
        return cluster?.text?.trim() || "Untitled";
      }
      return suggestion.newGroupTitle?.trim() || "Untitled";
    },
    [existingClusters]
  );

  const checkCredits = useCallback(async (): Promise<boolean> => {
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

    if (creditsData.credits < creditsData.costs.aiGrouping) {
      toast.error("Not enough credits to sort the tray");
      return false;
    }

    try {
      await deductCredits({ operation: "aiGrouping" });
      return true;
    } catch {
      toast.error("Not enough credits to sort the tray");
      return false;
    }
  }, [userConsent, userCredits, initializeCredits, deductCredits, onNeedConsent]);

  const fetchSuggestions = useCallback(async () => {
    if (ungroupedStickies.length < 2) return;
    if (userConsent === undefined) return;

    const hasCredits = await checkCredits();
    if (!hasCredits) {
      setHasTried(true);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setSkipped(new Set());
    setSuggestions([]);
    setHasTried(true);

    try {
      const response = await fetch("/api/suggest-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          insights: ungroupedStickies.map((s) => ({
            id: s.id,
            text: s.content,
            type: s.color,
          })),
          existingGroups: existingClusters.map((c) => ({
            id: c.id,
            title: c.text,
            insightIds: [],
          })),
          projectContext,
        }),
      });

      if (!response.ok) throw new Error("Failed to fetch");

      const data = await response.json();
      if (typeof data.warning === "string" && data.warning) {
        toast.message(data.warning);
      }
      const next: GroupingSuggestion[] = (data.suggestions || [])
        .map((s: GroupingSuggestion, idx: number) => ({
          ...s,
          id: `packet-${Date.now()}-${idx}`,
        }))
        .filter((s: GroupingSuggestion) => {
          const count = s.insightIds.filter((id) => trayIds.has(id)).length;
          const mega = ungroupedStickies.length >= 6 && count >= Math.ceil(ungroupedStickies.length * 0.7);
          return count >= 2 && count <= 5 && !mega;
        });
      setSuggestions(next);
    } catch {
      toast.error("Could not sort the tray");
    } finally {
      setIsLoading(false);
    }
  }, [ungroupedStickies, existingClusters, projectContext, checkCredits, userConsent]);

  useEffect(() => {
    if (!isOpen) {
      autoRanRef.current = false;
      setHasTried(false);
      setSuggestions([]);
      setSkipped(new Set());
      setIsLoading(false);
      return;
    }

    if (autoRanRef.current) return;
    if (ungroupedStickies.length < 2) return;
    if (userConsent === undefined) return;

    autoRanRef.current = true;
    void fetchSuggestions();
  }, [isOpen, ungroupedStickies.length, userConsent, fetchSuggestions]);

  const placeOne = (suggestion: GroupingSuggestion) => {
    const ids = suggestion.insightIds.filter((id) => trayIds.has(id));
    if (ids.length === 0) return;

    if (suggestion.action === "add_to_existing" && suggestion.targetGroupId) {
      onAddToCluster?.(ids, suggestion.targetGroupId);
    } else {
      onCreateCluster(ids, packetTitle(suggestion));
    }
    setSkipped((prev) => new Set(prev).add(suggestion.id));
  };

  const placeRest = () => {
    visible.forEach(placeOne);
  };

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      modal={false}
    >
      <SheetContent
        side="right"
        overlay={false}
        className="flex w-full flex-col gap-0 p-0 sm:max-w-sm"
      >
        <SheetHeader className="border-b border-border">
          <SheetTitle>Sort tray</SheetTitle>
          <SheetDescription>
            {ungroupedStickies.length} loose{" "}
            {ungroupedStickies.length === 1 ? "slip" : "slips"}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-3 p-4">
            {ungroupedStickies.length < 2 && (
              <Empty className="border border-dashed py-8">
                <EmptyHeader>
                  <EmptyTitle className="font-mono text-xs tracking-widest uppercase">
                    Tray too thin
                  </EmptyTitle>
                  <EmptyDescription>
                    Need at least two loose slips to stack a packet.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}

            {isLoading && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Spinner />
                  Reading slips
                </div>
                <Skeleton className="h-36 rounded-none" />
                <Skeleton className="h-36 rounded-none" />
              </div>
            )}

            {!isLoading &&
              ungroupedStickies.length >= 2 &&
              visible.length === 0 &&
              hasTried &&
              skipped.size > 0 && (
              <Empty className="border border-dashed py-8">
                <EmptyHeader>
                  <EmptyTitle className="font-mono text-xs tracking-widest uppercase">
                    Packets on the wall
                  </EmptyTitle>
                  <EmptyDescription>
                    The rest stay in the tray until you file them.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}

            {!isLoading &&
              ungroupedStickies.length >= 2 &&
              visible.length === 0 &&
              hasTried &&
              skipped.size === 0 && (
              <Empty className="border border-dashed py-8">
                <EmptyHeader>
                  <EmptyTitle className="font-mono text-xs tracking-widest uppercase">
                    No stack
                  </EmptyTitle>
                  <EmptyDescription>
                    Nothing obvious to bundle. File them by hand, or try again.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button
                    variant="outline"
                    onClick={() => {
                      autoRanRef.current = true;
                      void fetchSuggestions();
                    }}
                  >
                    Try again
                  </Button>
                </EmptyContent>
              </Empty>
            )}

            {visible.map((suggestion) => {
              const ids = suggestion.insightIds.filter((id) => trayIds.has(id));
              const slips = ungroupedStickies.filter((s) => ids.includes(s.id));
              const intoExisting = suggestion.action === "add_to_existing";

              return (
                <Card
                  key={suggestion.id}
                  className="rounded-none py-3 shadow-none gap-3"
                >
                  <CardHeader className="px-3 [.border-b]:pb-0">
                    <CardTitle className="font-mono text-[11px] font-normal tracking-widest uppercase">
                      {packetTitle(suggestion)}
                    </CardTitle>
                    <CardAction>
                      <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                        ×{slips.length}
                      </span>
                    </CardAction>
                  </CardHeader>
                  <CardContent className="px-3">
                    {suggestion.reason ? (
                      <p className="mb-2 text-xs text-muted-foreground line-clamp-2">
                        {suggestion.reason}
                      </p>
                    ) : null}
                    <ul className="flex flex-col gap-2">
                      {slips.slice(0, 3).map((slip) => {
                        const kind = slipKindOf(slip.color, slip.source);
                        return (
                          <li key={slip.id} className="flex items-start gap-2">
                            <SlipStamp kind={kind} />
                            <p
                              className={cn(
                                "line-clamp-2 text-[12px] leading-snug",
                                kind === "quote" && "italic"
                              )}
                            >
                              {slip.content || "Empty"}
                            </p>
                          </li>
                        );
                      })}
                    </ul>
                    {slips.length > 3 ? (
                      <p className="mt-2 font-mono text-[10px] text-muted-foreground">
                        +{slips.length - 3}
                      </p>
                    ) : null}
                  </CardContent>
                  <CardFooter className="justify-end px-3">
                    <ButtonGroup>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setSkipped((prev) => new Set(prev).add(suggestion.id))
                        }
                      >
                        Skip
                      </Button>
                      <Button size="sm" onClick={() => placeOne(suggestion)}>
                        {intoExisting ? "File in" : "Place"}
                      </Button>
                    </ButtonGroup>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </ScrollArea>

        {visible.length > 1 ? (
          <SheetFooter className="border-t border-border">
            <Button variant="outline" onClick={placeRest}>
              Place all {visible.length}
            </Button>
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
