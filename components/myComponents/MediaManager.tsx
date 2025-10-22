"use client";

import React, { useState, useRef } from 'react';
import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { useTranscription } from '@/hooks/useTranscription';
import { Upload, Loader2 } from 'lucide-react';

function MediaManager() {
  const { transcribe, isTranscribing, error } = useTranscription();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [topic, setTopic] = useState('');
  const [title, setTitle] = useState('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setAudioUrl(URL.createObjectURL(file));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleTranscribe = async () => {
    if (!selectedFile) return;

    try {
      const interviewTitle = title || `Interview ${new Date().toLocaleDateString()}`;
      await transcribe(selectedFile, interviewTitle, topic || undefined);
    } catch (err) {
      console.error('Transcription failed:', err);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setAudioUrl(null);
    setTitle('');
    setTopic('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card className="bg-white rounded-2xl shadow-lg p-8 w-1/2">
      <CardContent className="space-y-6">
        {/* Tabs (visual only for now) */}
        {/* <div className="flex gap-2 pb-4">
          <Button variant="outline" size="sm" className="gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            From URL
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
            Audio
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Video
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            Record
          </Button>
        </div> */}

        {/* Audio Player or Upload Button */}
        {audioUrl ? (
          <div className="space-y-4">
            {/* Audio Player */}
            <audio 
              controls 
              className="w-full"
              src={audioUrl}
            >
              Your browser does not support the audio element.
            </audio>

            {/* Audio Source Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
              Audio Source
            </div>

            {/* Title and Topic Inputs */}
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-medium">
                  Interview Title (optional)
                </Label>
                <Input
                  id="title"
                  type="text"
                  placeholder="e.g., User Interview - Product Discovery"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={isTranscribing}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="topic" className="text-sm font-medium">
                  Interview Topic
                </Label>
                <Input
                  id="topic"
                  type="text"
                  placeholder="e.g., Mobile app onboarding experience"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  disabled={isTranscribing}
                />
                <p className="text-xs text-gray-500">
                  Helps AI extract better insights
                </p>
              </div>
            </div>

            {/* Transcribe and Reset Buttons */}
            <div className="flex gap-3 pt-2">
              <Button 
                onClick={handleTranscribe}
                disabled={isTranscribing}
                className="flex-1 bg-black hover:bg-gray-800"
              >
                {isTranscribing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Transcribing...
                  </>
                ) : (
                  'Transcribe'
                )}
              </Button>
              <Button 
                onClick={handleReset}
                variant="outline"
                disabled={isTranscribing}
              >
                Reset
              </Button>
            </div>
          </div>
        ) : (
          // Upload Button
          <div className="py-8">
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,video/*"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-auto py-6 bg-black hover:bg-gray-800 text-white"
              size="lg"
            >
              <Upload className="w-5 h-5 mr-2" />
              Upload your conversation
            </Button>
            <p className="text-sm text-gray-500 text-center mt-3">
              Supports: MP3, MP4, WAV, M4A (Max 25MB)
            </p>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default MediaManager;