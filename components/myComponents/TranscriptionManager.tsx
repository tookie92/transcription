'use client';

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentProject } from '@/hooks/useCurrentProject';
import { useAnalysis } from '@/hooks/useAnalysis';
import { Card, CardContent, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Lightbulb, FileSpreadsheet, Sparkles, Upload, Wand2, CheckCircle2, Loader2, ChevronRight, Zap } from 'lucide-react';
import { Button } from '../ui/button';
import { useState } from 'react';
import { ExportDialog } from './ExportDialog';
import { ExportInterview } from '@/types';
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

type WorkflowStep = 'upload' | 'transcribing' | 'ready' | 'analyzing' | 'done';

export default function TranscriptionManager() {
  const { analyzeInterview } = useAnalysis();
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('upload');
  const [progress, setProgress] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const { currentProjectId, currentInterviewId, setCurrentInterview } = useCurrentProject();
  const [showUploadSuccess, setShowUploadSuccess] = useState(false);

  const interviews = useQuery(api.interviews.getProjectInterviews, 
    currentProjectId ? { projectId: currentProjectId as Id<"projects"> } : "skip"
  );

  const currentInterview = currentInterviewId 
    ? interviews?.find(i => i._id === currentInterviewId)
    : null;

  const insights = useQuery(api.insights.getByInterview, 
    currentInterview?._id ? { interviewId: currentInterview._id } : "skip"
  );

  // Simulated progress for demo (in real app, this would come from the API)
  const simulateProgress = () => {
    setProgress(0);
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setCurrentStep('ready');
          return 100;
        }
        return prev + 10;
      });
    }, 500);
  };

  // Combined "Upload & Extract" action
  const handleUploadAndExtract = async () => {
    // In a real app, this would trigger file upload + transcription + analysis
    setCurrentStep('transcribing');
    simulateProgress();
    
    // After "transcription", automatically start analysis
    setTimeout(() => {
      handleAnalyze();
    }, 6000);
  };

  const handleAnalyze = async () => {
    if (!currentInterview || !currentProjectId) return;

    setCurrentStep('analyzing');
    setProgress(0);
    
    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 15, 90));
    }, 300);

    const toastId = toast.loading("Extracting insights...");
    
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
      
      clearInterval(progressInterval);
      setProgress(100);
      setCurrentStep('done');
      
      toast.success("All done! Insights extracted.", { id: toastId, duration: 3000 });
      
    } catch (error) {
      clearInterval(progressInterval);
      const errorMessage = error instanceof Error ? error.message : 'Analysis failed';
      setAnalysisError(errorMessage);
      setCurrentStep('ready');
      
      toast.error(`Error: ${errorMessage}`, { id: toastId, duration: 4000 });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Interview selection view
  if (currentProjectId && !currentInterview) {
    return (
      <Card className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-md">
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Interviews</h3>
            <Button size="sm" variant="outline">
              <Upload className="w-4 h-4 mr-2" />
              Upload New
            </Button>
          </div>
          
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {interviews?.map(interview => (
              <motion.button
                key={interview._id}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="w-full flex items-center gap-3 p-3 rounded-xl border hover:border-[#3D7C6F] hover:bg-[#3D7C6F]/5 transition-all text-left"
                onClick={() => setCurrentInterview(interview._id)}
              >
                <div className="w-10 h-10 bg-[#3D7C6F]/10 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-[#3D7C6F]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{interview.title}</p>
                  <p className="text-xs text-gray-500">
                    {interview.transcription ? `${interview.transcription.split(' ').length} words` : 'Not transcribed'}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </motion.button>
            ))}
            
            {interviews?.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 font-medium">No interviews yet</p>
                <p className="text-xs text-gray-400 mt-1">Upload audio to get started</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Export data preparation
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

  const hasTranscription = currentInterview?.transcription && currentInterview.transcription.length > 0;
  const hasInsights = insights && insights.length > 0;

  return (
    <Card className="bg-white rounded-2xl shadow-lg w-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-[#3D7C6F]/5 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentInterview(null)}
              className="text-gray-500"
            >
              ←
            </Button>
            <div className="w-10 h-10 bg-[#3D7C6F] rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{currentInterview?.title}</h3>
              <p className="text-xs text-gray-500">
                {currentInterview && (
                  <>
                    {Math.floor(currentInterview.duration / 60)}:{String(Math.floor(currentInterview.duration % 60)).padStart(2, '0')} min
                    {currentInterview.topic && <span className="ml-2 text-[#3D7C6F]">• {currentInterview.topic}</span>}
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Quick Action Button */}
          {!hasInsights && currentStep !== 'transcribing' && currentStep !== 'analyzing' && (
            <Button
              onClick={handleUploadAndExtract}
              className="bg-gradient-to-r from-[#3D7C6F] to-[#2d5f54] hover:from-[#2d5f54] hover:to-[#1f4a42] text-white shadow-lg"
            >
              <Wand2 className="w-4 h-4 mr-2" />
              Upload & Extract
            </Button>
          )}

          {hasInsights && interviewForExport && (
            <ExportDialog 
              interview={interviewForExport}
              trigger={
                <Button variant="outline" size="sm" className="border-[#3D7C6F] text-[#3D7C6F]">
                  <FileText className="w-4 h-4 mr-2" />
                  Export
                </Button>
              }
            />
          )}
        </div>

        {/* Progress Bar */}
        <AnimatePresence>
          {(currentStep === 'transcribing' || currentStep === 'analyzing') && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4"
            >
              <div className="flex items-center gap-3 mb-2">
                {currentStep === 'transcribing' ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#3D7C6F]" />
                ) : (
                  <Sparkles className="w-4 h-4 text-purple-500" />
                )}
                <span className="text-sm font-medium text-gray-700">
                  {currentStep === 'transcribing' ? 'Transcribing audio...' : 'Extracting insights...'}
                </span>
                <span className="text-xs text-gray-400 ml-auto">{progress}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-[#3D7C6F] to-purple-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Done State */}
        {currentStep === 'done' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>All done! {insights?.length || 0} insights extracted.</span>
          </motion.div>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="transcription" className="w-full">
        <TabsList className="grid grid-cols-3 w-full rounded-none border-b">
          <TabsTrigger value="transcription" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Transcript
            {hasTranscription && <CheckCircle2 className="w-3 h-3 text-green-500" />}
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            Insights
            {hasInsights && (
              <span className="px-1.5 py-0.5 text-xs bg-blue-500 text-white rounded-full">
                {insights.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="summary" className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            Summary
          </TabsTrigger>
        </TabsList>

        <CardContent className="p-4 max-h-[400px] overflow-y-auto">
          {/* Transcript Tab */}
          <TabsContent value="transcription" className="mt-0">
            {!hasTranscription ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-gradient-to-br from-[#3D7C6F]/10 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-10 h-10 text-[#3D7C6F]" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Ready to transcribe?</h4>
                <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">
                  Upload your audio file and we'll extract insights automatically
                </p>
                <Button
                  onClick={handleUploadAndExtract}
                  className="bg-[#3D7C6F] hover:bg-[#2d5f54]"
                  size="lg"
                >
                  <Zap className="w-5 h-5 mr-2" />
                  Upload & Extract
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {currentInterview?.segments.map((segment) => (
                  <motion.div
                    key={segment.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="group hover:bg-gray-50 p-2 rounded-lg transition-colors"
                  >
                    <div className="flex gap-3">
                      <span className="text-xs text-[#3D7C6F] font-mono mt-1 min-w-[50px]">
                        {Math.floor(segment.start / 60)}:{String(Math.floor(segment.start % 60)).padStart(2, '0')}
                      </span>
                      <p className="text-gray-700 text-sm leading-relaxed flex-1">
                        {segment.text}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Insights Tab */}
          <TabsContent value="insights" className="mt-0">
            {!hasInsights ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lightbulb className="w-10 h-10 text-purple-500" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">No insights yet</h4>
                <p className="text-sm text-gray-500 mb-6">
                  Extract insights from your transcription
                </p>
                <Button
                  onClick={handleAnalyze}
                  disabled={!hasTranscription || isAnalyzing}
                  className="bg-purple-600 hover:bg-purple-700"
                  size="lg"
                >
                  {isAnalyzing ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="w-5 h-5 mr-2" />
                  )}
                  Extract Insights
                </Button>
              </div>
            ) : (
              <div className="grid gap-3">
                {insights.map((insight, index) => (
                  <motion.div
                    key={insight._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 rounded-xl border-2 hover:border-purple-200 transition-all bg-gradient-to-br from-white to-purple-50/50"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                        insight.type === 'pain-point' 
                          ? 'bg-red-100 text-red-700 border border-red-200'
                          : insight.type === 'quote'
                          ? 'bg-blue-100 text-blue-700 border border-blue-200'
                          : insight.type === 'insight'
                          ? 'bg-purple-100 text-purple-700 border border-purple-200'
                          : 'bg-amber-100 text-amber-700 border border-amber-200'
                      }`}>
                        {insight.type === 'pain-point' && '😫 '}
                        {insight.type === 'quote' && '💬 '}
                        {insight.type === 'insight' && '💡 '}
                        {insight.type === 'follow-up' && '🤔 '}
                        {insight.type}
                      </span>
                      <span className="text-xs text-gray-400 font-mono">
                        {Math.floor(insight.timestamp / 60)}:{String(Math.floor(insight.timestamp % 60)).padStart(2, '0')}
                      </span>
                    </div>
                    <p className="text-gray-700 text-sm leading-relaxed">{insight.text}</p>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Summary Tab */}
          <TabsContent value="summary" className="mt-0">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gradient-to-br from-[#3D7C6F]/5 to-transparent rounded-xl">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Duration</p>
                <p className="text-2xl font-bold text-gray-900">
                  {currentInterview && (
                    <>
                      {Math.floor(currentInterview.duration / 60)}:
                      {String(Math.floor(currentInterview.duration % 60)).padStart(2, '0')}
                    </>
                  )}
                </p>
                <p className="text-xs text-gray-400">minutes</p>
              </div>
              
              <div className="p-4 bg-gradient-to-br from-purple-50 to-transparent rounded-xl">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Words</p>
                <p className="text-2xl font-bold text-gray-900">
                  {currentInterview?.transcription.split(' ').length || 0}
                </p>
                <p className="text-xs text-gray-400">transcribed</p>
              </div>
              
              <div className="p-4 bg-gradient-to-br from-blue-50 to-transparent rounded-xl">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Segments</p>
                <p className="text-2xl font-bold text-gray-900">
                  {currentInterview?.segments.length || 0}
                </p>
                <p className="text-xs text-gray-400">chunks</p>
              </div>
              
              <div className="p-4 bg-gradient-to-br from-amber-50 to-transparent rounded-xl">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Insights</p>
                <p className="text-2xl font-bold text-gray-900">
                  {insights?.length || 0}
                </p>
                <p className="text-xs text-gray-400">extracted</p>
              </div>
            </div>
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  );
}
