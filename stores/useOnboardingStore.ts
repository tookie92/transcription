import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface OnboardingState {
  hasSeenTour: boolean;
  currentStep: number;
  tourCompleted: boolean;
  setHasSeenTour: (seen: boolean) => void;
  setCurrentStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  completeTour: () => void;
  resetTour: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      hasSeenTour: false,
      currentStep: 0,
      tourCompleted: false,
      setHasSeenTour: (seen) => set({ hasSeenTour: seen }),
      setCurrentStep: (step) => set({ currentStep: step }),
      nextStep: () => set((state) => ({ currentStep: state.currentStep + 1 })),
      prevStep: () => set((state) => ({ currentStep: Math.max(0, state.currentStep - 1) })),
      completeTour: () => set({ tourCompleted: true, hasSeenTour: true, currentStep: 0 }),
      resetTour: () => set({ hasSeenTour: false, tourCompleted: false, currentStep: 0 }),
    }),
    {
      name: 'skripta-onboarding',
    }
  )
);

export const ONBOARDING_STEPS = [
  {
    target: 'toolbar',
    title: 'Toolbar',
    content: 'Use these tools to navigate the canvas, add insights, and access AI features.',
    position: 'bottom' as const,
  },
  {
    target: 'insights-panel',
    title: 'Ungrouped Insights',
    content: 'All your transcribed insights appear here. Drag them to create groups.',
    position: 'right' as const,
  },
  {
    target: 'groups',
    title: 'Affinity Groups',
    content: 'Create groups by dragging insights here. Use AI to auto-group them!',
    position: 'left' as const,
  },
  {
    target: 'dot-voting',
    title: 'Dot Voting',
    content: 'Click the voting icon to start a dot voting session with your team.',
    position: 'bottom' as const,
  },
  {
    target: 'collaboration',
    title: 'Real-time Collaboration',
    content: 'See your team members\' cursors and activity in real-time.',
    position: 'top' as const,
  },
];
