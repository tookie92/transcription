// types/index.ts

// Transcription types
export interface TranscriptionSegment {
  id: number;
  seek: number;
  start: number;
  end: number;
  text: string;
  tokens: number[];
  temperature: number;
  avg_logprob: number;
  compression_ratio: number;
  no_speech_prob: number;
}

export interface SimpleSegment {
  id: number;
  start: number;
  end: number;
  text: string;
}

// Project types
export interface Project {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  createdAt: number;
  updatedAt: number;
  isPublic: boolean;
  members: ProjectMember[];
}

export interface ProjectMember {
  userId: string;
  role: 'owner' | 'editor' | 'viewer';
  joinedAt: number;
}

// Interview types
export interface Interview {
  id: string;
  projectId: string;
  title: string;
  topic?: string;
  transcription: string;
  segments: SimpleSegment[];
  duration: number;
  insights: Insight[];
  isAnalyzing?: boolean;
  createdAt: string;
  status: 'uploading' | 'transcribing' | 'completed' | 'analyzing' | 'ready';
}

// Insight types
export interface Insight {
  id: string;
  interviewId: string;
  projectId: string;
  type: 'pain-point' | 'quote' | 'insight' | 'follow-up' | 'custom';
  text: string;
  timestamp: number;
  source: 'ai' | 'manual';
  createdBy: string;
  createdAt: string;
  tags?: string[];
  priority?: 'low' | 'medium' | 'high';
}

// Affinity Map types
export interface AffinityMap {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  version: number;
  isCurrent: boolean;
  groups: AffinityGroup[];
  createdAt: number;
  updatedAt: number;
  createdBy: string;
}

export interface AffinityGroup {
  id: string;
  name: string;
  color: string;
  position: { x: number; y: number };
  insightIds: string[];
}

// API Request/Response types
export interface VerboseTranscription {
  text: string;
  task: string;
  language: string;
  duration: number;
  segments: TranscriptionSegment[];
}

export interface AnalysisRequest {
  transcription: string;
  topic?: string;
  segments?: SimpleSegment[];
}

export interface AnalysisResponse {
  insights: Insight[];
  count: number;
}

export interface InsightResponse {
  type: 'pain-point' | 'quote' | 'insight' | 'follow-up';
  text: string;
  timestamp: number;
}

// Store types (pour compatibilité avec ton store existant)
export interface StoreInterview {
  id: string;
  title: string;
  topic?: string;
  transcription: string;
  segments: SimpleSegment[];
  duration: number;
  insights: StoreInsight[];
  isAnalyzing?: boolean;
  createdAt: string;
}

export interface StoreInsight {
  id: string;
  type: 'pain-point' | 'quote' | 'insight' | 'follow-up';
  text: string;
  timestamp: number;
  segmentId?: number;
  createdAt: string;
}

// Convex-specific types
export interface ConvexProject {
  _id: string;
  name: string;
  description?: string;
  ownerId: string;
  createdAt: number;
  updatedAt: number;
  isPublic: boolean;
  members: ProjectMember[];
}

export interface ConvexInterview {
  _id: string;
  projectId: string;
  title: string;
  topic?: string;
  transcription: string;
  segments: SimpleSegment[];
  duration: number;
  status: 'uploading' | 'transcribing' | 'completed' | 'analyzing' | 'ready';
  createdAt: number;
}

export interface ConvexInsight {
  _id: string;
  interviewId: string;
  projectId: string;
  type: 'pain-point' | 'quote' | 'insight' | 'follow-up' | 'custom';
  text: string;
  timestamp: number;
  source: 'ai' | 'manual';
  createdBy: string;
  createdAt: number;
  tags?: string[];
  priority?: 'low' | 'medium' | 'high';
}

export interface ConvexAffinityMap {
  _id: string;
  projectId: string;
  name: string;
  description?: string;
  version: number;
  isCurrent: boolean;
  groups: AffinityGroup[];
  createdAt: number;
  updatedAt: number;
  createdBy: string;
}

// Ajoute cette interface pour l'export
export interface ExportInterview {
  id: string;
  title: string;
  topic?: string;
  transcription: string;
  segments: SimpleSegment[];
  duration: number;
  insights: ExportInsight[];
  isAnalyzing?: boolean;
  createdAt: string;
}

export interface ExportInsight {
  id: string;
  type: 'pain-point' | 'quote' | 'insight' | 'follow-up' | 'custom';
  text: string;
  timestamp: number;
  segmentId?: number;
  createdAt: string;
}