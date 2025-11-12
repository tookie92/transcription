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
  interviewId?: string;
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

// Affinity Map types - SIMPLIFIÉS
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

// Store types
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
  _creationTime: number;
  name: string;
  description?: string;
  ownerId: string;
  isPublic: boolean;
  members: ProjectMember[];
  createdAt: number;
  updatedAt: number;
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
  interviewId?: string;
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

// Export types
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

export interface HistoryState {
  groups: AffinityGroup[];
  insights: Insight[];
  timestamp: number;
  action: string;
  description: string;
}

export interface HistoryActions {
  pushState: (groups: AffinityGroup[], action: string, description: string) => void;
  undo: () => AffinityGroup[] | null;
  redo: () => AffinityGroup[] | null;
  canUndo: boolean;
  canRedo: boolean;
  clear: () => void;
}

// dotVotingSessions

export interface DotVotingSession {
  _id: string;
  projectId: string;
  mapId: string;
  name: string;
  maxVotesPerUser: number;
  isActive: boolean;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface Vote {
  _id: string;
  sessionId: string;
  userId: string;
  groupId: string;
  votes: number;
  createdAt: number;
}

export interface GroupVoteSummary {
  groupId: string;
  totalVotes: number;
  userVotes: number;
  group: AffinityGroup;
}

//
// types/index.ts - AJOUTER CES TYPES

export type ThemeType = 'hierarchical' | 'related' | 'contradictory' | 'complementary';

export interface DetectedTheme {
  id: string;
  name: string;
  type: ThemeType;
  confidence: number;
  groupIds: string[];
  description: string;
  parentThemeId?: string;
  insightsCount: number;
}

export interface ThemeAnalysis {
  themes: DetectedTheme[];
  summary: {
    totalThemes: number;
    coverage: number; // % de groupes couverts par les thèmes
    avgConfidence: number;
    mainTheme?: DetectedTheme;
  };
  recommendations: ThemeRecommendation[];
}

// types/index.ts - METTRE À JOUR ThemeRecommendation
export interface ThemeRecommendation {
  type: 'merge' | 'split' | 'reorganize' | 'create_parent';
  groups: string[];
  reason: string;
  confidence: number;
  expectedImpact: 'high' | 'medium' | 'low';
  suggestedName?: string; // 🆕 OPTIONNEL - pour les noms suggérés
}