'use client';

import { useTranscriptionStore } from '@/store/transcriptionStore';
import { useAnalysis } from '@/hooks/useAnalysis';
import { Card, CardContent, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Lightbulb, FileSpreadsheet, Sparkles } from 'lucide-react';
import { Button } from '../ui/button';
import { useState } from 'react';
import { ExportDialog } from './ExportDialog';

export default function TranscriptionManager() {
  const { currentInterview } = useTranscriptionStore();
  const { analyzeInterview } = useAnalysis();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!currentInterview) return;

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      await analyzeInterview(
        currentInterview.id,
        currentInterview.transcription,
        currentInterview.topic,
        currentInterview.segments
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Analysis failed';
      setAnalysisError(errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  };

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
              <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p>Upload audio or record to start transcription</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Metadata Header */}
            <div className="flex items-center justify-between pb-4 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#3D7C6F] bg-opacity-10 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#3D7C6F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
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
                  disabled={isAnalyzing || currentInterview.isAnalyzing}
                  className="flex items-center gap-2 bg-[#3D7C6F] hover:bg-[#2d5f54]"
                  size="sm"
                >
                  {isAnalyzing || currentInterview.isAnalyzing ? (
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
                interview={currentInterview}
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
                  {currentInterview.insights.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-500 text-white rounded-full">
                      {currentInterview.insights.length}
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
                  {currentInterview.insights.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <Lightbulb className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">No insights yet</p>
                      <p className="text-xs mt-1">Click {`"Analyze"`} to extract insights automatically</p>
                    </div>
                  ) : (
                    currentInterview.insights.map((insight) => (
                      <div
                        key={insight.id}
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
                        <p className="font-medium text-gray-900">{currentInterview.insights.length}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border border-gray-200 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Full Transcription</h4>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {currentInterview.transcription}
                    </p>
                  </div>

                  {currentInterview.insights.length > 0 && (
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-3">Insights Breakdown</h4>
                      <div className="space-y-2">
                        {['pain-point', 'quote', 'insight', 'follow-up'].map((type) => {
                          const count = currentInterview.insights.filter(i => i.type === type).length;
                          if (count === 0) return null;
                          return (
                            <div key={type} className="flex justify-between items-center text-sm">
                              <span className="text-gray-600 capitalize">{type.replace('-', ' ')}</span>
                              <span className="font-medium text-gray-900">{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </CardContent>
    </Card>
  );
}