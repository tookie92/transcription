// components/InterviewContent.tsx
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  ArrowLeft,
  Download,
  Search,
  CheckCircle2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Plus,
  Trash,
  Clock,
  Lightbulb,
  Sparkles,
  AlertTriangle,
  Quote,
  ListChecks,
  PenLine,
} from "lucide-react";
import { useAnalysis } from "@/hooks/useAnalysis";
import { ExportDialog } from "./ExportDialog";
import { AudioPlayer, AudioPlayerHandle } from "./AudioPlayer";
import { useState, useRef, useEffect } from "react";
import { ExportInterview, Insight } from "@/types";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { motion } from "framer-motion";
import Link from "next/link";

interface InterviewContentProps {
  projectId: Id<"projects">;
  interviewId: Id<"interviews">;
}

const insightTypeConfig: Record<Exclude<Insight['type'], undefined>, { icon: React.ComponentType<{ className?: string }>; color: string; bg: string; label: string }> = {
  "pain-point": { icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50", label: "Pain Point" },
  "quote": { icon: Quote, color: "text-[#4CA771]", bg: "bg-[#4CA771]/10", label: "Quote" },
  "insight": { icon: Lightbulb, color: "text-amber-600", bg: "bg-amber-50", label: "Insight" },
  "follow-up": { icon: ListChecks, color: "text-green-600", bg: "bg-green-50", label: "Follow-up" },
  "custom": { icon: Sparkles, color: "text-violet-600", bg: "bg-violet-50", label: "Custom" },
};

const speakerColors = [
  "bg-blue-100 text-blue-800",
  "bg-green-100 text-green-800",
  "bg-purple-100 text-purple-800",
  "bg-orange-100 text-orange-800",
  "bg-pink-100 text-pink-800",
  "bg-teal-100 text-teal-800",
];

export function InterviewContent({ projectId, interviewId }: InterviewContentProps) {
  const router = useRouter();
  const { analyzeInterview, generateInterviewSummary } = useAnalysis();
  const createManualInsight = useMutation(api.insights.createManualInsight);
  const deleteInsight = useMutation(api.insights.deleteInsight);
  
  const [activeTab, setActiveTab] = useState<string>("transcription");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddInsight, setShowAddInsight] = useState(false);
  const [newInsightText, setNewInsightText] = useState("");
  const [newInsightType, setNewInsightType] = useState<Insight['type']>('insight');
  
  const audioPlayerRef = useRef<AudioPlayerHandle>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === "Space") {
        e.preventDefault();
        audioPlayerRef.current?.getCurrentTime() === 0 
          ? audioPlayerRef.current?.play()
          : audioPlayerRef.current?.pause();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const isValidProjectId = projectId && !projectId.includes("affinity");
  const project = useQuery(api.projects.getById, isValidProjectId ? { projectId } : "skip");
  const interview = useQuery(api.interviews.getById, { interviewId });
  const insights = useQuery(api.insights.getByInterview, { interviewId });
  const projectInterviews = useQuery(api.interviews.getProjectInterviews, isValidProjectId ? { projectId } : "skip");

  const currentIndex = projectInterviews?.findIndex(i => i._id === interviewId) || 0;

  const filteredSegments = interview?.segments.filter(s => !searchQuery || s.text.toLowerCase().includes(searchQuery.toLowerCase())) || [];
  const filteredInsights = insights?.filter(i => !searchQuery || i.text.toLowerCase().includes(searchQuery.toLowerCase())) || [];

  if (!interview || !project) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  const handleAnalyzeAndSummary = async () => {
    setIsAnalyzing(true);
    setIsGeneratingSummary(true);
    try {
      // Step 1: Analyze to generate AI insights
      await analyzeInterview(interview._id, projectId, interview.transcription, interview.topic, interview.language, interview.segments);
      toast.success("Analysis complete");
      setActiveTab("insights");
      
      // Step 2: Generate summary from all insights (manual + AI)
      await generateInterviewSummary(
        interview._id, projectId, interview.transcription, interview.topic, interview.language,
        insights?.map(i => ({ id: i._id, type: i.type, text: i.text, timestamp: i.timestamp, source: i.source, createdBy: i.createdBy, createdByName: i.createdByName, createdAt: new Date(i._creationTime).toISOString(), projectId: i.projectId, interviewId: i.interviewId })) || []
      );
      toast.success("Summary generated");
      setActiveTab("summary");
    } catch (error) {
      console.error(error);
      toast.error("Failed to analyze or generate summary");
    } finally {
      setIsAnalyzing(false);
      setIsGeneratingSummary(false);
    }
  };

  const handleGenerateSummary = async () => {
    setIsGeneratingSummary(true);
    try {
      await generateInterviewSummary(
        interview._id, projectId, interview.transcription, interview.topic, interview.language,
        insights?.map(i => ({ id: i._id, type: i.type, text: i.text, timestamp: i.timestamp, source: i.source, createdBy: i.createdBy, createdByName: i.createdByName, createdAt: new Date(i._creationTime).toISOString(), projectId: i.projectId, interviewId: i.interviewId })) || []
      );
      toast.success("Summary generated");
    } catch {
      toast.error("Generation failed");
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleCreateInsight = async () => {
    if (!newInsightText.trim()) return;
    try {
      const timestamp = audioPlayerRef.current?.getCurrentTime() ?? 0;
      await createManualInsight({ interviewId, projectId, type: newInsightType, text: newInsightText.trim(), timestamp });
      toast.success("Note added");
      setNewInsightText("");
    } catch {
      toast.error("Failed to add");
    }
  };

  const handleDeleteInsight = async (id: string) => {
    try {
      await deleteInsight({ insightId: id as Id<"insights"> });
      toast.success("Deleted");
    } catch {
      toast.error("Failed to delete");
    }
  };

  const interviewForExport: ExportInterview = {
    id: interview._id,
    title: interview.title,
    topic: interview.topic,
    transcription: interview.transcription,
    segments: interview.segments,
    duration: interview.duration,
    insights: insights?.map(i => ({ id: i._id, type: i.type, text: i.text, timestamp: i.timestamp, segmentId: undefined, createdAt: new Date(i.createdAt).toISOString() })) || [],
    createdAt: new Date(interview._creationTime).toISOString(),
  };

  const getSpeakerClass = (speaker: string | undefined) => {
    const num = parseInt(speaker?.replace(/\D/g, '') || "1");
    return speakerColors[(num - 1) % speakerColors.length];
  };

if (activeTab !== "transcription") {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <header className="sticky top-0 z-40 bg-background border-b border-border">
          <div className="max-w-4xl mx-auto px-6 py-3">
            {/* Row 1: Back + Navigation + Export */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" asChild className="hover:bg-accent -ml-2">
                  <Link href={`/project/${projectId}`}>
                    <ArrowLeft className="w-5 h-5" />
                  </Link>
                </Button>
                <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                  <Button variant="ghost" size="icon" className="h-6 w-6" disabled={currentIndex === 0} onClick={() => router.push(`/project/${projectId}/interview/${projectInterviews?.[currentIndex - 1]?._id}`)}>
                    <ChevronLeft className="w-3 h-3" />
                  </Button>
                  <span className="text-xs text-muted-foreground px-1 min-w-[30px] text-center">{currentIndex + 1}/{projectInterviews?.length}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" disabled={currentIndex >= (projectInterviews?.length || 0) - 1} onClick={() => router.push(`/project/${projectId}/interview/${projectInterviews?.[currentIndex + 1]?._id}`)}>
                    <ChevronRight className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => router.push(`/project/${projectId}/interview/${interviewId}/mode`)} className="h-8 text-xs border-border text-foreground hover:bg-accent">
                  <PenLine className="w-3 h-3 mr-1" />
                  Focus Mode
                </Button>
                <ExportDialog interview={interviewForExport} trigger={<Button variant="outline" size="sm" className="h-8 text-xs border-border text-foreground hover:bg-accent"><Download className="w-3 h-3 mr-1" />Export</Button>} />
              </div>
            </div>
            
            {/* Row 2: Title + Duration + Segments */}
            <div className="mb-3">
              <h1 className="text-xl font-bold text-foreground">{interview.title}</h1>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{Math.floor(interview.duration / 60)}:{String(interview.duration % 60).padStart(2, '0')}</span>
                <span>•</span>
                <span>{interview.segments.length} segments</span>
              </div>
            </div>
            
            {/* Audio Player Row - always visible if exists */}
            {interview.audioUrl && (
              <div className="mb-3 bg-card rounded-xl px-4 py-2.5 border border-border">
                <AudioPlayer ref={audioPlayerRef} src={interview.audioUrl} onTimeUpdate={setCurrentTime} />
              </div>
            )}
            
            {/* Tabs Row */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full -ml-2">
              <TabsList className="bg-transparent border-b-0 rounded-none h-9 p-0 gap-1">
                <TabsTrigger value="transcription" className="rounded-md data-[state=active]:bg-[#4CA771] data-[state=active]:text-white px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-all">
                  <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />
                  Transcription
                </TabsTrigger>
                <TabsTrigger value="insights" className="rounded-md data-[state=active]:bg-[#4CA771] data-[state=active]:text-white px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-all">
                  <Lightbulb className="w-3.5 h-3.5 mr-1.5" />
                  Insights
                  {insights && insights.length > 0 && <span className="ml-1.5 text-xs bg-white/20 px-1 rounded">{insights.length}</span>}
                </TabsTrigger>
                <TabsTrigger value="summary" className="rounded-md data-[state=active]:bg-[#4CA771] data-[state=active]:text-white px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-all">
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  Summary
                  {interview.summary && <CheckCircle2 className="w-3 h-3 ml-1.5 text-green-400" />}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto w-full">
          <div className="max-w-4xl mx-auto px-6 py-6">
            {activeTab === "insights" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{filteredInsights.length} insights</span>
                  <div className="flex items-center gap-2">
                    <Input placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-48 h-9 bg-background border-input focus:bg-background focus:border-[#4CA771]" />
                    <Dialog open={showAddInsight} onOpenChange={setShowAddInsight}>
                      <DialogTrigger asChild>
                        <Button size="sm" className="bg-[#4CA771] hover:bg-[#3F9A68]"><Plus className="w-4 h-4 mr-1" />Add</Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle className="text-xl">Add Insight</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="flex gap-2 flex-wrap">
                            {Object.entries(insightTypeConfig).map(([key, config]) => (
                              <button key={key} onClick={() => setNewInsightType(key as Insight['type'])} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${newInsightType === key ? `${config.bg} ${config.color} ring-2 ring-offset-2 ring-current` : 'bg-muted text-muted-foreground hover:bg-accent'}`}>
                                {config.label}
                              </button>
                            ))}
                          </div>
                          <textarea value={newInsightText} onChange={e => setNewInsightText(e.target.value)} placeholder="Type your insight..." className="w-full px-3 py-2 text-sm border border-input rounded-lg resize-none min-h-[100px] focus:border-[#4CA771] focus:ring-1 focus:ring-[#4CA771]" />
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setShowAddInsight(false)} className="border-border">Cancel</Button>
                            <Button onClick={handleCreateInsight} disabled={!newInsightText.trim()} className="bg-[#4CA771] hover:bg-[#3F9A68]">Add</Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
                {!insights || insights.length === 0 ? (
                  <div className="text-center py-16 bg-muted rounded-2xl border-2 border-dashed border-border">
                    <Lightbulb className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="font-semibold text-foreground mb-2">No insights yet</h3>
                    <p className="text-sm text-muted-foreground mb-6">Extract insights automatically with AI</p>
                    <Button onClick={handleAnalyzeAndSummary} disabled={isAnalyzing || isGeneratingSummary} className="bg-[#4CA771] hover:bg-[#3F9A68]">
                      {isAnalyzing || isGeneratingSummary ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</> : <><Sparkles className="w-4 h-4 mr-2" />Analyze & Summary</>}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredInsights.map((insight) => {
                      const config = insightTypeConfig[insight.type] || insightTypeConfig.insight;
                      const Icon = config.icon;
                      return (
                        <motion.div key={insight._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="group flex items-start gap-4 p-5 bg-card rounded-xl border border-border hover:border-[#4CA771]/30 hover:shadow-sm transition-all">
                          <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center flex-shrink-0`}>
                            <Icon className={`w-5 h-5 ${config.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                              <span className={`text-xs font-semibold ${config.color}`}>{config.label}</span>
                              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                {insight.source === 'manual' && (
                                  <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-red-50" onClick={() => handleDeleteInsight(insight._id)}>
                                    <Trash className="w-3.5 h-3.5 text-red-500" />
                                  </Button>
                                )}
                                <span className="text-xs text-muted-foreground font-mono">{Math.floor(insight.timestamp / 60)}:{String(Math.floor(insight.timestamp % 60)).padStart(2, '0')}</span>
                              </div>
                            </div>
                            <p className="text-sm leading-relaxed text-foreground">{insight.text}</p>
                          </div>
                        </motion.div>
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
                    <div className="bg-card rounded-2xl border border-border p-6">
                      <h3 className="font-semibold text-foreground mb-3">Executive Summary</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{interview.summary.executiveSummary}</p>
                    </div>
                    <div className="bg-card rounded-2xl border border-border p-6">
                      <h3 className="font-semibold text-foreground mb-4">Key Points</h3>
                      <ul className="space-y-2">
                        {interview.summary.keyPoints.map((point, i) => (
                          <li key={i} className="flex items-start gap-3 text-sm text-foreground">
                            <span className="w-2 h-2 bg-[#4CA771] rounded-full mt-1.5 flex-shrink-0" />
                            {typeof point === 'string' ? point : point.point}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-card rounded-2xl border border-border p-6">
                      <h3 className="font-semibold text-foreground mb-4">Recommendations</h3>
                      <ul className="space-y-2">
                        {interview.summary.recommendations.map((rec, i) => (
                          <li key={i} className="flex items-start gap-3 text-sm text-foreground p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                            <span className="w-2 h-2 bg-green-500 rounded-full mt-1.5 flex-shrink-0" />
                            {typeof rec === 'string' ? rec : rec.recommendation}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {interview.summary.mainThemes.map((theme, i) => (
                        <Badge key={i} variant="secondary" className="px-3 py-1.5">
                          {typeof theme === 'string' ? theme : theme.theme}
                        </Badge>
                      ))}
                    </div>
                    {interview.summary.criticalIssues?.length > 0 && (
                      <div className="bg-red-50 dark:bg-red-950 rounded-2xl border border-red-200 dark:border-red-800 p-6">
                        <h3 className="font-semibold text-red-600 dark:text-red-400 flex items-center gap-2 mb-4">
                          <AlertTriangle className="w-5 h-5" />
                          Critical Issues
                        </h3>
                        <ul className="space-y-2">
                          {interview.summary.criticalIssues.map((issue: any, i: number) => {
                            const text = typeof issue === 'string' ? issue : issue.issue;
                            return <li key={i} className="text-sm p-3 bg-card text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg">{text}</li>;
                          })}
                        </ul>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-16 bg-muted rounded-2xl border-2 border-dashed border-border">
                    <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="font-semibold text-foreground mb-2">No summary yet</h3>
                    <p className="text-sm text-muted-foreground mb-6">Analyze interview and generate insights & summary in one click</p>
                    {!(interview as any).summary?.executiveSummary && (
                      <Button onClick={handleAnalyzeAndSummary} disabled={isAnalyzing || isGeneratingSummary} className="bg-[#4CA771] hover:bg-[#3F9A68]">
                        {isAnalyzing || isGeneratingSummary ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</> : <><Sparkles className="w-4 h-4 mr-2" />Analyze & Summary</>}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-background overflow-hidden">
      {/* Header fixe with light/dark mode */}
      <header className="shrink-0 h-auto bg-background border-b border-border shadow-sm w-full">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild className="hover:bg-accent -ml-2">
                <Link href={`/project/${projectId}`}>
                  <ArrowLeft className="w-5 h-5" />
                </Link>
              </Button>
              <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                <Button variant="ghost" size="icon" className="h-6 w-6" disabled={currentIndex === 0} onClick={() => router.push(`/project/${projectId}/interview/${projectInterviews?.[currentIndex - 1]?._id}`)}>
                  <ChevronLeft className="w-3 h-3" />
                </Button>
                <span className="text-xs text-muted-foreground px-1 min-w-[30px] text-center">{currentIndex + 1}/{projectInterviews?.length}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" disabled={currentIndex >= (projectInterviews?.length || 0) - 1} onClick={() => router.push(`/project/${projectId}/interview/${projectInterviews?.[currentIndex + 1]?._id}`)}>
                  <ChevronRight className="w-3 h-3" />
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => router.push(`/project/${projectId}/interview/${interviewId}/mode`)} className="h-8 text-xs border-border text-foreground hover:bg-accent">
                <PenLine className="w-3 h-3 mr-1" />
                Focus Mode
              </Button>
              <ExportDialog interview={interviewForExport} trigger={<Button variant="outline" size="sm" className="h-8 text-xs border-border text-foreground hover:bg-accent"><Download className="w-3 h-3 mr-1" />Export</Button>} />
            </div>
          </div>
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-foreground">{interview.title}</h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{Math.floor(interview.duration / 60)}:{String(interview.duration % 60).padStart(2, '0')}</span>
              <span>•</span>
              <span>{interview.segments.length} segments</span>
            </div>
          </div>
          {interview.audioUrl && (
            <div className="mb-4 bg-card rounded-xl px-4 py-3 border border-border shadow-sm">
              <AudioPlayer ref={audioPlayerRef} src={interview.audioUrl} onTimeUpdate={setCurrentTime} />
            </div>
          )}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full -ml-2">
            <TabsList className="bg-transparent border-b-0 rounded-none h-10 p-0 gap-2">
              <TabsTrigger value="transcription" className="rounded-lg data-[state=active]:bg-[#4CA771] data-[state=active]:text-white px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-all font-medium">
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Transcription
              </TabsTrigger>
              <TabsTrigger value="insights" className="rounded-lg data-[state=active]:bg-[#4CA771] data-[state=active]:text-white px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-all font-medium">
                <Lightbulb className="w-4 h-4 mr-2" />
                Insights
                {insights && insights.length > 0 && <span className="ml-2 text-xs bg-white/20 px-1.5 py-0.5 rounded-full">{insights.length}</span>}
              </TabsTrigger>
              <TabsTrigger value="summary" className="rounded-lg data-[state=active]:bg-[#4CA771] data-[state=active]:text-white px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-all font-medium">
                <Sparkles className="w-4 h-4 mr-2" />
                Summary
                {interview.summary && <CheckCircle2 className="w-4 h-4 ml-2 text-green-400" />}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </header>

      {/* Transcription Tab - improved readability with theme-aware classes */}
      {activeTab === "transcription" && (
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-6 py-6">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search in transcript..." 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)} 
                className="pl-9 h-10 bg-background border-input shadow-sm" 
              />
            </div>
            <div className="space-y-3">
              {(searchQuery ? filteredSegments : interview.segments).map((segment) => {
                const isActive = currentTime >= segment.start && currentTime < segment.end;
                return (
                  <motion.div 
                    key={segment.id} 
                    initial={{ opacity: 0, y: 5 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    onClick={() => { audioPlayerRef.current?.setCurrentTime(segment.start); audioPlayerRef.current?.play(); }} 
                    className={`p-4 rounded-2xl cursor-pointer transition-all border-2 ${isActive ? 'bg-[#4CA771]/10 border-[#4CA771]/30 shadow-md' : 'hover:bg-accent border-transparent hover:border-border hover:shadow-sm'}`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`text-xs font-mono font-semibold px-2.5 py-1 rounded-lg ${isActive ? 'bg-[#4CA771] text-white shadow-sm' : 'bg-muted text-muted-foreground'}`}>
                        {Math.floor(segment.start / 60)}:{String(Math.floor(segment.start % 60)).padStart(2, '0')}
                      </span>
                      {segment.speaker && (
                        <span className={`text-xs px-2.5 py-1 rounded-lg font-medium ${getSpeakerClass(segment.speaker)}`}>
                          {segment.speaker}
                        </span>
                      )}
                    </div>
                    <p className="text-sm leading-relaxed text-foreground">{segment.text}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
