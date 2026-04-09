"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranscription } from '@/hooks/useTranscription';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { GDPRConsent } from '@/components/myComponents/GDPRConsent';
import { toast } from "sonner";
import { useRouter, useParams } from 'next/navigation';
import { useAuth, useUser } from '@clerk/nextjs';
import { videoConverter } from '@/lib/videoConverter';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  Upload,
  Loader2,
  Mic,
  Link as LinkIcon,
  ArrowLeft,
  FileText,
  Clock,
  X,
  Pause,
  Play,
  Check,
  ChevronRight,
  CloudUpload,
  Radio,
  Globe,
  Sparkles,
  AlertCircle,
  Film,
  Monitor,
  Computer,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type SourceType = 'upload' | 'record' | 'recordSystem' | 'url' | null;

export default function InterviewHome() {
  const params = useParams();
  const projectId = params?.projectId as string;
  const currentProjectId = projectId as Id<"projects">;
  const { user } = useUser();
  const { transcribe, isTranscribing, error } = useTranscription();
  const userEmail = user?.emailAddresses?.[0]?.emailAddress;
  const router = useRouter();

  const [selectedSource, setSelectedSource] = useState<SourceType>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isVideoFile, setIsVideoFile] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingSystem, setIsRecordingSystem] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioUrlInput, setAudioUrlInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [pendingInterview, setPendingInterview] = useState<{
    title: string;
    topic?: string;
    transcription: string;
    segments: { id: number; start: number; end: number; text: string; speaker?: string }[];
    duration: number;
    audioFile?: File;
    audioUrl?: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showGDPRConsent, setShowGDPRConsent] = useState(false);
  const [interviewLanguage, setInterviewLanguage] = useState('en');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const createInterview = useMutation(api.interviews.createInterview);
  const projects = useQuery(api.projects.getUserProjects, { userEmail });
  const interviews = useQuery(api.interviews.getProjectInterviews, { projectId: currentProjectId });

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const handleSourceSelect = (source: SourceType) => {
    setSelectedSource(source);
    setSelectedFile(null);
    setAudioUrl(null);
    setShowPreview(false);
    setPendingInterview(null);
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    const isVideo = videoConverter.isVideoFile(file) || videoConverter.isVideoExtension(file.name);
    setIsVideoFile(isVideo);
    if (isVideo) {
      toast.info(`Video detected (${(file.size / 1024 / 1024).toFixed(1)}MB). Will convert automatically.`);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.startsWith('audio/') || file.type.startsWith('video/'))) {
      handleFileSelect(file);
    } else {
      toast.error('Please drop an audio or video file');
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleUrlSubmit = async () => {
    if (!audioUrlInput) return;
    setIsUploading(true);
    try {
      const response = await fetch(audioUrlInput);
      const blob = await response.blob();
      const filename = audioUrlInput.split('/').pop() || 'audio';
      const file = new File([blob], filename, { type: blob.type });
      handleFileSelect(file);
      setAudioUrlInput('');
    } catch {
      toast.error('Failed to fetch audio');
    } finally {
      setIsUploading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        handleFileSelect(new File([blob], 'recording.webm', { type: 'audio/webm' }));
        stream.getTracks().forEach(track => track.stop());
      };
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    } catch {
      toast.error('Failed to start recording');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder?.state !== 'inactive') mediaRecorder?.stop();
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setIsRecording(false);
  };

  const startSystemRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        toast.error('No audio track found in the screen share');
        stream.getTracks().forEach(t => t.stop());
        return;
      }

      const audioOnlyStream = new MediaStream(audioTracks);
      const recorder = new MediaRecorder(audioOnlyStream, { mimeType: 'audio/webm' });
      const chunks: Blob[] = [];
      
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        handleFileSelect(new File([blob], 'system-recording.webm', { type: 'audio/webm' }));
        stream.getTracks().forEach(track => track.stop());
      };
      
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecordingSystem(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
      
      stream.getVideoTracks()[0].onended = () => {
        stopSystemRecording();
      };
    } catch {
      toast.error('Failed to start system recording. Make sure screen share permissions are granted.');
    }
  };

  const stopSystemRecording = () => {
    if (mediaRecorder?.state !== 'inactive') mediaRecorder?.stop();
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setIsRecordingSystem(false);
  };

  const formatTime = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.round(seconds % 60).toString().padStart(2, '0')}`;

  const handleTranscribe = async () => {
    if (!selectedFile || !title.trim() || !topic.trim()) return;
    
    // Check file size before sending (max 25MB for Groq free tier)
    const maxSize = 25 * 1024 * 1024; // 25MB
    if (selectedFile.size > maxSize) {
      toast.error(`File too large (${Math.round(selectedFile.size / 1024 / 1024)}MB). Maximum is 25MB. Compress or reduce the file size.`);
      return;
    }
    
    setIsProcessing(true);
    const toastId = toast.loading(isVideoFile ? 'Converting video...' : 'Transcribing...');
    try {
      const interview = await transcribe(selectedFile, title, topic, interviewLanguage === 'auto' ? undefined : interviewLanguage);
      
      // Get audioUrl from transcription result - this is the UploadThing URL
      // It will only be persisted to Convex when user clicks Save
      const audioUrl = (interview as any).audioUrl;
      
      setPendingInterview({
        title: interview.title,
        topic: interview.topic,
        transcription: interview.transcription,
        segments: interview.segments.map(s => ({ id: s.id, start: s.start, end: s.end, text: s.text, speaker: s.speaker })),
        duration: interview.duration,
        audioFile: selectedFile,
        audioUrl: audioUrl,
      });
      setShowPreview(true);
      toast.success('Ready! Review and save.', { id: toastId });
    } catch (err) {
      toast.error(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`, { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!pendingInterview || !currentProjectId) return;
    setIsSaving(true);
    const toastId = toast.loading('Saving...');
    try {
      // Use the audioUrl already uploaded during transcription (no re-upload needed)
      const audioUrl = pendingInterview.audioUrl;
      
      const interviewId = await createInterview({
        projectId: currentProjectId,
        title: pendingInterview.title,
        topic: pendingInterview.topic,
        language: interviewLanguage === 'auto' ? undefined : interviewLanguage,
        transcription: pendingInterview.transcription,
        segments: pendingInterview.segments,
        duration: pendingInterview.duration,
        audioUrl,
      });
      toast.success('Saved!', { id: toastId });
      router.push(`/project/${currentProjectId}`);
    } catch (err) {
      toast.error(`Failed: ${err instanceof Error ? err.message : 'Unknown'}`, { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setSelectedFile(null);
    setAudioUrl(null);
    setTitle('');
    setTopic('');
    setShowPreview(false);
    setPendingInterview(null);
    setSelectedSource(null);
    setRecordingTime(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (projects && projects.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-accent flex items-center justify-center">
            <FileText className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="font-serif text-2xl mb-2">No Projects Yet</h2>
          <p className="text-muted-foreground mb-6">Create a project first to start transcribing interviews</p>
          <Link href="/project" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity">
            Create Project
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <Link href={`/project/${projectId}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Project
          </Link>

          <div className="mb-10">
            <h1 className="font-serif text-4xl md:text-5xl mb-3 tracking-tight text-foreground">Add New Interview</h1>
            <p className="text-lg text-muted-foreground">Choose how you want to import your interview</p>
          </div>

          {!showPreview ? (
            <>
              <div className="grid md:grid-cols-4 gap-4 mb-8">
                {[
                  { id: 'upload', icon: CloudUpload, label: 'Upload File', desc: 'MP3, MP4, WAV, M4A' },
                  { id: 'record', icon: Mic, label: 'Record Mic', desc: 'Record from microphone' },
                  { id: 'recordSystem', icon: Monitor, label: 'Record System', desc: 'Record system audio' },
                  { id: 'url', icon: Globe, label: 'From URL', desc: 'Paste a link to audio/video' },
                ].map((source, i) => (
                  <motion.button
                    key={source.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    onClick={() => handleSourceSelect(source.id as SourceType)}
                    className={`relative p-6 rounded-2xl border-2 transition-all duration-200 text-left ${
                      selectedSource === source.id
                        ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                        : 'border-border bg-card hover:border-primary/50 hover:shadow-md'
                    }`}
                  >
                    <source.icon className={`w-8 h-8 mb-4 ${selectedSource === source.id ? 'text-primary' : 'text-muted-foreground'}`} />
                    <h3 className="font-serif text-xl mb-1 text-foreground">{source.label}</h3>
                    <p className="text-sm text-muted-foreground">{source.desc}</p>
                    {selectedSource === source.id && (
                      <motion.div layoutId="sourceIndicator" className="absolute top-4 right-4 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </motion.div>
                    )}
                  </motion.button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {selectedSource && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-card rounded-2xl border border-border p-8 mb-8">
                      {selectedSource === 'upload' && (
                        <div className="space-y-6">
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
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            className={`relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 ${
                              isDragging
                                ? 'border-primary bg-primary/10'
                                : 'border-border hover:border-primary/50 hover:bg-accent'
                            }`}
                          >
                            {isDragging && (
                              <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="absolute inset-0 flex items-center justify-center bg-[var(--primary)]/10 rounded-xl"
                              >
                                <span className="text-[var(--primary)] font-medium">Drop your file here</span>
                              </motion.div>
                            )}
                            <CloudUpload className={`w-12 h-12 mb-4 transition-colors ${isDragging ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)]'}`} />
                            <span className="text-foreground font-medium">Click or drag to upload</span>
                            <span className="text-sm text-[var(--muted-foreground)] mt-1">Audio or video file • Video will convert automatically</span>
                          </label>
                        </div>
                      )}

                      {selectedSource === 'record' && (
                        <div className="text-center py-8">
                          {isRecording ? (
                            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="space-y-6">
                              <div className="relative inline-flex items-center justify-center">
                                <motion.div
                                  animate={{ scale: [1, 1.2, 1] }}
                                  transition={{ repeat: Infinity, duration: 1.5 }}
                                  className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center"
                                >
                                  <div className="w-8 h-8 rounded-full bg-red-500" />
                                </motion.div>
                              </div>
                              <div className="font-mono text-4xl">{formatTime(recordingTime)}</div>
                              <p className="text-[var(--muted-foreground)]">Recording in progress...</p>
                              <button
                                onClick={stopRecording}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors"
                              >
                                <Square className="w-5 h-5" />
                                Stop Recording
                              </button>
                            </motion.div>
                          ) : (
                            <div className="space-y-4">
                              <div className="w-20 h-20 mx-auto rounded-full bg-[var(--accent)] flex items-center justify-center">
                                <Mic className="w-10 h-10 text-[var(--primary)]" />
                              </div>
                              <p className="text-[var(--muted-foreground)]">Record audio directly from your microphone</p>
                              <button
                                onClick={startRecording}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-xl font-medium hover:opacity-90 transition-opacity"
                              >
                                <Mic className="w-5 h-5" />
                                Start Recording
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {selectedSource === 'recordSystem' && (
                        <div className="text-center py-8">
                          {isRecordingSystem ? (
                            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="space-y-6">
                              <div className="relative inline-flex items-center justify-center">
                                <motion.div
                                  animate={{ scale: [1, 1.2, 1] }}
                                  transition={{ repeat: Infinity, duration: 1.5 }}
                                  className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center"
                                >
                                  <div className="w-8 h-8 rounded-full bg-red-500" />
                                </motion.div>
                              </div>
                              <div className="font-mono text-4xl">{formatTime(recordingTime)}</div>
                              <p className="text-[var(--muted-foreground)]">Recording system audio...</p>
                              <button
                                onClick={stopSystemRecording}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors"
                              >
                                <Square className="w-5 h-5" />
                                Stop Recording
                              </button>
                            </motion.div>
                          ) : (
                            <div className="space-y-4">
                              <div className="w-20 h-20 mx-auto rounded-full bg-[var(--accent)] flex items-center justify-center">
                                <Monitor className="w-10 h-10 text-[var(--primary)]" />
                              </div>
                              <p className="text-[var(--muted-foreground)]">Record audio from your system (screen share)</p>
                              <button
                                onClick={startSystemRecording}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-xl font-medium hover:opacity-90 transition-opacity"
                              >
                                <Monitor className="w-5 h-5" />
                                Start Recording
                              </button>
                              <p className="text-xs text-[var(--muted-foreground)]">
                                Select a screen/window to share and enable audio
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {selectedSource === 'url' && (
                        <div className="space-y-4">
                          <div className="flex gap-3">
                            <input
                              type="url"
                              placeholder="https://example.com/audio.mp3"
                              value={audioUrlInput}
                              onChange={(e) => setAudioUrlInput(e.target.value)}
                              className="flex-1 px-4 py-3 rounded-xl border border-[var(--warm-border)] bg-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:border-[var(--primary)] transition-all"
                            />
                            <button
                              onClick={handleUrlSubmit}
                              disabled={!audioUrlInput || isUploading}
                              className="px-6 py-3 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                            >
                              {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Load'}
                            </button>
                          </div>
                          <p className="text-sm text-[var(--muted-foreground)]">Enter a direct link to an audio or video file</p>
                        </div>
                      )}

                      {selectedFile && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-6 pt-6 border-t border-[var(--warm-border)]"
                        >
                          <div className="flex items-center justify-between p-4 bg-[var(--accent)] rounded-xl">
                            <div className="flex items-center gap-4">
                              {isVideoFile ? (
                                <div className="w-12 h-12 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
                                  <Film className="w-6 h-6 text-[var(--primary)]" />
                                </div>
                              ) : (
                                <div className="w-12 h-12 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
                                  <FileText className="w-6 h-6 text-[var(--primary)]" />
                                </div>
                              )}
                              <div>
                                <p className="font-medium">{selectedFile.name}</p>
                                <p className="text-sm text-[var(--muted-foreground)]">
                                  {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
                                  {isVideoFile && ' • Will be converted to audio'}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={handleReset}
                              className="p-2 rounded-lg hover:bg-white transition-colors"
                            >
                              <X className="w-5 h-5 text-[var(--muted-foreground)]" />
                            </button>
                          </div>

                          <div className="mt-6 space-y-4">
                            <div>
                              <label className="block text-sm font-medium mb-2">
                                Interview Title <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g., User Interview - Product Discovery"
                                className="w-full px-4 py-3 rounded-xl border border-[var(--warm-border)] bg-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:border-[var(--primary)] transition-all"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-2">
                                Interview Topic <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                placeholder="e.g., Mobile app onboarding experience"
                                className="w-full px-4 py-3 rounded-xl border border-[var(--warm-border)] bg-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:border-[var(--primary)] transition-all"
                              />
                              <p className="text-xs text-[var(--muted-foreground)] mt-2">Helps AI extract better insights</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-2">
                                Interview Language
                              </label>
                              <select
                                value={interviewLanguage}
                                onChange={(e) => setInterviewLanguage(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-[var(--warm-border)] bg-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:border-[var(--primary)] transition-all"
                              >
                                <option value="en">English</option>
                                <option value="de">German (Deutsch)</option>
                                <option value="fr">French (Français)</option>
                                <option value="es">Spanish (Español)</option>
                                <option value="it">Italian (Italiano)</option>
                                <option value="nl">Dutch (Nederlands)</option>
                                <option value="auto">Auto-detect</option>
                              </select>
                              <p className="text-xs text-[var(--muted-foreground)] mt-2">Transcript will be translated to English for insights</p>
                            </div>
                          </div>

                          <button
                            onClick={handleTranscribe}
                            disabled={isProcessing || !title.trim() || !topic.trim()}
                            className="mt-6 w-full inline-flex items-center justify-center gap-2 px-6 py-4 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                          >
                            {isProcessing ? (
                              <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                {isVideoFile ? 'Converting & Transcribing...' : 'Transcribing...'}
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-5 h-5" />
                                Transcribe
                                <ChevronRight className="w-5 h-5" />
                              </>
                            )}
                          </button>
                        </motion.div>
                      )}

                      {error && (
                        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-red-600">{typeof error === 'string' ? error : 'Transcription failed. Please try again.'}</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {!selectedSource && interviews && interviews.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="mt-12"
                >
                  <h2 className="font-serif text-2xl mb-6">Recent Interviews</h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    {interviews.slice(0, 4).map((interview, i) => (
                      <motion.button
                        key={interview._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 + i * 0.1 }}
                        onClick={() => router.push(`/project/${currentProjectId}/interview/${interview._id}`)}
                        className="group p-5  bg-primary/5 rounded-xl border  hover:shadow-lg transition-all duration-200 text-left"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="w-10 h-10 rounded-lg bg-[var(--accent)] flex items-center justify-center">
                            <FileText className="w-5 h-5 text-[var(--primary)]" />
                          </div>
                          <Badge variant="secondary" className="text-xs">{interview.status}</Badge>
                        </div>
                        <h3 className="font-medium mb-1 group-hover:text-[var(--primary)] transition-colors">{interview.title}</h3>
                        <div className="flex items-center gap-4 text-sm text-[var(--muted-foreground)]">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {Math.floor(interview.duration / 60)}:{String(interview.duration % 60).padStart(2, '0')}
                          </span>
                          <span>{interview.segments?.length || 0} segments</span>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-background rounded-2xl border border-[var(--warm-border)] p-8"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <Check className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h2 className="font-serif text-2xl">Ready to Save</h2>
                  <p className="text-sm text-[var(--muted-foreground)]">{pendingInterview?.segments.length} segments transcribed</p>
                </div>
              </div>

              <div className="max-h-[400px] overflow-y-auto space-y-2 mb-6">
                {pendingInterview?.segments.map((segment, i) => (
                  <div key={i} className="p-3 bg-[var(--muted)] rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-[var(--muted-foreground)]">
                        {Math.floor(segment.start / 60)}:{Math.round(segment.start % 60).toString().padStart(2, '0')}
                      </span>
                      {segment.speaker && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--primary)]/10 text-[var(--primary)]">
                          {segment.speaker}
                        </span>
                      )}
                    </div>
                    <p className="text-sm">{segment.text}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleReset}
                  className="flex-1 px-6 py-3 border border-[var(--warm-border)] rounded-xl font-medium hover:bg-[var(--muted)] transition-colors"
                >
                  Start Over
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      Save Interview
                      <ChevronRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
      <GDPRConsent 
        operation="transcription" 
        onConsent={() => {
          setShowGDPRConsent(false);
          handleTranscribe();
        }}
      />
    </div>
  );
}

function Square({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="6" width="12" height="12" rx="1" />
    </svg>
  );
}
