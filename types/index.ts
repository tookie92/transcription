// types/index.ts

import { Id } from "@/convex/_generated/dataModel";

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
  interviewId?: string; // ← Rendre optionnel
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
  title: string;
  color: string;
  position: { x: number; y: number };
  insightIds: Id<"insights">[];
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

// Convex-specific types
export interface ConvexInsight {
  _id: string;
  interviewId?: string; // ← Rendre optionnel ici aussi
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


// Ajoute/Corrige ces interfaces
export interface AffinityGroup {
  id: string;
  title: string;  // ← Doit être 'title' pas 'name'
  color: string;
  position: { x: number; y: number };
  insightIds: Id<"insights">[];
}

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

// Pour Convex
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

// 🆕 TYPES POUR LES CONNECTIONS (version unifiée)
export interface GroupConnection {
  id: Id<"groupConnections">;
  sourceGroupId: string;
  targetGroupId: string;
  type: 'related' | 'hierarchy' | 'dependency' | 'contradiction';
  label?: string;
  strength?: number;
}

// Pour Convex
export interface ConvexGroupConnection {
  _id: Id<"groupConnections">;
  mapId: Id<"affinityMaps">;
  sourceGroupId: string;
  targetGroupId: string;
  type: 'related' | 'hierarchy' | 'dependency' | 'contradiction';
  label?: string;
  strength?: number;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

