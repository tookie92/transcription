"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Download,
  Search,
  CheckCircle2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  AlertTriangle,
  Quote,
  ListChecks,
  X,
} from "lucide-react";
import { useAnalysis } from "@/hooks/useAnalysis";
import { ExportDialog } from "./ExportDialog";
import { AudioPlayer, AudioPlayerHandle } from "./AudioPlayer";
import { PinToolbar, type PinKind, type PinSelection } from "./transcript/PinToolbar";
import { pinAnchor, selectedTextInLine } from "./transcript/selection";
import { dampNudgeX, setTapeNudge, snapTapeNudge } from "./transcript/tapeNudge";
import { SittingPrep } from "./SittingPrep";
import { useState, useRef, useEffect, useCallback } from "react";
import { ExportInterview, Insight } from "@/types";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import Link from "next/link";

interface InterviewContentProps {
  projectId: Id<"projects">;
  interviewId: Id<"interviews">;
  tapeReady?: boolean;
  seekTo?: number | null;
}

const insightTypeConfig: Record<
  Exclude<Insight["type"], undefined>,
  { icon: React.ComponentType<{ className?: string }>; label: string }
> = {
  "pain-point": { icon: AlertTriangle, label: "Pain" },
  quote: { icon: Quote, label: "Quote" },
  insight: { icon: Lightbulb, label: "Insight" },
  "follow-up": { icon: ListChecks, label: "Follow-up" },
  custom: { icon: Lightbulb, label: "Note" },
};

