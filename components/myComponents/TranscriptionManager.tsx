'use client';



import { useTranscriptionStore } from '@/store/transcriptionStore';

import { Card, CardContent, CardTitle } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';


export default function TranscriptionMangaer() {
 
  const { currentInterview } = useTranscriptionStore();
  
//   

  return (
    
        <Card className="bg-white rounded-2xl shadow-lg p-8 w-1/2">
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
                    {/* Transcription Metadata */}
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
                            </p>
                        </div>
                        </div>
                        <button className="px-4 py-2 text-sm font-medium text-[#3D7C6F] bg-[#3D7C6F] bg-opacity-10 rounded-lg hover:bg-opacity-20 transition-colors">
                        Export
                        </button>
                    </div>

                    {/* Transcription Text */}
                    <div className=" max-w-none  ">
                        <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2">
                        {currentInterview.segments.map((segment) => (
                            <div key={segment.id} className="group">
                            <div className="flex gap-3 prose-sm prose">
                                <span className="text-xs text-gray-400 font-mono mt-1 min-w-[60px]">
                                {Math.floor(segment.start / 60)}:
                                {String(Math.floor(segment.start % 60)).padStart(2, '0')}
                                </span>
                                <p className="text-gray-700 leading-relaxed flex-1">
                                {segment.text}
                                </p>
                            </div>
                            </div>
                        ))}
                        </div>
                    </div>

                    {/* Insights Summary */}
                    {currentInterview.insights.length > 0 && (
                        <div className="mt-6 pt-4 border-t">
                        <h4 className="font-medium text-gray-900 mb-3">Insights</h4>
                        <div className="flex flex-wrap gap-2">
                            {currentInterview.insights.map((insight) => (
                            <span
                                key={insight.id}
                                className="px-3 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full"
                            >
                                {insight.type}
                            </span>
                            ))}
                        </div>
                        </div>
                    )}
                    </div>
                )}
            </CardContent>
        </Card>
    
  );
}