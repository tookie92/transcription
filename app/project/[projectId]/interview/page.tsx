"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useTranscription } from '@/hooks/useTranscription';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { toast } from "sonner"; 
import { useRouter, useParams } from 'next/navigation';
import { 
  Upload, 
  Loader2, 
  FolderOpen, 
  FileText, 
  Clock,
  Mic,
  Link,
  ArrowRight,
  ArrowLeft,
  X,
  Pause
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function InterviewHome() {
  const params = useParams();
  const projectId = params?.projectId as string;
  const currentProjectId = projectId as Id<"projects">;
  const { transcribe, isTranscribing, transcript, setTranscript, error } = useTranscription();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [topic, setTopic] = useState('');
  const [title, setTitle] = useState('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showTranscription, setShowTranscription] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'record' | 'url'>('upload');
  const [audioUrlInput, setAudioUrlInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  
  // State for transcribed but not yet saved interview
  const [pendingInterview, setPendingInterview] = useState<{
    title: string;
    topic?: string;
    transcription: string;
    segments: { id: number; start: number; end: number; text: string; speaker?: string }[];
    duration: number;
    audioFile?: File;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  // Convex
  const createInterview = useMutation(api.interviews.createInterview);
  const projects = useQuery(api.projects.getUserProjects);
  const interviews = useQuery(api.interviews.getProjectInterviews, { projectId: currentProjectId });

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setAudioUrl(URL.createObjectURL(file));
    setShowTranscription(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleUrlSubmit = async () => {
    if (!audioUrlInput || !currentProjectId) return;
    
    setIsUploading(true);
    try {
      const response = await fetch(audioUrlInput);
      const blob = await response.blob();
      const filename = audioUrlInput.split('/').pop() || 'audio from url';
      const file = new File([blob], filename, { type: blob.type });
      handleFileSelect(file);
      setAudioUrlInput('');
    } catch (err) {
      toast.error("Failed to fetch audio from URL");
    } finally {
      setIsUploading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const file = new File([blob], 'recording.webm', { type: 'audio/webm' });
        handleFileSelect(file);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingTime(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      toast.error("Failed to start recording");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
    setIsRecording(false);
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleTranscribe = async () => {
    if (!selectedFile || !title.trim() || !topic.trim()) return;

    const toastId = toast.loading("Transcribing audio...");

    try {
      const interview = await transcribe(selectedFile, title, topic);
      
      const convexSegments = interview.segments.map(segment => ({
        id: segment.id,
        start: segment.start,
        end: segment.end,
        text: segment.text,
        speaker: segment.speaker,
      }));

      // Store the transcribed data but don't save yet
      setPendingInterview({
        title: interview.title,
        topic: interview.topic,
        transcription: interview.transcription,
        segments: convexSegments,
        duration: interview.duration,
        audioFile: selectedFile || undefined,
      });
      
      setShowTranscription(true);
      toast.success("Transcription ready! Review and save.", { 
        id: toastId,
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Transcription failed";
      toast.error(`Transcription failed: ${errorMessage}`, { 
        id: toastId,
        duration: 4000,
      });
      console.error('Transcription failed:', err);
    }
  };

  const handleSave = async () => {
    if (!pendingInterview || !currentProjectId) {
      console.log('Missing pendingInterview or currentProjectId', { pendingInterview, currentProjectId });
      return;
    }

    const toastId = toast.loading("Saving interview to project...");
    setIsSaving(true);

    try {
      console.log('Starting save process...', { 
        hasAudioFile: !!pendingInterview.audioFile,
        audioFileName: pendingInterview.audioFile?.name,
        audioFileSize: pendingInterview.audioFile?.size 
      });

      let audioUrl: string | undefined;

      // Upload audio to R2 if we have the file
      if (pendingInterview.audioFile && typeof window !== 'undefined') {
        const uploadToastId = toast.loading("Uploading audio...");
        try {
          const formData = new FormData();
          formData.append('file', pendingInterview.audioFile);
          formData.append('interviewId', `temp-${Date.now()}`);

          console.log('Starting audio upload...');

          const uploadResponse = await fetch('/api/upload-audio', {
            method: 'POST',
            body: formData,
          });

          console.log('Upload response status:', uploadResponse.status);

          if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            console.error('Upload failed:', errorText);
            throw new Error('Failed to upload audio');
          }

          const uploadData = await uploadResponse.json();
          audioUrl = uploadData.url;
          console.log('Audio uploaded successfully:', audioUrl);
          toast.success("Audio uploaded successfully", { id: uploadToastId });
        } catch (uploadError) {
          console.error('Audio upload failed:', uploadError);
          toast.warning("Audio upload failed - continuing without audio", { id: uploadToastId });
        }
      }

      console.log('Creating interview with audioUrl:', audioUrl);
      console.log('Creating interview in Convex...');
      
      let interviewId;
      try {
        interviewId = await createInterview({
          projectId: currentProjectId,
          title: pendingInterview.title,
          topic: pendingInterview.topic,
          transcription: pendingInterview.transcription,
          segments: pendingInterview.segments,
          duration: pendingInterview.duration,
          audioUrl,
        });
      } catch (createError) {
        console.error('Error creating interview:', createError);
        throw createError;
      }

      console.log('Interview created with ID:', interviewId);

      toast.success("Interview saved successfully!", { 
        id: toastId,
      });

      // Reset state
      setPendingInterview(null);
      setShowTranscription(false);
      setSelectedFile(null);
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      setAudioUrl(null);
      setTitle('');
      setTopic('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Redirect to interview detail page
      router.push(`/project/${currentProjectId}/interview/${interviewId}`);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to save";
      toast.error(`Failed to save: ${errorMessage}`, { 
        id: toastId,
        duration: 4000,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
    setTitle('');
    setTopic('');
    setShowTranscription(false);
    setRecordingTime(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Si pas de projets, afficher un message
  if (projects && projects.length === 0) {
    return (
      <div className="container max-w-5xl mx-auto p-6">
        <Card className="bg-card rounded-2xl shadow-lg p-8">
          <CardContent className="text-center py-12">
            <FolderOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2 text-foreground">No Projects Yet</h3>
            <p className="text-muted-foreground mb-4">
              Create a project first to start transcribing interviews
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="mb-8">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => router.push(`/project/${projectId}`)}
          className="mb-4 -ml-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Project
        </Button>
        
        <div className="flex items-center gap-3 mb-2">
          <img 
            src="/logomark.svg" 
            alt="Skripta" 
            className="w-10 h-10 object-contain"
          />
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            New Interview
          </h1>
        </div>
        <p className="mt-1 text-muted-foreground">Upload, record, or paste a URL to transcribe your interview</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Upload Card */}
        <Card className="bg-card rounded-2xl shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              New Interview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Source Selection Tabs */}
            <div className="flex border-b">
              <button
                onClick={() => setActiveTab('upload')}
                className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'upload' 
                    ? 'border-primary text-primary' 
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Upload className="w-4 h-4 inline mr-1" />
                Upload
              </button>
              <button
                onClick={() => setActiveTab('record')}
                className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'record' 
                    ? 'border-primary text-primary' 
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Mic className="w-4 h-4 inline mr-1" />
                Record
              </button>
              <button
                onClick={() => setActiveTab('url')}
                className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'url' 
                    ? 'border-primary text-primary' 
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Link className="w-4 h-4 inline mr-1" />
                From URL
              </button>
            </div>

            {/* Upload Section */}
            {activeTab === 'upload' && (
              <div className="py-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*,video/*"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-accent transition-colors"
                >
                  <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-foreground">Click to upload audio/video</span>
                  <span className="text-xs text-muted-foreground mt-1">MP3, MP4, WAV, M4A (Max 25MB)</span>
                </label>
              </div>
            )}

            {/* Record Section */}
            {activeTab === 'record' && (
              <div className="py-4 text-center space-y-4">
                {isRecording ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2 text-destructive">
                      <span className="w-3 h-3 bg-destructive rounded-full animate-pulse"></span>
                      Recording...
                    </div>
                    <div className="text-2xl font-mono">{formatRecordingTime(recordingTime)}</div>
                    <Button onClick={stopRecording} variant="outline" className="gap-2">
                      <Pause className="w-4 h-4" />
                      Stop Recording
                    </Button>
                  </div>
                ) : (
                  <Button onClick={startRecording} className="gap-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                    <Mic className="w-4 h-4" />
                    Start Recording
                  </Button>
                )}
              </div>
            )}

            {/* URL Section */}
            {activeTab === 'url' && (
              <div className="py-4 space-y-3">
                <Input
                  ref={urlInputRef}
                  type="url"
                  placeholder="https://example.com/audio.mp3"
                  value={audioUrlInput}
                  onChange={(e) => setAudioUrlInput(e.target.value)}
                />
                <Button 
                  onClick={handleUrlSubmit} 
                  disabled={!audioUrlInput || isUploading}
                  className="w-full gap-2"
                >
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Link className="w-4 h-4" />
                  )}
                  Load Audio
                </Button>
              </div>
            )}

            {/* File Preview & Form */}
            {audioUrl && (
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center gap-3">
                  <audio controls className="flex-1" src={audioUrl}>
                    Your browser does not support the audio element.
                  </audio>
                  <Button variant="ghost" size="icon" onClick={handleReset}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="title">
                      Interview Title <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="title"
                      type="text"
                      placeholder="e.g., User Interview - Product Discovery"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      disabled={isTranscribing}
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="topic">
                      Interview Topic <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="topic"
                      type="text"
                      placeholder="e.g., Mobile app onboarding experience"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      disabled={isTranscribing}
                      required
                    />
                    <p className="text-xs text-muted-foreground">Helps AI extract better insights</p>
                  </div>
                </div>

                {/* Two-step buttons: Transcribe and Save */}
                <div className="flex gap-3">
                  <Button 
                    onClick={handleTranscribe}
                    disabled={isTranscribing || !selectedFile || !title.trim() || !topic.trim()}
                    className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                    variant={pendingInterview ? "outline" : "default"}
                  >
                    {isTranscribing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Transcribing...
                      </>
                    ) : pendingInterview ? (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Re-transcribe
                      </>
                    ) : (
                      <>
                        Transcribe
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                  
                  {pendingInterview && (
                    <Button 
                      onClick={handleSave}
                      disabled={isSaving}
                      className="flex-1"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          Save
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-destructive text-sm">{error}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: Transcription Preview or Recent Interviews */}
        <Card className="bg-card rounded-2xl shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {pendingInterview ? 'Preview - Ready to Save' : showTranscription ? 'Transcription' : 'Recent Interviews'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingInterview ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-950 p-2 rounded-lg">
                  <Clock className="w-4 h-4" />
                  Ready to save - {pendingInterview.segments.length} segments
                </div>
                <div className="max-h-[400px] overflow-y-auto space-y-2">
                  {pendingInterview.segments.map((segment, i) => (
                    <div key={i} className="text-sm">
                      <span className="text-xs text-muted-foreground">
                        {Math.floor(segment.start / 60)}:{String(Math.floor(segment.start % 60)).padStart(2, '0')}
                      </span>
                      {segment.speaker && (
                        <span className="ml-2 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                          {segment.speaker}
                        </span>
                      )}
                      <p className="text-foreground">{segment.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : showTranscription && transcript ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  Processing...
                </div>
                <div className="max-h-[400px] overflow-y-auto space-y-2">
                  {transcript.split('\n').map((line, i) => (
                    <p key={i} className="text-sm text-foreground">{line}</p>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {interviews && interviews.length > 0 ? (
                  interviews.slice(0, 5).map((interview) => (
                    <div
                      key={interview._id}
                      onClick={() => router.push(`/project/${currentProjectId}/interview/${interview._id}`)}
                      className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <FileText className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{interview.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {Math.floor(interview.duration / 60)}:{String(Math.floor(interview.duration % 60)).padStart(2, '0')} min
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {interview.status}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No interviews yet</p>
                    <p className="text-sm">Upload an audio file to get started</p>
                  </div>
                )}
                
                {interviews && interviews.length > 5 && (
                  <Button 
                    variant="outline" 
                    className="w-full mt-2"
                    onClick={() => router.push(`/project/${currentProjectId}`)}
                  >
                    View all {interviews.length} interviews
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
