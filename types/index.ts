// types/index.ts

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

export interface Insight {
  id: string;
  type: 'pain-point' | 'quote' | 'insight' | 'follow-up';
  text: string;
  timestamp: number;
  segmentId?: number;
  createdAt: string;
}

export interface Interview {
  id: string;
  title: string;
  topic?: string;
  transcription: string;
  segments: SimpleSegment[];
  duration: number;
  insights: Insight[];
  isAnalyzing?: boolean;
  createdAt: string;
  audioUrl?: string;
}

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