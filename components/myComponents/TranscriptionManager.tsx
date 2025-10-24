'use client';

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentProject } from '@/hooks/useCurrentProject';
import { useAnalysis } from '@/hooks/useAnalysis';
import { Card, CardContent, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Lightbulb, FileSpreadsheet, Sparkles } from 'lucide-react';
import { Button } from '../ui/button';
import { useState } from 'react';
import { ExportDialog } from './ExportDialog';
import { ExportInterview, Interview as StoreInterview } from '@/types'; // ← Import du type
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";

export default function TranscriptionManager() {
  const { analyzeInterview } = useAnalysis();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
   const { currentProjectId, currentInterviewId, setCurrentInterview } = useCurrentProject();
   

  // Récupérer les interviews du projet actuel
 const interviews = useQuery(api.interviews.getProjectInterviews, 
    currentProjectId ? { projectId: currentProjectId as Id<"projects"> } : "skip"
  );

  // Récupérer les insights pour chaque interview
  const currentInterview = currentInterviewId 
    ? interviews?.find(i => i._id === currentInterviewId)
    : null;


  // test
  

  const insights = useQuery(api.insights.getByInterview, 
    currentInterview?._id ? { interviewId: currentInterview._id } : "skip"
  );

 const handleAnalyze = async () => {
  if (!currentInterview || !currentProjectId) return;

  const toastId = toast.loading("Analyzing interview for insights..."); // ← NOUVEAU
  
  setIsAnalyzing(true);
  setAnalysisError(null);

  try {
    await analyzeInterview(
      currentInterview._id,
      currentProjectId,
      currentInterview.transcription,
      currentInterview.topic,
      currentInterview.segments
    );
    
    toast.success("Analysis complete! Insights extracted.", { // ← NOUVEAU
      id: toastId,
      duration: 3000,
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Analysis failed';
    setAnalysisError(errorMessage);
    
    toast.error(`Analysis failed: ${errorMessage}`, { // ← NOUVEAU
      id: toastId,
      duration: 4000,
    });
  } finally {
    setIsAnalyzing(false);
  }
};


  // Si pas d'interview sélectionnée, afficher la liste
  if (currentProjectId && !currentInterview) {
    return (
      <Card className="bg-white rounded-2xl shadow-lg p-8 w-1/2">
        <CardContent>
          <h3 className="text-lg font-semibold mb-4">Select an Interview</h3>
          <div className="space-y-2">
            {interviews?.map(interview => (
              <Button
                key={interview._id}
                variant="outline"
                className="w-full justify-start"
                onClick={() => setCurrentInterview(interview._id)}
              >
                <FileText className="w-4 h-4 mr-2" />
                {interview.title}
              </Button>
            ))}
            {interviews?.length === 0 && (
              <p className="text-gray-500 text-center py-8">
                No interviews in this project yet
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Adapter l'interface pour utiliser les données Convex
 // Adapter l'interface pour utiliser les données Convex
 // Adapter l'interface pour utiliser les données Convex
  const interviewForExport: ExportInterview | null = currentInterview ? {
    id: currentInterview._id,
    title: currentInterview.title,
    topic: currentInterview.topic,
    transcription: currentInterview.transcription,
    segments: currentInterview.segments,
    duration: currentInterview.duration,
    insights: insights?.map(insight => ({
      id: insight._id,
      type: insight.type,
      text: insight.text,
      timestamp: insight.timestamp,
      segmentId: undefined,
      createdAt: new Date(insight.createdAt).toISOString(),
    })) || [],
    isAnalyzing: false,
    createdAt: new Date(currentInterview.createdAt).toISOString(),
  } : null;

  return (
    <Card className="bg-white rounded-2xl max-h-[500px] shadow-lg p-8 w-1/2">
      <CardTitle>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Transcription
        </h2>
      </CardTitle>
      <CardContent>
        {!currentInterview ? (
          <div className="flex items-center justify-center h-64 text-gray-400">
            <div className="text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>No interviews yet</p>
              <p className="text-xs mt-1">Upload audio to start transcription</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Metadata Header */}
            <div className="flex items-center justify-between pb-4 border-b">
              <div className="flex items-center gap-3">
                <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentInterview(null)}
                className="mr-2"
              >
                ← Back
              </Button>
                <div className="w-10 h-10 bg-[#3D7C6F] bg-opacity-10 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-[#3D7C6F]" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{currentInterview.title}</h3>
                  <p className="text-sm text-gray-500">
                    {Math.floor(currentInterview.duration / 60)}:
                    {String(Math.floor(currentInterview.duration % 60)).padStart(2, '0')} min
                    {currentInterview.topic && (
                      <span className="ml-2 text-[#3D7C6F]">• {currentInterview.topic}</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="flex items-center gap-2 bg-[#3D7C6F] hover:bg-[#2d5f54]"
                  size="sm"
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
                {interviewForExport && (
                  <ExportDialog 
                    interview={interviewForExport}
                    trigger={
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-[#3D7C6F] border-[#3D7C6F]"
                      >
                        Export
                      </Button>
                    }
                  />
                )}
              </div>
            </div>

            {analysisError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{analysisError}</p>
              </div>
            )}

            {/* Tabs */}
            <Tabs defaultValue="transcription" className="w-full max-h-[450px]">
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

              {/* Tab 1: Transcription */}
              <TabsContent value="transcription" className="mt-4">
                <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2">
                  {currentInterview.segments.map((segment) => (
                    <div key={segment.id} className="group hover:bg-gray-50 p-2 rounded-lg transition-colors">
                      <div className="flex gap-3">
                        <span className="text-xs text-gray-400 font-mono mt-1 min-w-[60px]">
                          {Math.floor(segment.start / 60)}:
                          {String(Math.floor(segment.start % 60)).padStart(2, '0')}
                        </span>
                        <p className="text-gray-700 leading-relaxed flex-1 text-sm">
                          {segment.text}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              {/* Tab 2: Insights */}
              <TabsContent value="insights" className="mt-4">
                <div className="space-y-4 max-h-[200px] overflow-y-auto pr-2">
                  {!insights || insights.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <Lightbulb className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">No insights yet</p>
                      <p className="text-xs mt-1">Click {"Analyze"} to extract insights automatically</p>
                    </div>
                  ) : (
                    insights.map((insight) => (
                      <div
                        key={insight._id}
                        className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            insight.type === 'pain-point' 
                              ? 'bg-red-100 text-red-700'
                              : insight.type === 'quote'
                              ? 'bg-blue-100 text-blue-700'
                              : insight.type === 'insight'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {insight.type}
                          </span>
                          <span className="text-xs text-gray-400 font-mono">
                            {Math.floor(insight.timestamp / 60)}:
                            {String(Math.floor(insight.timestamp % 60)).padStart(2, '0')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">{insight.text}</p>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              {/* Tab 3: Summary */}
              <TabsContent value="summary" className="mt-4">
                <div className="space-y-4 max-h-[200px] overflow-y-auto pr-2">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Interview Statistics</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Duration</p>
                        <p className="font-medium text-gray-900">
                          {Math.floor(currentInterview.duration / 60)} min {Math.floor(currentInterview.duration % 60)} sec
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Segments</p>
                        <p className="font-medium text-gray-900">{currentInterview.segments.length}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Word Count</p>
                        <p className="font-medium text-gray-900">
                          {currentInterview.transcription.split(' ').length}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Insights</p>
                        <p className="font-medium text-gray-900">{insights?.length || 0}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </CardContent>
    </Card>
  );
}