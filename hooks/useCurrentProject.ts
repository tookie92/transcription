import { create } from 'zustand';

interface CurrentProjectState {
  currentProjectId: string | null;
  currentInterviewId: string | null; // ← NOUVEAU
  setCurrentProject: (projectId: string | null) => void;
  setCurrentInterview: (interviewId: string | null) => void; // ← NOUVEAU
}

export const useCurrentProject = create<CurrentProjectState>((set) => ({
  currentProjectId: null,
  currentInterviewId: null, // ← NOUVEAU
  setCurrentProject: (projectId) => set({ 
    currentProjectId: projectId,
    currentInterviewId: null // ← Reset l'interview quand on change de projet
  }),
  setCurrentInterview: (interviewId) => set({ currentInterviewId: interviewId }),
}));