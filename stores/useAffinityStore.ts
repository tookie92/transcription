// stores/affinityStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AffinityState {
  // 🆕 Positions optimistes des groupes
  optimisticPositions: Map<string, { x: number; y: number }>;
  
  // Actions
  setOptimisticPosition: (groupId: string, position: { x: number; y: number }) => void;
  removeOptimisticPosition: (groupId: string) => void;
  clearOptimisticPositions: () => void;
  getOptimisticPosition: (groupId: string) => { x: number; y: number } | undefined;
}

export const useAffinityStore = create<AffinityState>()(
  persist(
    (set, get) => ({
      // État initial
      optimisticPositions: new Map(),
      
      // Actions
      setOptimisticPosition: (groupId, position) => {
        set((state) => {
          const newPositions = new Map(state.optimisticPositions);
          newPositions.set(groupId, position);
          return { optimisticPositions: newPositions };
        });
      },
      
      removeOptimisticPosition: (groupId) => {
        set((state) => {
          const newPositions = new Map(state.optimisticPositions);
          newPositions.delete(groupId);
          return { optimisticPositions: newPositions };
        });
      },
      
      clearOptimisticPositions: () => {
        set({ optimisticPositions: new Map() });
      },
      
      getOptimisticPosition: (groupId) => {
        return get().optimisticPositions.get(groupId);
      },
    }),
    {
      name: 'affinity-positions-storage',
      // 🆕 Ne pas persister en localStorage pour éviter les conflits
      skipHydration: true,
    }
  )
);