function formatStamp(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${Math.round(seconds % 60)
    .toString()
    .padStart(2, "0")}`;
}

const MARK_DRAG_PX = 6;
const PIN_HISTORY_LIMIT = 20;

type PinRecord = {
  id: Id<"insights">;
  type: "pain-point" | "quote" | "insight" | "follow-up" | "custom";
  text: string;
  timestamp: number;
};

type PinHistoryEntry = {
  action: "create" | "delete";
  record: PinRecord;
};

export function InterviewContent({
  projectId,
  interviewId,
  tapeReady = false,
  seekTo = null,
}: InterviewContentProps) {
  const router = useRouter();
  const { analyzeInterview, generateInterviewSummary } = useAnalysis();
  const deleteInsight = useMutation(api.insights.deleteInsight);
  const createInsight = useMutation(api.insights.createManualInsight);

  const [activeTab, setActiveTab] = useState<string>("transcription");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [showReadyBanner, setShowReadyBanner] = useState(tapeReady);
  const [pinSelection, setPinSelection] = useState<PinSelection | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioPlayerRef = useRef<AudioPlayerHandle>(null);
  const pointerOriginRef = useRef<{
    x: number;
    y: number;
    timestamp: number;
    lineText: string;
    lineEl: HTMLElement | null;
    cardEl: HTMLElement | null;
    nudgeX: number;
    kind: "grab" | "text";
  } | null>(null);
  const isMarkingRef = useRef(false);
  const undoStackRef = useRef<PinHistoryEntry[]>([]);
  const redoStackRef = useRef<PinHistoryEntry[]>([]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (pinSelection) return;
      if (e.code === "Space") {
        e.preventDefault();
        if (isPlaying) {
          audioPlayerRef.current?.pause();
        } else {
          audioPlayerRef.current?.play();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pinSelection, isPlaying]);

  const openPinFromOrigin = useCallback(
    (origin: {
      x: number;
      y: number;
      timestamp: number;
      lineText: string;
      lineEl: HTMLElement | null;
    }, preferFullLine: boolean) => {
      const clipped = selectedTextInLine(origin.lineEl, origin.lineText);
      const text = clipped || (preferFullLine ? origin.lineText.trim() : "");
      if (text.length < 2) return false;
      const anchor = pinAnchor(origin.lineEl, { x: origin.x, y: origin.y });
      setPinSelection({
        text,
        timestamp: origin.timestamp,
        x: anchor.x,
        y: anchor.y,
      });
      return true;
    },
    []
  );

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const origin = pointerOriginRef.current;
      if (!origin) return;
      const distance = Math.hypot(event.clientX - origin.x, event.clientY - origin.y);
      const threshold = isPlaying ? 12 : MARK_DRAG_PX;
      if (distance < threshold) return;
      isMarkingRef.current = true;
      if (origin.kind !== "grab" || !origin.cardEl) return;
      document.body.style.cursor = "grabbing";
      origin.cardEl.style.cursor = "grabbing";
      const nudgeX = dampNudgeX(event.clientX - origin.x);
      origin.nudgeX = nudgeX;
      setTapeNudge(origin.cardEl, nudgeX);
    };

    const handlePointerUp = (event: PointerEvent) => {
      const origin = pointerOriginRef.current;
      const wasMarking = isMarkingRef.current;
      pointerOriginRef.current = null;
      isMarkingRef.current = false;
      document.body.style.cursor = "";
      if (!origin) return;
      if (origin.cardEl) {
        origin.cardEl.style.cursor = "";
        snapTapeNudge(origin.cardEl, origin.nudgeX);
      }

      if (origin.kind === "grab") {
        if (wasMarking) {
          openPinFromOrigin(origin, true);
          return;
        }
        if (isPlaying) {
          audioPlayerRef.current?.setCurrentTime(origin.timestamp);
        }
        return;
      }

      if (wasMarking || event.detail >= 2) {
        openPinFromOrigin(origin, false);
        return;
      }

      if (isPlaying) {
        audioPlayerRef.current?.setCurrentTime(origin.timestamp);
      }
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      document.body.style.cursor = "";
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isPlaying, openPinFromOrigin]);

  const isValidProjectId = projectId && !projectId.includes("affinity");
  const project = useQuery(api.projects.getById, isValidProjectId ? { projectId } : "skip");
  const interview = useQuery(api.interviews.getById, { interviewId });
  const insights = useQuery(api.insights.getByInterview, { interviewId });
  const didSeekRef = useRef<number | null>(null);

  useEffect(() => {
    if (seekTo == null || Number.isNaN(seekTo) || !interview?.audioUrl) return;
    if (didSeekRef.current === seekTo) return;
    const timer = window.setTimeout(() => {
      audioPlayerRef.current?.setCurrentTime(seekTo);
      audioPlayerRef.current?.play();
      didSeekRef.current = seekTo;
    }, 300);
    return () => window.clearTimeout(timer);
  }, [seekTo, interview?.audioUrl]);
  const projectInterviews = useQuery(
    api.interviews.getProjectInterviews,
    isValidProjectId ? { projectId } : "skip"
  );

  const currentIndex = projectInterviews?.findIndex((i) => i._id === interviewId) || 0;
  const filteredSegments =
    interview?.segments.filter(
      (s) => !searchQuery || s.text.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];
  const filteredInsights =
    insights?.filter(
      (i) => !searchQuery || i.text.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

  const clearSelection = useCallback(() => {
    setPinSelection(null);
    window.getSelection()?.removeAllRanges();
  }, []);

  const pushUndo = useCallback((entry: PinHistoryEntry) => {
    undoStackRef.current.push(entry);
    if (undoStackRef.current.length > PIN_HISTORY_LIMIT) {
      undoStackRef.current.shift();
    }
    redoStackRef.current = [];
  }, []);

  const undoPin = useCallback(async () => {
    const entry = undoStackRef.current.pop();
    if (!entry) return;
    try {
      if (entry.action === "create") {
        await deleteInsight({ insightId: entry.record.id });
        redoStackRef.current.push(entry);
      } else {
        const id = await createInsight({
          interviewId,
          projectId,
          type: entry.record.type,
          text: entry.record.text,
          timestamp: entry.record.timestamp,
        });
        redoStackRef.current.push({
          action: "delete",
          record: { ...entry.record, id },
        });
      }
    } catch {
      undoStackRef.current.push(entry);
      toast.error("Could not undo");
    }
  }, [createInsight, deleteInsight, interviewId, projectId]);

  const redoPin = useCallback(async () => {
    const entry = redoStackRef.current.pop();
    if (!entry) return;
    try {
      if (entry.action === "create") {
        const id = await createInsight({
          interviewId,
          projectId,
          type: entry.record.type,
          text: entry.record.text,
          timestamp: entry.record.timestamp,
        });
        undoStackRef.current.push({
          action: "create",
          record: { ...entry.record, id },
        });
      } else {
        await deleteInsight({ insightId: entry.record.id });
        undoStackRef.current.push(entry);
      }
    } catch {
      redoStackRef.current.push(entry);
      toast.error("Could not redo");
    }
  }, [createInsight, deleteInsight, interviewId, projectId]);

  const handlePin = useCallback(
    async (kind: PinKind) => {
      if (!pinSelection) return;
      try {
        const id = await createInsight({
          interviewId,
          projectId,
          type: kind,
          text: pinSelection.text,
          timestamp: pinSelection.timestamp,
        });
        pushUndo({
          action: "create",
          record: {
            id,
            type: kind,
            text: pinSelection.text,
            timestamp: pinSelection.timestamp,
          },
        });
        toast.success("Pinned — waiting on the wall", {
          action: {
            label: "Undo",
            onClick: () => {
              const last = undoStackRef.current[undoStackRef.current.length - 1];
              if (last?.action === "create" && last.record.id === id) {
                void undoPin();
              }
            },
          },
        });
      } catch {
        toast.error("Could not pin this line");
      } finally {
        clearSelection();
      }
    },
    [pinSelection, createInsight, interviewId, projectId, clearSelection, pushUndo, undoPin]
  );

  const handleDeleteInsight = async (
    insight: {
      _id: Id<"insights">;
      type: PinRecord["type"];
      text: string;
      timestamp: number;
    }
  ) => {
    try {
      await deleteInsight({ insightId: insight._id });
      pushUndo({
        action: "delete",
        record: {
          id: insight._id,
          type: insight.type,
          text: insight.text,
          timestamp: insight.timestamp,
        },
      });
    } catch {
      toast.error("Failed to delete");
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "z") return;
      e.preventDefault();
      if (pinSelection) {
        clearSelection();
        return;
      }
      if (e.shiftKey) {
        void redoPin();
      } else {
        void undoPin();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pinSelection, clearSelection, undoPin, redoPin]);

  const handleTapePointerDown = (
    timestamp: number,
    lineText: string,
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    if (event.button !== 0) return;
    const lineEl = event.currentTarget.querySelector<HTMLElement>("[data-tape-line]");
    const fromText = Boolean((event.target as HTMLElement).closest("[data-tape-line]"));
    event.currentTarget.getAnimations().forEach((animation) => animation.cancel());
    pointerOriginRef.current = {
      x: event.clientX,
      y: event.clientY,
      timestamp,
      lineText,
      lineEl,
      cardEl: event.currentTarget,
      nudgeX: 0,
      kind: fromText ? "text" : "grab",
    };
    isMarkingRef.current = false;
  };

  const handleSuggestPins = async () => {
    if (!interview) return;
    setIsAnalyzing(true);
    try {
      await analyzeInterview(
        interview._id,
        projectId,
        interview.transcription,
        interview.topic,
        interview.language,
        interview.segments
      );
      toast.success("Suggested pins added to this sitting");
    } catch {
      toast.error("Could not suggest pins");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!interview) return;
    setIsGeneratingSummary(true);
    try {
      await generateInterviewSummary(
        interview._id,
        projectId,
        interview.transcription,
        interview.topic,
        interview.language,
        insights?.map((i) => ({
          id: i._id,
          type: i.type,
          text: i.text,
          timestamp: i.timestamp,
          source: i.source,
          createdBy: i.createdBy,
          createdByName: i.createdByName,
          createdAt: new Date(i._creationTime).toISOString(),
          projectId: i.projectId,
          interviewId: i.interviewId,
        })) || []
      );
      toast.success("Summary written");
      setActiveTab("summary");
    } catch {
      toast.error("Could not write summary");
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  if (!interview || !project) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground text-sm">Loading sitting...</p>
        </div>
      </div>
    );
  }

  const interviewForExport: ExportInterview = {
    id: interview._id,
    title: interview.title,
    topic: interview.topic,
    transcription: interview.transcription,
    segments: interview.segments,
    duration: interview.duration,
    insights:
      insights?.map((i) => ({
        id: i._id,
        type: i.type,
        text: i.text,
        timestamp: i.timestamp,
        segmentId: undefined,
        createdAt: new Date(i.createdAt).toISOString(),
      })) || [],
    createdAt: new Date(interview._creationTime).toISOString(),
  };

  const pinCount = insights?.length ?? 0;
  const prepGuide = interview.prepGuide ?? [];
  const prepChecked = prepGuide.filter((q) => q.checked).length;

  return (
    <div className="h-dvh flex flex-col bg-background overflow-hidden">
      {showReadyBanner && (
        <div className="shrink-0 border-b border-border bg-card px-5 py-2.5 flex items-center justify-between gap-3">
          <p className="text-sm text-foreground">
            Tape ready. Select a line to pin it — or suggest pins.
          </p>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="Dismiss"
            onClick={() => setShowReadyBanner(false)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      <header className="shrink-0 border-b border-border">
        <div className="px-5 lg:px-8 py-3 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Button variant="ghost" size="icon" asChild className="-ml-2">
                <Link href={`/project/${projectId}`} aria-label="Back to project">
                  <ArrowLeft className="w-5 h-5" />
                </Link>
              </Button>
              <div className="flex items-center gap-1 bg-muted p-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  disabled={currentIndex === 0}
                  aria-label="Previous sitting"
                  onClick={() =>
                    router.push(
                      `/project/${projectId}/interview/${projectInterviews?.[currentIndex - 1]?._id}`
                    )
                  }
                >
                  <ChevronLeft className="w-3 h-3" />
                </Button>
                <span className="font-mono text-[11px] text-muted-foreground px-1 min-w-[30px] text-center">
                  {currentIndex + 1}/{projectInterviews?.length}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  disabled={currentIndex >= (projectInterviews?.length || 0) - 1}
                  aria-label="Next sitting"
                  onClick={() =>
                    router.push(
                      `/project/${projectId}/interview/${projectInterviews?.[currentIndex + 1]?._id}`
                    )
                  }
                >
                  <ChevronRight className="w-3 h-3" />
                </Button>
              </div>
              <div className="min-w-0">
                <h1 className="text-base font-semibold truncate">{interview.title}</h1>
                <p className="font-mono text-[11px] text-muted-foreground">
                  {formatStamp(interview.duration)} · {interview.segments.length} lines
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <ExportDialog
                interview={interviewForExport}
                trigger={
                  <Button variant="outline" size="sm" className="h-8 font-mono text-[11px] uppercase tracking-widest">
                    <Download className="w-3 h-3 mr-1" />
                    Export
                  </Button>
                }
              />
              <Button
                size="sm"
                className="h-8 font-mono text-[11px] uppercase tracking-widest"
                onClick={() =>
                  router.push(`/project/${projectId}/affinity?sitting=${interviewId}`)
                }
              >
                Wall · {pinCount} {pinCount === 1 ? "pin" : "pins"}
              </Button>
            </div>
          </div>

          {interview.audioUrl && (
            <div className="bg-card border border-border px-4 py-2.5">
              <AudioPlayer
                ref={audioPlayerRef}
                src={interview.audioUrl}
                onTimeUpdate={setCurrentTime}
                onPlayStateChange={setIsPlaying}
              />
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-transparent h-9 p-0 gap-1">
              <TabsTrigger
                value="transcription"
                className="rounded-sm font-mono text-[11px] uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                Tape
              </TabsTrigger>
              <TabsTrigger
                value="insights"
                className="rounded-sm font-mono text-[11px] uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                Pins{pinCount > 0 ? ` · ${pinCount}` : ""}
              </TabsTrigger>
              <TabsTrigger
                value="summary"
                className="rounded-sm font-mono text-[11px] uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                Summary
                {interview.summary && <CheckCircle2 className="w-3 h-3 ml-1.5" />}
              </TabsTrigger>
              <TabsTrigger
                value="prep"
                className="rounded-sm font-mono text-[11px] uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                Prep
                {prepGuide.length > 0 ? ` · ${prepChecked}/${prepGuide.length}` : ""}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-5 lg:px-8 py-6">
            {activeTab === "transcription" && (
              <>
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search the sitting..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-10"
                  />
                </div>
                <p className="font-mono text-[11px] tracking-widest uppercase text-muted-foreground mb-4">
                  {isPlaying
                    ? "Running · click the stamp to jump · select words to pin"
                    : "Stopped · grab the stamp · select the words"}
                </p>
                <div className="space-y-2 selection:bg-primary/35 selection:text-foreground">
                  {(searchQuery ? filteredSegments : interview.segments).map((segment) => {
                    const isActive = currentTime >= segment.start && currentTime < segment.end;
                    const segmentPins =
                      insights?.filter(
                        (i) => Math.abs(i.timestamp - segment.start) < 0.5
                      ) ?? [];
                    return (
                      <div
                        key={segment.id}
                        className={`p-4 border select-none transition-[border-color,background-color] duration-150 ease-out ${
                          isPlaying ? "cursor-pointer" : "cursor-grab"
                        } ${
                          isActive
                            ? "border-primary bg-primary/10"
                            : "border-transparent hover:border-border hover:bg-accent/40"
                        }`}
                        onPointerDown={(e) =>
                          handleTapePointerDown(segment.start, segment.text, e)
                        }
                      >
                        <div
                          data-tape-chrome
                          className="flex items-center gap-3 mb-2"
                        >
                          <span
                            className={`font-mono text-xs px-2 py-1 ${
                              isActive
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {formatStamp(segment.start)}
                          </span>
                          {segment.speaker && (
                            <span className="font-mono text-[11px] text-muted-foreground">
                              {segment.speaker}
                            </span>
                          )}
                          {segmentPins.length > 0 && (
                            <span className="ml-auto size-1.5 rounded-full bg-myGreen" aria-label="Pinned" />
                          )}
                        </div>
                        <p
                          data-tape-line
                          className="text-sm leading-relaxed text-foreground cursor-text select-text"
                        >
                          {segment.text}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {activeTab === "insights" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-[11px] tracking-widest uppercase text-muted-foreground">
                    {filteredInsights.length} on this sitting
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSuggestPins}
                    disabled={isAnalyzing}
                    className="font-mono text-[11px] uppercase tracking-widest"
                  >
                    {isAnalyzing ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : null}
                    Suggest pins
                  </Button>
                </div>
                {filteredInsights.length === 0 ? (
                  <div className="border border-dashed border-border px-6 py-16 text-center">
                    <p className="font-medium mb-2">No pins yet</p>
                    <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                      Go to Tape and select a line. Suggest pins if you want a first pass.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => setActiveTab("transcription")}
                      className="font-mono text-[11px] uppercase tracking-widest"
                    >
                      Open tape
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredInsights.map((insight) => {
                      const config = insightTypeConfig[insight.type] || insightTypeConfig.insight;
                      const Icon = config.icon;
                      return (
                        <div
                          key={insight._id}
                          className="group flex items-start gap-3 p-4 border border-border bg-card"
                        >
                          <Icon className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="font-mono text-[11px] tracking-widest uppercase text-muted-foreground">
                                {config.label}
                              </span>
                              <span className="font-mono text-[11px] text-muted-foreground">
                                {formatStamp(insight.timestamp)}
                              </span>
                            </div>
                            <p className="text-sm leading-relaxed line-clamp-6">{insight.text}</p>
                          </div>
                          {insight.source === "manual" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-transform duration-150 ease-out active:scale-[0.97]"
                              aria-label="Remove pin"
                              onClick={() => handleDeleteInsight(insight)}
                            >
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === "summary" && (
              <div className="space-y-6">
                {interview.summary ? (
                  <>
                    <div className="border border-border bg-card p-6">
                      <h3 className="font-semibold mb-3">Sitting notes</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {interview.summary.executiveSummary}
                      </p>
                    </div>
                    <div className="border border-border bg-card p-6">
                      <h3 className="font-semibold mb-4">Key points</h3>
                      <ul className="space-y-2">
                        {interview.summary.keyPoints.map((point, i) => (
                          <li key={i} className="flex items-start gap-3 text-sm">
                            <span className="mt-1.5 size-1.5 bg-primary shrink-0" />
                            {typeof point === "string" ? point : point.point}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="border border-border bg-card p-6">
                      <h3 className="font-semibold mb-4">Recommendations</h3>
                      <ul className="space-y-2">
                        {interview.summary.recommendations.map((rec, i) => (
                          <li key={i} className="text-sm p-3 bg-muted">
                            {typeof rec === "string" ? rec : rec.recommendation}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {interview.summary.mainThemes.map((theme, i) => (
                        <Badge key={i} variant="secondary" className="px-3 py-1.5">
                          {typeof theme === "string" ? theme : theme.theme}
                        </Badge>
                      ))}
                    </div>
                    {interview.summary.criticalIssues?.length > 0 && (
                      <div className="border border-destructive/40 p-6">
                        <h3 className="font-semibold text-destructive flex items-center gap-2 mb-4">
                          <AlertTriangle className="w-5 h-5" />
                          Critical issues
                        </h3>
                        <ul className="space-y-2">
                          {interview.summary.criticalIssues.map((issue: unknown, i: number) => {
                            const text =
                              typeof issue === "string"
                                ? issue
                                : (issue as { issue?: string }).issue;
                            return (
                              <li key={i} className="text-sm p-3 bg-card border border-border">
                                {text}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="border border-dashed border-border px-6 py-16 text-center">
                    <p className="font-medium mb-2">No summary yet</p>
                    <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                      Pin a few lines first. Then write the sitting up.
                    </p>
                    <Button
                      onClick={handleGenerateSummary}
                      disabled={isGeneratingSummary || pinCount === 0}
                      className="font-mono text-[11px] uppercase tracking-widest"
                    >
                      {isGeneratingSummary ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : null}
                      Write summary
                    </Button>
                  </div>
                )}
              </div>
            )}

            {activeTab === "prep" && (
              <SittingPrep interviewId={interviewId} items={prepGuide} />
            )}
          </div>
        </main>

        {activeTab === "transcription" && (
          <aside className="hidden lg:flex w-72 shrink-0 flex-col border-l border-border bg-card">
            <div className="px-4 py-3 border-b border-border">
              <p className="font-mono text-[11px] tracking-widest uppercase text-muted-foreground">
                On the wall
              </p>
              <p className="text-sm mt-1">
                {pinCount} {pinCount === 1 ? "pin" : "pins"} this sitting
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {pinCount === 0 ? (
                <p className="text-sm text-muted-foreground px-1 py-4">
                  Grab the stamp for the line. Select words for a phrase.
                </p>
              ) : (
                insights?.map((insight) => (
                  <div key={insight._id} className="group border border-border p-3 bg-background">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground mb-1">
                          {insightTypeConfig[insight.type]?.label ?? "Pin"} · {formatStamp(insight.timestamp)}
                        </p>
                        <p className="text-xs leading-relaxed line-clamp-4">{insight.text}</p>
                      </div>
                      {(insight.source === "manual" || insight.source === "ai") && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-transform duration-150 ease-out active:scale-[0.97]"
                          aria-label="Remove pin"
                          onClick={() => handleDeleteInsight(insight)}
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="p-3 border-t border-border space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full font-mono text-[11px] uppercase tracking-widest"
                onClick={handleSuggestPins}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
                Suggest pins
              </Button>
              <Button
                size="sm"
                className="w-full font-mono text-[11px] uppercase tracking-widest"
                onClick={() =>
                  router.push(`/project/${projectId}/affinity?sitting=${interviewId}`)
                }
              >
                Open wall
              </Button>
            </div>
          </aside>
        )}
      </div>

      {pinSelection && (
        <PinToolbar selection={pinSelection} onPin={handlePin} onClose={clearSelection} />
      )}
    </div>
  );
}
