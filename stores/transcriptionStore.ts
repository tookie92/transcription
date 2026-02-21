import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export interface TranscriptionSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  speaker?: string;
}

export interface Interview {
  id: string;
  title: string;
  topic?: string;
  transcription: string;
  segments: TranscriptionSegment[];
  duration: number;
  insights: Insight[];
  isAnalyzing?: boolean;
  createdAt: string;
  audioUrl?: string;
}

export interface Insight {
  id: string;
  type: 'pain-point' | 'quote' | 'insight' | 'follow-up';
  text: string;
  timestamp: number;
  segmentId?: number;
  createdAt: string;
}

interface TranscriptionStore {
  // Current transcription state
  isTranscribing: boolean;
  currentFile: File | null;
  transcriptionError: string | null;
  currentTranscript: string;
  
  // Interviews
  interviews: Interview[];
  currentInterview: Interview | null;
  
  // Actions
  setIsTranscribing: (isTranscribing: boolean) => void;
  setCurrentFile: (file: File | null) => void;
  setTranscriptionError: (error: string | null) => void;
  setCurrentTranscript: (transcript: string) => void;
  
  addInterview: (interview: Interview) => void;
  updateInterview: (id: string, updates: Partial<Interview>) => void;
  deleteInterview: (id: string) => void;
  setCurrentInterview: (interview: Interview | null) => void;
  
  addInsight: (interviewId: string, insight: Insight) => void;
  updateInsight: (interviewId: string, insightId: string, updates: Partial<Insight>) => void;
  deleteInsight: (interviewId: string, insightId: string) => void;
  
  // Clear all data
  clearAll: () => void;
}

export const useTranscriptionStore = create<TranscriptionStore>()(
  devtools(
    persist(
      (set) => ({
        // Initial state
        isTranscribing: false,
        currentFile: null,
        transcriptionError: null,
        currentTranscript: "",
        interviews: [],
        currentInterview: null,

        // Actions
        setIsTranscribing: (isTranscribing) => set({ isTranscribing }),
        setCurrentFile: (file) => set({ currentFile: file }),
        setTranscriptionError: (error) => set({ transcriptionError: error }),
        setCurrentTranscript: (transcript) => set({ currentTranscript: transcript }),

        addInterview: (interview) =>
          set((state) => ({
            interviews: [interview, ...state.interviews],
            currentInterview: interview,
          })),

        updateInterview: (id, updates) =>
          set((state) => ({
            interviews: state.interviews.map((interview) =>
              interview.id === id ? { ...interview, ...updates } : interview
            ),
            currentInterview:
              state.currentInterview?.id === id
                ? { ...state.currentInterview, ...updates }
                : state.currentInterview,
          })),

        deleteInterview: (id) =>
          set((state) => ({
            interviews: state.interviews.filter((interview) => interview.id !== id),
            currentInterview:
              state.currentInterview?.id === id ? null : state.currentInterview,
          })),

        setCurrentInterview: (interview) => set({ currentInterview: interview }),

        addInsight: (interviewId, insight) =>
          set((state) => ({
            interviews: state.interviews.map((interview) =>
              interview.id === interviewId
                ? { ...interview, insights: [...interview.insights, insight] }
                : interview
            ),
            currentInterview:
              state.currentInterview?.id === interviewId
                ? {
                    ...state.currentInterview,
                    insights: [...state.currentInterview.insights, insight],
                  }
                : state.currentInterview,
          })),

        updateInsight: (interviewId, insightId, updates) =>
          set((state) => ({
            interviews: state.interviews.map((interview) =>
              interview.id === interviewId
                ? {
                    ...interview,
                    insights: interview.insights.map((insight) =>
                      insight.id === insightId ? { ...insight, ...updates } : insight
                    ),
                  }
                : interview
            ),
          })),

        deleteInsight: (interviewId, insightId) =>
          set((state) => ({
            interviews: state.interviews.map((interview) =>
              interview.id === interviewId
                ? {
                    ...interview,
                    insights: interview.insights.filter(
                      (insight) => insight.id !== insightId
                    ),
                  }
                : interview
            ),
          })),

        clearAll: () =>
          set({
            interviews: [],
            currentInterview: null,
            isTranscribing: false,
            currentFile: null,
            transcriptionError: null,
            currentTranscript: "",
          }),
      }),
      {
        name: 'transcription-storage',
        partialize: (state) => ({
          interviews: state.interviews,
        }),
      }
    )
  )
);