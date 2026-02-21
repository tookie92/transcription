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
  FileText, 
  Lightbulb, 
  FileSpreadsheet, 
  Sparkles, 
  ArrowLeft, 
  Download,
  Search,
  Filter
} from "lucide-react";
import { useAnalysis } from "@/hooks/useAnalysis";
import { ExportDialog } from "./ExportDialog";
import { useState } from "react";
import { ExportInterview } from "@/types";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";

interface InterviewContentProps {
  projectId: Id<"projects">;
  interviewId: Id<"interviews">;
}

export function InterviewContent({ projectId, interviewId }: InterviewContentProps) {
  const router = useRouter();
  const { analyzeInterview, generateInterviewSummary } = useAnalysis();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [insightFilter, setInsightFilter] = useState<string | null>(null);

  // Récupérer les données
  const project = useQuery(api.projects.getById, { projectId });
  const interview = useQuery(api.interviews.getById, { interviewId });
  const insights = useQuery(api.insights.getByInterview, { interviewId });
  const projectInterviews = useQuery(api.interviews.getProjectInterviews, { projectId });

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
          <Button variant="outline" onClick={() => router.push(`/project/${projectId}`)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Project
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
    isAnalyzing: false,
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
          <Button variant="outline" onClick={() => router.push(`/project/${projectId}`)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Project
          </Button>
          
          {/* Navigation entre interviews */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!hasPrevious}
              onClick={() => router.push(`/project/${projectId}/interview/${previousInterview?._id}`)}
            >
              ← Previous
            </Button>
            
            <span className="text-sm text-gray-500 px-2">
              {currentIndex + 1} of {projectInterviews?.length}
            </span>
            
            <Button
              variant="outline"
              size="sm"
              disabled={!hasNext}
              onClick={() => router.push(`/project/${projectId}/interview/${nextInterview?._id}`)}
            >
              Next →
            </Button>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="flex items-center gap-2 bg-[#3D7C6F] hover:bg-[#2d5f54]"
          >
            {isAnalyzing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Analyze
              </>
            )}
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
              <h1 className="text-3xl font-bold">{interview.title}</h1>
              {interview.topic && (
                <p className="text-lg text-gray-600">{interview.topic}</p>
              )}
              <div className="flex items-center gap-4 text-sm text-gray-500">
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

      {analysisError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">{analysisError}</p>
        </div>
      )}

      {/* Content Tabs */}
      <Tabs defaultValue="transcription" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="transcription" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Transcription
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            Insights
            {insights && insights.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-500 text-white rounded-full">
                {insights.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="summary" className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            Summary
          </TabsTrigger>
        </TabsList>

        {/* Transcription Tab */}
        <TabsContent value="transcription">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Full Transcription</CardTitle>
                  <CardDescription>
                    Complete interview transcription with timestamps
                    {searchQuery && <span className="ml-2 text-blue-600">• {filteredSegments.length} results</span>}
                  </CardDescription>
                </div>
                {/* Search in transcription */}
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
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
                {(searchQuery ? filteredSegments : interview.segments).map((segment) => (
                  <div 
                    key={segment.id}
                    className="hover:bg-gray-50 p-3 rounded-lg transition-colors"
                  >
                    <div className="flex gap-3 items-start">
                      <span className="text-sm font-mono mt-0.5 min-w-[60px] flex-shrink-0 text-gray-500">
                        {Math.floor(segment.start / 60)}:
                        {String(Math.floor(segment.start % 60)).padStart(2, '0')}
                      </span>
                      {segment.speaker && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded flex-shrink-0">
                          {segment.speaker}
                        </span>
                      )}
                      <p className="text-gray-700 leading-relaxed flex-1">
                        {searchQuery ? (
                          segment.text.split(new RegExp(`(${searchQuery})`, 'gi')).map((part, i) => 
                            part.toLowerCase() === searchQuery.toLowerCase() ? (
                              <mark key={i} className="bg-yellow-200 px-0.5 rounded">{part}</mark>
                            ) : part
                          )
                        ) : segment.text}
                      </p>
                    </div>
                  </div>
                ))}
                {searchQuery && filteredSegments.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No results found for &quot;{searchQuery}&quot;</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
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
                    {insightFilter && <span className="ml-2 text-blue-600">• Filtered</span>}
                  </CardDescription>
                </div>
                {/* Filter by type */}
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search insights..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 w-48"
                    />
                  </div>
                  <Filter className="w-4 h-4 text-gray-400" />
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
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {!insights || insights.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Lightbulb className="w-16 h-16 mx-auto mb-3 opacity-50" />
                  <p className="text-lg mb-2">No insights yet</p>
                  <p className="text-sm mb-4">Analyze this interview to extract insights automatically</p>
                  <Button onClick={handleAnalyze} disabled={isAnalyzing}>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Analyze Interview
                  </Button>
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
                          <span className="text-sm text-gray-400 font-mono">
                            {Math.floor(insight.timestamp / 60)}:
                            {String(Math.floor(insight.timestamp % 60)).padStart(2, '0')}
                          </span>
                        </div>
                        <p className="text-gray-700">{insight.text}</p>
                        <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                          <span>Source: {insight.source}</span>
                          <span>{new Date(insight._creationTime).toLocaleDateString()}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {filteredInsights.length === 0 && insights && insights.length > 0 && (
                    <div className="text-center py-8 text-gray-400">
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
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{summaryError}</p>
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
                  {!interview.summary && (
                    <Button
                      onClick={handleGenerateSummary}
                      disabled={isGeneratingSummary}
                      className="flex items-center gap-2 bg-[#3D7C6F] hover:bg-[#2d5f54]"
                    >
                      {isGeneratingSummary ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Generate Summary
                        </>
                      )}
                    </Button>
                  )}
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
                      <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
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
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                          <span className="text-gray-700">{point}</span>
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
                        <li key={index} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                          <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                          <span className="text-gray-700">{recommendation}</span>
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
                      <CardTitle className="text-red-600">Critical Issues</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {interview.summary.criticalIssues.map((issue, index) => (
                          <li key={index} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                            <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0" />
                            <span className="text-red-700">{issue}</span>
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
                <CardContent className="text-center py-12">
                  <FileSpreadsheet className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">
                    No Summary Yet
                  </h3>
                  <p className="text-gray-500 mb-6 max-w-md mx-auto">
                    Generate an AI-powered summary to get executive insights, key findings, and actionable recommendations from this interview.
                  </p>
                  <Button 
                    onClick={handleGenerateSummary} 
                    disabled={isGeneratingSummary}
                    className="bg-[#3D7C6F] hover:bg-[#2d5f54]"
                  >
                    {isGeneratingSummary ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Generating Summary...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate AI Summary
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}