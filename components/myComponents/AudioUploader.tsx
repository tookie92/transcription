'use client';


import { useTranscription } from '@/hooks/useTranscriber';
import { useTranscriptionStore } from '@/store/transcriptionStore';
import { useState } from 'react';

export default function AudioUpload() {
  const { transcribe, isTranscribing, error } = useTranscription();
  const { currentInterview } = useTranscriptionStore();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState<'url' | 'audio' | 'video' | 'record'>('audio');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      handleTranscribe(file);
    }
  };

  const handleTranscribe = async (file: File) => {
    try {
      await transcribe(file, `Interview ${new Date().toLocaleDateString()}`);
    } catch (err) {
      console.error('Transcription failed:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#E8E6D8] p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8 text-center">
        <h1 className="text-5xl font-bold text-[#3D7C6F] mb-2">
          Transkripschon
        </h1>
        <p className="text-gray-600">
          made for our interview(no need to comment about the name of the app 🤫)
        </p>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel - Upload */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {/* Tabs */}
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => setActiveTab('url')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'url'
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              From URL
            </button>
            <button
              onClick={() => setActiveTab('audio')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'audio'
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
              Audio
            </button>
            <button
              onClick={() => setActiveTab('video')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'video'
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Video
            </button>
            <button
              onClick={() => setActiveTab('record')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'record'
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              Record
            </button>
          </div>

          {/* Upload Area */}
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center">
            {isTranscribing ? (
              <div className="space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3D7C6F] mx-auto"></div>
                <p className="text-gray-600">Transcribing your audio...</p>
              </div>
            ) : (
              <>
                <input
                  type="file"
                  accept="audio/*,video/*"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer"
                >
                  <div className="space-y-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-2">
                        Drag and drop your file here or
                      </p>
                      <span className="text-[#3D7C6F] font-medium hover:underline">
                        Browse files
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      Supports: MP3, MP4, WAV, M4A (Max 25MB)
                    </p>
                  </div>
                </label>
              </>
            )}
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Right Panel - Transcription */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Transcription
          </h2>

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
              <div className="prose prose-sm max-w-none">
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                  {currentInterview.segments.map((segment) => (
                    <div key={segment.id} className="group">
                      <div className="flex gap-3">
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
        </div>
      </div>
    </div>
  );
}