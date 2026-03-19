// components/InterviewContent.tsx
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  FileText, 
  Lightbulb, 
  FileSpreadsheet, 
  Sparkles, 
  ArrowLeft,
  ArrowRight,
  Download,
  Search,
  Filter,
  CircuitBoard,
  CheckCircle,
  Circle,
  Loader2
} from "lucide-react";
import { useAnalysis } from "@/hooks/useAnalysis";
import { ExportDialog } from "./ExportDialog";
import { LiveNotesPanel } from "./LiveNotesPanel";
import { useState, useRef, useMemo, useEffect } from "react";
import { ExportInterview, Insight } from "@/types";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { Plus, Trash, ChevronLeft, ChevronRight, StickyNote } from "lucide-react";
import { Group, Panel, Separator } from "react-resizable-panels";

interface InterviewContentProps {
  projectId: Id<"projects">;
  interviewId: Id<"interviews">;
}

type InterviewStage = "transcription" | "analysis" | "summary";

export function InterviewContent({ projectId, interviewId }: InterviewContentProps) {
  const router = useRouter();
  const { analyzeInterview, generateInterviewSummary } = useAnalysis();
  const createManualInsight = useMutation(api.insights.createManualInsight);
  const deleteInsight = useMutation(api.insights.deleteInsight);
  const [activeTab, setActiveTab] = useState<string>("transcription");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  
  // Audio playback state
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Manual insight creation
  const [showAddInsight, setShowAddInsight] = useState(false);
  const [newInsightText, setNewInsightText] = useState("");
  const [newInsightType, setNewInsightType] = useState<Insight['type']>('insight');
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [insightFilter, setInsightFilter] = useState<string | null>(null);

  // Live Notes panel toggle
  const [showLiveNotes, setShowLiveNotes] = useState(true);

  // Speaker colors
  const getSpeakerColor = (speaker: string | undefined) => {
    if (!speaker) return 'bg-primary/10 text-primary';
    const speakerNum = parseInt(speaker.replace(/\D/g, '')) || 1;
    const colors = [
      'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
      'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
      'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
    ];
    return colors[(speakerNum - 1) % colors.length];
  };

  const getSpeakerLabel = (speaker: string | undefined) => {
    if (!speaker) return 'Speaker';
    const speakerNum = speaker.replace(/\D/g, '');
    return `Speaker ${speakerNum}`;
  };

  // Handle audio time update
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      // Space bar: pause/play audio
      if (e.code === "Space" && audioRef.current) {
        e.preventDefault();
        if (audioRef.current.paused) {
          audioRef.current.play();
        } else {
          audioRef.current.pause();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Récupérer les données
  const project = useQuery(api.projects.getById, { projectId });
  const interview = useQuery(api.interviews.getById, { interviewId });
  const insights = useQuery(api.insights.getByInterview, { interviewId });
  const projectInterviews = useQuery(api.interviews.getProjectInterviews, { projectId });

  // Determine current stage based on data
  const currentStage = useMemo<InterviewStage>(() => {
    if (interview?.summary) return "summary";
    if (insights && insights.length > 0) return "analysis";
    return "transcription";
  }, [interview, insights]);

  // Stage configuration
  const stages: { id: InterviewStage; label: string; icon: React.ReactNode }[] = [
    { id: "transcription", label: "Transcription", icon: <FileText className="w-4 h-4" /> },
    { id: "analysis", label: "Analysis", icon: <Sparkles className="w-4 h-4" /> },
    { id: "summary", label: "Summary", icon: <FileSpreadsheet className="w-4 h-4" /> },
  ];

  const getStageStatus = (stageId: InterviewStage) => {
    const stageOrder: InterviewStage[] = ["transcription", "analysis", "summary"];
    const currentIndex = stageOrder.indexOf(currentStage);
    const stageIndex = stageOrder.indexOf(stageId);
    
    // If all stages are complete (summary exists), show all as complete
    if (interview?.summary) return "complete";
    
    if (stageIndex < currentIndex) return "complete";
    if (stageIndex === currentIndex) return "active";
    return "pending";
  };

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Gérer le cas où l'interview n'est pas trouvée
  if (!interview || !project) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" onClick={() => router.push(`/project/${projectId}/interview`)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Interviews
          </Button>
          <h1 className="text-2xl font-bold">Interview not found</h1>
        </div>
      </div>
    );
  }

  // Préparer les données pour l'export
  const interviewForExport: ExportInterview = {
    id: interview._id,
    title: interview.title,
    topic: interview.topic,
    transcription: interview.transcription,
    segments: interview.segments,
    duration: interview.duration,
    insights: insights?.map(insight => ({
      id: insight._id,
      type: insight.type,
      text: insight.text,
      timestamp: insight.timestamp,
      segmentId: undefined,
      createdAt: new Date(insight.createdAt).toISOString(),
    })) || [],
    createdAt: new Date(interview._creationTime).toISOString(),
  };

  // Filter insights by type
  const filteredInsights = insights?.filter(insight => {
    const matchesFilter = !insightFilter || insight.type === insightFilter;
    const matchesSearch = !searchQuery || 
      insight.text.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  }) || [];

  // Filter segments by search
  const filteredSegments = interview.segments.filter(segment => 
    !searchQuery || segment.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      await analyzeInterview(
        interview._id,
        projectId,
        interview.transcription,
        interview.topic,
        interview.segments
      );
      toast.success("Analysis completed successfully");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Analysis failed';
      setAnalysisError(errorMessage);
      toast.error("Analysis failed");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerateSummary = async () => {
    setIsGeneratingSummary(true);
    setSummaryError(null);

    try {
      if (!projectId) {
        throw new Error('Project ID is required');
      }

      await generateInterviewSummary(
        interview._id,
        projectId,
        interview.transcription,
        interview.topic,
        insights?.map(insight => ({
          id: insight._id,
          type: insight.type,
          text: insight.text,
          timestamp: insight.timestamp,
          source: insight.source,
          createdBy: insight.createdBy,
          createdByName: insight.createdByName,
          createdAt: new Date(insight._creationTime).toISOString(),
          projectId: insight.projectId,
          interviewId: insight.interviewId,
        })) || []
      );
      toast.success("Summary generated successfully");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Summary generation failed';
      setSummaryError(errorMessage);
      toast.error("Failed to generate summary");
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleCreateManualInsight = async () => {
    if (!newInsightText.trim()) return;

    try {
      await createManualInsight({
        interviewId,
        projectId,
        type: newInsightType,
        text: newInsightText.trim(),
        timestamp: 0,
      });
      toast.success("Insight added");
      setNewInsightText("");
      setNewInsightType('insight');
      setShowAddInsight(false);
    } catch (error) {
      console.error("Failed to create insight:", error);
      toast.error("Failed to add insight");
    }
  };

  const handleDeleteInsight = async (insightId: string) => {
    try {
      await deleteInsight({ insightId: insightId as Id<"insights"> });
      toast.success("Insight deleted");
    } catch (error) {
      console.error("Failed to delete insight:", error);
      toast.error("Failed to delete insight");
    }
  };

  // Trouver l'index actuel pour la navigation
  const currentIndex = projectInterviews?.findIndex(i => i._id === interviewId) || 0;
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < (projectInterviews?.length || 0) - 1;
  const previousInterview = hasPrevious ? projectInterviews?.[currentIndex - 1] : null;
  const nextInterview = hasNext ? projectInterviews?.[currentIndex + 1] : null;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header avec navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push(`/project/${projectId}/interview`)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          {/* Navigation entre interviews */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              disabled={!hasPrevious}
              onClick={() => router.push(`/project/${projectId}/interview/${previousInterview?._id}`)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            <span className="text-sm text-muted-foreground px-2">
              {currentIndex + 1} / {projectInterviews?.length}
            </span>
            
            <Button
              variant="outline"
              size="icon"
              disabled={!hasNext}
              onClick={() => router.push(`/project/${projectId}/interview/${nextInterview?._id}`)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => router.push(`/project/${projectId}/affinity/`)}
            className="gap-2"
          >
            <CircuitBoard className="w-4 h-4" />
            Affinity Map
          </Button>
          <ExportDialog 
            interview={interviewForExport}
            trigger={
              <Button variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                Export
              </Button>
            }
          />
        </div>
      </div>

      {/* Interview Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <img 
                  src="/logomark.svg" 
                  alt="Skripta" 
                  className="w-8 h-8 object-contain"
                />
                <h1 className="text-3xl font-bold">{interview.title}</h1>
              </div>
              {interview.topic && (
                <p className="text-lg text-muted-foreground">{interview.topic}</p>
              )}
              {interview.audioUrl && (
                <div className="flex items-center gap-2 mt-2">
                  <audio 
                    ref={audioRef}
                    controls 
                    className="h-8 w-64"
                    src={interview.audioUrl}
                    onTimeUpdate={handleTimeUpdate}
                  >
                    Your browser does not support the audio element.
                  </audio>
                </div>
              )}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>
                  <FileText className="w-4 h-4 inline mr-1" />
                  {Math.floor(interview.duration / 60)}:
                  {String(Math.floor(interview.duration % 60)).padStart(2, '0')} min
                </span>
                <span>
                  <FileText className="w-4 h-4 inline mr-1" />
                  {interview.segments.length} segments
                </span>
                <span>
                  {new Date(interview._creationTime).toLocaleDateString()}
                </span>
              </div>
            </div>
            
            <Badge variant={interview.status === 'completed' ? 'default' : 'secondary'}>
              {interview.status}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Stage Progress Indicator */}
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Progress:</span>
            </div>
            <div className="flex items-center gap-1">
              {stages.map((stage, index) => {
                const status = getStageStatus(stage.id);
                return (
                  <div key={stage.id} className="flex items-center">
                    <button
                      onClick={() => setActiveTab(stage.id === "transcription" ? "transcription" : stage.id === "analysis" ? "insights" : "summary")}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors ${
                        status === "active" 
                          ? "bg-primary text-primary-foreground font-medium" 
                          : status === "complete"
                          ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {status === "complete" ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : status === "active" ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Circle className="w-4 h-4" />
                      )}
                      {stage.label}
                    </button>
                    {index < stages.length - 1 && (
                      <div className={`w-8 h-0.5 mx-1 ${
                        getStageStatus(stages[index + 1].id) !== "pending" 
                          ? "bg-green-500" 
                          : "bg-muted"
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="transcription" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Transcription
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            Insights
            {insights && insights.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                {insights.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="summary" className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            Summary
            {interview?.summary && (
              <CheckCircle className="w-3 h-3 ml-1 text-green-500" />
            )}
          </TabsTrigger>
        </TabsList>

        {/* Transcription Tab with Live Notes */}
        <TabsContent value="transcription">
          <div className="flex items-center gap-2 mb-4">
            <Button
              variant={showLiveNotes ? "default" : "outline"}
              size="sm"
              onClick={() => setShowLiveNotes(!showLiveNotes)}
              className="gap-2"
            >
              <StickyNote className="w-4 h-4" />
              {showLiveNotes ? "Hide" : "Show"} Live Notes
            </Button>
            {showLiveNotes && (
              <span className="text-sm text-muted-foreground">
                Take notes while listening — they'll be timestamped automatically
              </span>
            )}
          </div>

          <Group>
            <Panel defaultSize={showLiveNotes ? 65 : 100} minSize={30}>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Full Transcription</CardTitle>
                      <CardDescription>
                        Complete interview transcription with timestamps
                        {searchQuery && <span className="ml-2 text-primary">• {filteredSegments.length} results</span>}
                      </CardDescription>
                    </div>
                    {/* Search in transcription */}
                    <div className="relative w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search transcription..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                    {(searchQuery ? filteredSegments : interview.segments).map((segment) => {
                      const isActive = currentTime >= segment.start && currentTime < segment.end;
                      return (
                        <div 
                          key={segment.id}
                          className={`p-3 rounded-lg transition-all cursor-pointer ${
                            isActive 
                              ? 'bg-primary/20 border border-primary shadow-sm' 
                              : 'hover:bg-accent'
                          }`}
                          onClick={() => {
                            if (audioRef.current) {
                              audioRef.current.currentTime = segment.start;
                            }
                          }}
                        >
                          <div className="flex gap-3 items-start">
                            <span className={`text-sm font-mono mt-0.5 min-w-[60px] flex-shrink-0 ${
                              isActive ? 'text-primary font-semibold' : 'text-muted-foreground'
                            }`}>
                              {Math.floor(segment.start / 60)}:
                              {String(Math.floor(segment.start % 60)).padStart(2, '0')}
                            </span>
                            {segment.speaker && (
                              <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${getSpeakerColor(segment.speaker)}`}>
                                {getSpeakerLabel(segment.speaker)}
                              </span>
                            )}
                            <p className={`text-foreground leading-relaxed flex-1 ${isActive ? 'font-medium' : ''}`}>
                              {searchQuery ? (
                                segment.text.split(new RegExp(`(${searchQuery})`, 'gi')).map((part, i) => 
                                  part.toLowerCase() === searchQuery.toLowerCase() ? (
                                    <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 px-0.5 rounded">{part}</mark>
                                  ) : part
                                )
                              ) : segment.text}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    {searchQuery && filteredSegments.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No results found for &quot;{searchQuery}&quot;</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Panel>

            {showLiveNotes && (
              <>
                <Separator />
                <Panel defaultSize={35} minSize={20}>
                  <Card className="h-full">
                    <LiveNotesPanel
                      interviewId={interviewId}
                      projectId={projectId}
                      audioRef={audioRef}
                      currentTime={currentTime}
                      onTimeChange={(time) => {
                        setCurrentTime(time);
                      }}
                    />
                  </Card>
                </Panel>
              </>
            )}
          </Group>
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Interview Insights</CardTitle>
                  <CardDescription>
                    Key findings extracted from the interview
                    {insightFilter && <span className="ml-2 text-primary">• Filtered</span>}
                  </CardDescription>
                </div>
                {/* Filter by type */}
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search insights..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-48"
                    />
                  </div>
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <div className="flex gap-1">
                    <Button
                      variant={!insightFilter ? "default" : "outline"}
                      size="sm"
                      onClick={() => setInsightFilter(null)}
                      className="text-xs"
                    >
                      All
                    </Button>
                    {["pain-point", "quote", "insight", "follow-up"].map((type) => (
                      <Button
                        key={type}
                        variant={insightFilter === type ? "default" : "outline"}
                        size="sm"
                        onClick={() => setInsightFilter(type)}
                        className="text-xs capitalize"
                      >
                        {type}
                      </Button>
                    ))}
                  </div>
                  <Dialog open={showAddInsight} onOpenChange={setShowAddInsight}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="w-4 h-4 mr-1" />
                        Add
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Manual Insight</DialogTitle>
                        <DialogDescription>
                          Add your own insight to this interview.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="flex gap-1 flex-wrap">
                          {[
                            { value: 'pain-point', label: 'Pain', color: 'bg-destructive/20 text-destructive border-destructive' },
                            { value: 'quote', label: 'Quote', color: 'bg-primary/20 text-primary border-primary' },
                            { value: 'insight', label: 'Insight', color: 'bg-secondary text-secondary-foreground border-secondary' },
                            { value: 'follow-up', label: 'Follow-up', color: 'bg-green-500/20 text-green-600 dark:text-green-400 border-green-500' },
                          ].map(({ value, label, color }) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() => setNewInsightType(value as Insight['type'])}
                              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                                newInsightType === value
                                  ? `${color} border-2`
                                  : 'bg-muted border border-border text-muted-foreground hover:bg-accent'
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                        
                        <textarea
                          value={newInsightText}
                          onChange={(e) => setNewInsightText(e.target.value)}
                          placeholder="Type your insight..."
                          className="w-full px-3 py-2 text-sm border border-input rounded-lg resize-none focus:ring-2 focus:ring-ring focus:border-transparent bg-background"
                          rows={3}
                        />
                        
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setShowAddInsight(false);
                              setNewInsightText("");
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleCreateManualInsight}
                            disabled={!newInsightText.trim()}
                            className="bg-primary hover:bg-primary/90"
                          >
                            Add Insight
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {!insights || insights.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <Lightbulb className="w-10 h-10 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">No insights yet</h3>
                  <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                    Extract key findings from this interview automatically using AI. 
                    We'll identify pain points, quotes, insights, and follow-up questions.
                  </p>
                  <div className="flex flex-col items-center gap-4">
                    <Button 
                      size="lg" 
                      onClick={handleAnalyze}
                      disabled={isAnalyzing}
                      className="gap-2"
                    >
                      {isAnalyzing ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Analyze Interview
                        </>
                      )}
                    </Button>
                    {analysisError && (
                      <p className="text-destructive text-sm">{analysisError}</p>
                    )}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      Est. time: ~30 seconds
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4">
                  {filteredInsights.map((insight) => (
                    <Card key={insight._id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <Badge variant={
                            insight.type === 'pain-point' ? 'destructive' :
                            insight.type === 'quote' ? 'default' :
                            insight.type === 'insight' ? 'secondary' : 'outline'
                          }>
                            {insight.type}
                          </Badge>
                          <div className="flex items-center gap-2">
                            {insight.source === 'manual' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleDeleteInsight(insight._id)}
                              >
                                <Trash className="h-3 w-3" />
                              </Button>
                            )}
                            <span className="text-sm text-muted-foreground font-mono">
                              {Math.floor(insight.timestamp / 60)}:
                              {String(Math.floor(insight.timestamp % 60)).padStart(2, '0')}
                            </span>
                          </div>
                        </div>
                        <p className="text-foreground">{insight.text}</p>
                        <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                          <span>Source: {insight.source}</span>
                          <span>{new Date(insight._creationTime).toLocaleDateString()}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {filteredInsights.length === 0 && insights && insights.length > 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No insights match your filter</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Summary Tab */}
        <TabsContent value="summary">
          <div className="grid gap-6">
            {summaryError && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-destructive text-sm">{summaryError}</p>
              </div>
            )}

            {/* Header avec bouton de génération */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Interview Summary</CardTitle>
                    <CardDescription>
                      AI-generated executive summary and key findings
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Affichage du résumé */}
            {interview.summary ? (
              <>
                {/* Executive Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle>Executive Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose max-w-none">
                      <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                        {interview.summary.executiveSummary}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Key Points */}
                <Card>
                  <CardHeader>
                    <CardTitle>Key Points</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {interview.summary.keyPoints.map((point, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                          <span className="text-foreground">{point}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                {/* Recommendations */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {interview.summary.recommendations.map((recommendation, index) => (
                        <li key={index} className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                          <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                          <span className="text-foreground">{recommendation}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                {/* Main Themes */}
                <Card>
                  <CardHeader>
                    <CardTitle>Main Themes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {interview.summary.mainThemes.map((theme, index) => (
                        <Badge key={index} variant="secondary" className="text-sm">
                          {theme}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Critical Issues */}
                {interview.summary.criticalIssues.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-destructive">Critical Issues</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {interview.summary.criticalIssues.map((issue, index) => (
                          <li key={index} className="flex items-start gap-3 p-3 bg-destructive/5 rounded-lg">
                            <div className="w-2 h-2 bg-destructive rounded-full mt-2 flex-shrink-0" />
                            <span className="text-destructive">{issue}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              // État vide - pas de résumé
              <Card>
                <CardContent className="text-center py-16">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-secondary/20 flex items-center justify-center">
                    <FileSpreadsheet className="w-10 h-10 text-secondary-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">No Summary Yet</h3>
                  {!insights || insights.length === 0 ? (
                    <>
                      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                        Generate an AI-powered executive summary with key findings and recommendations.
                      </p>
                      <div className="flex flex-col items-center gap-4">
                        <p className="text-sm text-muted-foreground">
                          First, you need to analyze the interview to extract insights.
                        </p>
                        <div className="flex items-center gap-3">
                          {isAnalyzing && (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                          )}
                          <Button 
                            onClick={handleAnalyze}
                            disabled={isAnalyzing}
                            className="gap-2"
                          >
                            {isAnalyzing ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Analyzing...
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-4 h-4" />
                                Analyze Interview
                              </>
                            )}
                          </Button>
                        </div>
                        {analysisError && (
                          <p className="text-destructive text-sm">{analysisError}</p>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                        Your {insights.length} insights are ready. Generate an AI-powered executive summary 
                        with key points, recommendations, and main themes.
                      </p>
                      <Button 
                        onClick={handleGenerateSummary} 
                        disabled={isGeneratingSummary}
                        size="lg"
                        className="gap-2"
                      >
                        {isGeneratingSummary ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Generating Summary...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            Generate AI Summary
                          </>
                        )}
                      </Button>
                      {isGeneratingSummary && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                          <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                          Est. time: ~20 seconds
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}