"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery as useConvexQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Lightbulb,
  Quote,
  AlertCircle,
  HelpCircle,
  FileText,
  CheckCircle2,
  Loader2,
  Lock,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Layers,
  Presentation,
  LayoutGrid,
  Keyboard,
  ArrowRight,
  Users,
  FileBarChart,
  CircuitBoard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PersonaCard } from "./share/PersonaCard";

interface ProjectShareViewProps {
  token: string;
}

const insightTypeConfig = {
  "pain-point": {
    label: "Pain Point",
    icon: AlertCircle,
    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  },
  quote: {
    label: "Quote",
    icon: Quote,
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  },
  insight: {
    label: "Insight",
    icon: Lightbulb,
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  },
  "follow-up": {
    label: "Follow-up",
    icon: HelpCircle,
    color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  },
  custom: {
    label: "Custom",
    icon: FileText,
    color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
  },
};

interface Slide {
  id: string;
  type: "title" | "summary" | "themes" | "cross-themes" | "insights" | "quotes" | "persona" | "end";
  interviewIndex: number;
  interviewTitle: string;
}

const MAX_ITEMS_PER_SLIDE = 5;

export function ProjectShareView({ token }: ProjectShareViewProps) {
  const [password, setPassword] = useState("");
  const [viewMode, setViewMode] = useState<"presentation" | "overview">("presentation");
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [crossThemes, setCrossThemes] = useState<string[]>([]);
  const [isGeneratingThemes, setIsGeneratingThemes] = useState(false);

  const data = useConvexQuery(api.projectSharing.getProjectShareData, {
    shareToken: token,
    password: password || undefined,
  });

  const interviews = data && !("error" in data) ? data.interviews : [];
  const personas = data && !("error" in data) && Array.isArray(data.personas) ? data.personas : [];
  const hasMultipleInterviews = interviews.length > 1;

  // Calculate project stats
  const stats = useMemo(() => {
    const totalInsights = interviews.reduce((sum, i) => sum + (i?.insights?.length || 0), 0);
    const totalQuotes = interviews.reduce((sum, i) => sum + (i?.transcriptExcerpts?.length || 0), 0);
    return { totalInsights, totalQuotes, interviewCount: interviews.length };
  }, [interviews]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Get notable segments based on insights (segments closest to insight timestamps)
  interface Segment {
    start: number;
    end: number;
    text: string;
    speaker?: string;
  }
  interface Insight {
    timestamp: number;
    text: string;
  }

  const getNotableSegments = (interview: { transcriptExcerpts?: Segment[]; insights?: Insight[] }): Segment[] => {
    if (!interview?.transcriptExcerpts || !interview?.insights) {
      return interview?.transcriptExcerpts?.slice(0, 5) || [];
    }

    const insights = interview.insights;
    const segments = interview.transcriptExcerpts;

    // If few insights, return first segments
    if (insights.length < 2) {
      return segments.slice(0, 5);
    }

    // Find segments closest to insight timestamps
    const segmentsNearInsights: Segment[] = insights
      .map((insight) => {
        const insightTime = insight.timestamp || 0;
        let closest = segments[0];
        let minDiff = Math.abs(segments[0]?.start - insightTime);

        for (const seg of segments) {
          const diff = Math.abs(seg.start - insightTime);
          if (diff < minDiff) {
            minDiff = diff;
            closest = seg;
          }
        }
        return closest;
      })
      .filter((s): s is Segment => Boolean(s));

    // Remove duplicates and limit to 5
    const uniqueStarts: number[] = [...new Set(segmentsNearInsights.map((s) => s.start))];
    return uniqueStarts.slice(0, 5).map((start) => segments.find((s) => s.start === start)).filter((s): s is Segment => Boolean(s));
  };

  // Generate slides when data changes
  useEffect(() => {
    if (!data || "error" in data) return;
    
    const hasInterviews = interviews.length > 0;
    const hasPersonas = Array.isArray(personas) && personas.length > 0;
    
    if (!hasInterviews && !hasPersonas) {
      return;
    }

    const newSlides: Slide[] = [];

    // Add project intro slide if we have personas but no interviews
    if (!hasInterviews && hasPersonas) {
      newSlides.push({
        id: "project-intro",
        type: "title",
        interviewIndex: -1,
        interviewTitle: project.name,
      });
    }

    // Cross-themes slide (if multiple interviews)
    if (hasMultipleInterviews) {
      newSlides.push({
        id: "cross-themes",
        type: "cross-themes",
        interviewIndex: -1,
        interviewTitle: "All Interviews",
      });
    }

    interviews.forEach((interview, interviewIndex) => {
      if (!interview) return;

      newSlides.push({
        id: `title-${interviewIndex}`,
        type: "title",
        interviewIndex,
        interviewTitle: interview.title,
      });

      if (interview.summary) {
        newSlides.push({
          id: `summary-${interviewIndex}`,
          type: "summary",
          interviewIndex,
          interviewTitle: interview.title,
        });
      }

      if (interview.summary?.mainThemes.length) {
        newSlides.push({
          id: `themes-${interviewIndex}`,
          type: "themes",
          interviewIndex,
          interviewTitle: interview.title,
        });
      }

      if (interview.insights && interview.insights.length > 0) {
        const insightCount = interview.insights.length;
        const pageCount = Math.ceil(insightCount / MAX_ITEMS_PER_SLIDE);

        for (let page = 0; page < pageCount; page++) {
          newSlides.push({
            id: `insights-${interviewIndex}-${page}`,
            type: "insights",
            interviewIndex,
            interviewTitle: interview.title,
          });
        }
      }
      // (Quotes slide removed - not useful)
    });

    // Add separate persona slides - one per persona
    if (Array.isArray(personas) && personas.length > 0) {
      personas.forEach((persona: any, index: number) => {
        newSlides.push({
          id: `persona-${index}`,
          type: "persona",
          interviewIndex: -1,
          interviewTitle: persona.name || `Persona ${index + 1}`,
        });
      });
    }

    newSlides.push({
      id: "end",
      type: "end",
      interviewIndex: -1,
      interviewTitle: "End",
    });

    setSlides(newSlides);
  }, [data, interviews, hasMultipleInterviews, personas]);

  useEffect(() => {
    if (data && !("error" in data) && hasMultipleInterviews && crossThemes.length === 0) {
      generateCrossThemes();
    }
  }, [data, hasMultipleInterviews]);

  const generateCrossThemes = async () => {
    if (!data || "error" in data || !hasMultipleInterviews) return;

    setIsGeneratingThemes(true);
    try {
      const insightsText = interviews
        .filter(Boolean)
        .map((i) => `Interview: ${i?.title || "Unknown"}\nInsights:\n${i?.insights?.map((ins) => `- [${ins?.type || "insight"}]: ${ins?.text || ""}`).join("\n") || "No insights"}`)
        .join("\n\n");

      const response = await fetch("/api/analyze-cross-themes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          insightsText,
          interviewCount: interviews.length,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setCrossThemes(result.themes || []);
      }
    } catch (error) {
      console.error("Failed to generate cross themes:", error);
    } finally {
      setIsGeneratingThemes(false);
    }
  };

  const nextSlide = useCallback(() => {
    if (currentSlideIndex < slides.length - 1) {
      setCurrentSlideIndex((i) => i + 1);
    }
  }, [currentSlideIndex, slides.length]);

  const prevSlide = useCallback(() => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex((i) => i - 1);
    }
  }, [currentSlideIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        nextSlide();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prevSlide();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextSlide, prevSlide]);

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-muted-foreground text-lg">Loading research...</p>
        </div>
      </div>
    );
  }

  if ("error" in data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              {data.error === "password_required" ? "Password Required" : data.error === "expired" ? "Link Expired" : "Not Found"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.error === "password_required" ? (
              <>
                <p className="text-muted-foreground">Enter password to view this research.</p>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && window.location.reload()}
                  />
                  <Button onClick={() => window.location.reload()}>Enter</Button>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">
                {data.error === "expired" ? "This shareable link has expired." : "This link is invalid."}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const { project } = data;
  const currentSlide = slides[currentSlideIndex];
  const currentInterview = currentSlide && currentSlide.interviewIndex >= 0 ? interviews[currentSlide.interviewIndex] : null;
  const progress = slides.length > 1 ? ((currentSlideIndex + 1) / slides.length) * 100 : 100;

  // Get page info for insights/quotes slides
  const getPageInfo = (slide: Slide) => {
    if (slide.type !== "insights") return null;

    const parts = slide.id.split("-");
    const page = parseInt(parts[parts.length - 1]);
    const interview = interviews[slide.interviewIndex];
    const total = interview?.insights?.length || 0;
    const totalPages = Math.ceil(total / MAX_ITEMS_PER_SLIDE);

    return { page, totalPages };
  };

  const getPageItems = (slide: Slide) => {
    if (!currentInterview) return [];

    if (slide.type === "insights") {
      const parts = slide.id.split("-");
      const page = parseInt(parts[parts.length - 1]);
      const start = page * MAX_ITEMS_PER_SLIDE;
      const end = start + MAX_ITEMS_PER_SLIDE;
      return currentInterview.insights?.slice(start, end) || [];
    }

    if (slide.type === "quotes") {
      return getNotableSegments(currentInterview);
    }

    return [];
  };

  // Overview mode
  if (viewMode === "overview") {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/logomark.svg" alt="Skripta" className="w-8 h-8" />
              <div>
                <h1 className="font-semibold">{project.name}</h1>
                <p className="text-xs text-muted-foreground">Research Overview</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={() => setViewMode("presentation")} className="gap-2">
                <Presentation className="w-4 h-4" />
                Present
              </Button>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <FileBarChart className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{stats.interviewCount}</p>
                  <p className="text-sm text-muted-foreground">Interviews</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <Lightbulb className="w-8 h-8 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.totalInsights}</p>
                  <p className="text-sm text-muted-foreground">Insights</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.totalQuotes}</p>
                  <p className="text-sm text-muted-foreground">Quotes</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Interviews */}
          <div className="space-y-6">
            {interviews.map((interview, idx) => {
              if (!interview) return null;
              return (
                <Card key={interview.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary" />
                      {interview.title}
                      <Badge variant="outline" className="ml-auto">{idx + 1} / {interviews.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {interview.summary && (
                      <div>
                        <h3 className="font-semibold mb-2 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          Executive Summary
                        </h3>
                        <p className="text-muted-foreground leading-relaxed">{interview.summary.executiveSummary}</p>

                        {interview.summary.mainThemes.length > 0 && (
                          <div className="mt-4">
                            <h4 className="font-medium mb-2 flex items-center gap-2 text-sm">
                              <Sparkles className="w-4 h-4 text-primary" />
                              Main Themes
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {interview.summary.mainThemes.map((theme, i) => (
                                <Badge key={i} variant="secondary">{typeof theme === 'string' ? theme : theme.theme}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {interview.insights && interview.insights.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                          <Lightbulb className="w-4 h-4 text-primary" />
                          Key Insights ({interview.insights.length})
                        </h3>
                        <div className="grid md:grid-cols-2 gap-3">
                          {interview.insights.slice(0, 6).map((insight) => {
                            const config = insightTypeConfig[insight.type as keyof typeof insightTypeConfig] || insightTypeConfig.custom;
                            return (
                              <div key={insight._id} className={cn("p-3 rounded-lg border bg-card", config.color)}>
                                <Badge variant="outline" className={cn("text-xs mb-2", config.color)}>{config.label}</Badge>
                                <p className="text-sm">{insight.text}</p>
                              </div>
                            );
                          })}
                        </div>
                        {interview.insights.length > 6 && (
                          <p className="text-sm text-muted-foreground mt-2">
                            + {interview.insights.length - 6} more insights (view in presentation mode)
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Personas Section */}
          {personas && personas.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  User Personas
                  <Badge variant="secondary" className="ml-auto">{personas.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {personas.map((persona: any, i: number) => (
                    <PersonaCard key={i} persona={persona} isCompact />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    );
  }

  // Presentation mode
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card/50 backdrop-blur-sm px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logomark.svg" alt="Skripta" className="w-6 h-6" />
            <span className="font-medium">{project.name}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <Keyboard className="w-4 h-4" />
              Use arrows to navigate
            </span>
            <Button variant="outline" size="sm" onClick={() => setViewMode("overview")} className="gap-2">
              <LayoutGrid className="w-4 h-4" />
              Overview
            </Button>
          </div>
        </div>
        <Progress value={progress} className="h-1 mt-3" />
      </header>

      <main className="flex-1 flex items-center justify-center p-8 overflow-hidden">
        <div className="w-full max-w-5xl h-full flex flex-col">
          {currentSlide && renderSlide(currentSlide, currentInterview)}
        </div>
      </main>

      <footer className="border-t bg-card/50 backdrop-blur-sm px-6 py-4">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <Button variant="outline" onClick={prevSlide} disabled={currentSlideIndex === 0} className="gap-2">
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>

          <div className="flex items-center gap-3">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlideIndex(idx)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  idx === currentSlideIndex ? "bg-primary w-6" : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                )}
              />
            ))}
          </div>

          <Button variant="outline" onClick={nextSlide} disabled={currentSlideIndex === slides.length - 1} className="gap-2">
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </footer>
    </div>
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function renderSlide(slide: Slide, interview: any) {
    switch (slide.type) {
      case "cross-themes":
        return (
          <div className="flex-1 flex flex-col">
            <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
              <Layers className="w-8 h-8 text-primary" />
              Cross-Interview Themes
              {isGeneratingThemes && <Loader2 className="w-6 h-6 animate-spin ml-2" />}
            </h2>
            <div className="flex-1 flex items-center justify-center">
              {crossThemes.length > 0 ? (
                <div className="flex flex-wrap gap-4 justify-center">
                  {crossThemes.map((theme, i) => (
                    <Badge key={i} variant="secondary" className="text-lg px-6 py-3">{theme}</Badge>
                  ))}
                </div>
              ) : isGeneratingThemes ? (
                <p className="text-xl text-muted-foreground">Analyzing themes across interviews...</p>
              ) : (
                <Button onClick={generateCrossThemes} size="lg" className="gap-2">
                  <Sparkles className="w-5 h-5" />
                  Generate Cross-Themes
                </Button>
              )}
            </div>
          </div>
        );

      case "title":
        return interview ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
            <Badge variant="outline" className="text-sm px-4 py-1">
              Interview {slide.interviewIndex + 1} of {interviews.length}
            </Badge>
            <h1 className="text-5xl font-bold tracking-tight">{interview.title}</h1>
            {interview.topic && <p className="text-xl text-muted-foreground">{interview.topic}</p>}
            <div className="flex items-center gap-4 text-muted-foreground mt-8">
              {interview.summary && <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Summary</span>}
              {interview.insights?.length > 0 && <span className="flex items-center gap-1"><Lightbulb className="w-4 h-4" /> {interview.insights.length} Insights</span>}
              {interview.transcriptExcerpts?.length > 0 && <span className="flex items-center gap-1"><Quote className="w-4 h-4" /> Key Quotes</span>}
            </div>
          </div>
        ) : null;

      case "summary":
        return interview?.summary ? (
          <div className="flex-1 flex flex-col">
            <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
              Executive Summary
            </h2>
            <div className="flex-1 flex items-center">
              <p className="text-2xl leading-relaxed text-muted-foreground">{interview.summary.executiveSummary}</p>
            </div>
          </div>
        ) : null;

      case "themes":
        return interview?.summary?.mainThemes?.length ? (
          <div className="flex-1 flex flex-col">
            <h2 className="text-3xl font-bold mb-8 flex items-center justify-center gap-3">
              <Sparkles className="w-8 h-8 text-primary" />
              Main Themes
            </h2>
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-wrap gap-3 justify-center max-w-4xl">
                {interview.summary.mainThemes.map((theme: string | {theme: string; description?: string}, i: number) => {
                  const themeText = typeof theme === 'string' ? theme : theme.theme;
                  return (
                    <Badge key={i} variant="secondary" className="text-lg px-6 py-3">{themeText}</Badge>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null;

      case "insights": {
        const pageInfo = getPageInfo(slide);
        const items = getPageItems(slide);
        return items.length > 0 ? (
          <div className="flex-1 flex flex-col">
            <h2 className="text-3xl font-bold mb-4 flex items-center gap-3">
              <Lightbulb className="w-8 h-8 text-primary" />
              Key Insights
              <Badge variant="secondary" className="ml-2">{interview?.insights?.length || 0}</Badge>
              {pageInfo && pageInfo.totalPages > 1 && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  ({pageInfo.page + 1}/{pageInfo.totalPages})
                </span>
              )}
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {items.map((insight: any) => {
                const config = insightTypeConfig[insight.type as keyof typeof insightTypeConfig] || insightTypeConfig.custom;
                const Icon = config.icon;
                return (
                  <Card key={insight._id} className="p-4 border-t-4 border-t-primary">
                    <div className="flex items-start gap-3">
                      <div className={cn("p-2 rounded-lg flex-shrink-0", config.color)}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <Badge variant="outline" className={cn("text-xs mb-2", config.color)}>{config.label}</Badge>
                        <p className="text-sm leading-relaxed">{insight.text}</p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
            {pageInfo && pageInfo.page < pageInfo.totalPages - 1 && (
              <div className="mt-4 text-center text-sm text-muted-foreground">
                More insights on next slide <ArrowRight className="w-4 h-4 inline" />
              </div>
            )}
          </div>
        ) : null;
      }

      case "quotes": {
        const items = getPageItems(slide);
        return items.length > 0 ? (
          <div className="flex-1 flex flex-col">
            <h2 className="text-3xl font-bold mb-4 flex items-center gap-3">
              <Quote className="w-8 h-8 text-primary" />
              Key Quotes
              <span className="text-sm font-normal text-muted-foreground ml-2">
                (from moments near insights)
              </span>
            </h2>
            <div className="space-y-3">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {items.map((segment: any, i: number) => (
                <Card key={i} className="p-4 bg-muted/30 border-l-4 border-l-primary">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">
                      {formatTime(segment.start)}
                    </span>
                    {segment.speaker && <Badge variant="outline" className="text-xs">{segment.speaker}</Badge>}
                  </div>
                  <p className="text-base italic leading-relaxed">&ldquo;{segment.text}&rdquo;</p>
                </Card>
              ))}
            </div>
          </div>
        ) : null;
      }

      case "persona": {
        const personaIndex = parseInt(slide.id.replace("persona-", ""));
        const persona = personas[personaIndex];
        return persona ? (
          <div className="flex-1 flex items-start justify-center p-2 md:p-4 overflow-hidden">
            <PersonaCard persona={persona} />
          </div>
        ) : null;
      }

      case "end":
        return (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8">
            <CheckCircle2 className="w-20 h-20 text-green-500" />
            <h1 className="text-4xl font-bold">Thank You</h1>
            <p className="text-xl text-muted-foreground max-w-xl">
              This concludes the research presentation for {project.name}
            </p>

            <div className="grid grid-cols-3 gap-8 mt-8">
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">{stats.interviewCount}</p>
                <p className="text-sm text-muted-foreground">Interviews</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">{stats.totalInsights}</p>
                <p className="text-sm text-muted-foreground">Insights</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">{crossThemes.length}</p>
                <p className="text-sm text-muted-foreground">Cross-Themes</p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mt-12">
              Powered by <span className="text-primary font-medium">Skripta</span>
            </p>
          </div>
        );

      default:
        return null;
    }
  }
}
