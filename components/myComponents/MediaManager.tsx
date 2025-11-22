"use client";

import React, { useState, useRef } from 'react';
import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { useTranscription } from '@/hooks/useTranscription';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useCurrentProject } from '@/hooks/useCurrentProject';
import { Upload, Loader2, FolderOpen } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Id } from '@/convex/_generated/dataModel';

import { toast } from "sonner"; 

function MediaManager() {
  const { transcribe, isTranscribing, error } = useTranscription();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [topic, setTopic] = useState('');
  const [title, setTitle] = useState('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // const [recentlyCreated, setRecentlyCreated] = useState(false);

  // Convex
  const createInterview = useMutation(api.interviews.createInterview);
  const projects = useQuery(api.projects.getUserProjects);
  const { currentProjectId, setCurrentProject } = useCurrentProject();

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
  if (!selectedFile || !currentProjectId) return;

  const toastId = toast.loading("Transcribing audio...");

  try {
    const interviewTitle = title || `Interview ${new Date().toLocaleDateString()}`;
    
    const interview = await transcribe(selectedFile, interviewTitle, topic || undefined);
    
    const convexSegments = interview.segments.map(segment => ({
      id: segment.id,
      start: segment.start,
      end: segment.end,
      text: segment.text,
    }));

    toast.loading("Saving interview to project...", { id: toastId });

    await createInterview({
      projectId: currentProjectId as Id<"projects">,
      title: interview.title,
      topic: interview.topic,
      transcription: interview.transcription,
      segments: convexSegments,
      duration: interview.duration,
    });

    // ✅ SUPPRIME LA REDIRECTION - Garde l'user sur place
    toast.success("Interview created successfully!", { 
      id: toastId,
      duration: 3000,
    });

    // Reset le formulaire MAIS garde l'audio pour référence
    // handleReset(); ← On ne reset plus automatiquement
    
    toast.success("Interview ready! You can now analyze it.", {
      id: toastId,
      duration: 3000,
    });

    // Reset le formulaire mais garde un bouton de navigation
    handleReset();
    
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Transcription failed";
    toast.error(`Transcription failed: ${errorMessage}`, { 
      id: toastId,
      duration: 4000,
    });
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

  // Si pas de projets, afficher un message
  if (projects && projects.length === 0) {
    return (
      <Card className="bg-white rounded-2xl shadow-lg p-8 w-1/2">
        <CardContent className="text-center py-12">
          <FolderOpen className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold mb-2">No Projects Yet</h3>
          <p className="text-gray-500 mb-4">
            Create a project first to start transcribing interviews
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white rounded-2xl shadow-lg p-8 w-1/2">
      <CardContent className="space-y-6">
        {/* Project Selection
        <div className="space-y-2">
          <Label htmlFor="project">Select Project</Label>
          <Select value={currentProjectId || ""} onValueChange={setCurrentProject}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a project" />
            </SelectTrigger>
            <SelectContent>
              {projects?.map((project) => (
                <SelectItem key={project._id} value={project._id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div> */}

        {/* Rest of your existing MediaManager code */}
        {audioUrl ? (
          <div className="space-y-4">
            <audio controls className="w-full" src={audioUrl}>
              Your browser does not support the audio element.
            </audio>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm">
              <Upload className="w-4 h-4" />
              Audio Source
            </div>

            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="title">Interview Title (optional)</Label>
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
                <Label htmlFor="topic">Interview Topic</Label>
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

            <div className="flex gap-3 pt-2">
              <Button 
                onClick={handleTranscribe}
                disabled={isTranscribing || !currentProjectId}
                className="flex-1 bg-black hover:bg-gray-800"
              >
                {isTranscribing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Transcribing...
                  </>
                ) : (
                  'Transcribe & Save'
                )}
              </Button>
              {/* À la place du bouton Reset simple */}
              
               
                <Button
                  onClick={handleReset}
                  variant="outline"
                >
                  New Interview
                </Button>

                
            </div>
          </div>
        ) : (
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
              disabled={!currentProjectId}
            >
              <Upload className="w-5 h-5 mr-2" />
              {currentProjectId ? 'Upload your conversation' : 'Select a project first'}
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