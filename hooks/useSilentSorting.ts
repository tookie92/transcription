// hooks/useSilentSorting.ts
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export function useSilentSorting(mapId: string) {
  const activeSession = useQuery(api.silentSorting.getActiveSilentSorting, {
    mapId: mapId as Id<"affinityMaps">
  });

  const isSilentSortingActive = Boolean(activeSession && activeSession.isActive);
  const groupTimeLeft = activeSession ? Math.max(0, Math.floor((activeSession.endTime - Date.now()) / 1000)) : 0;
  
  // 🎯 TIMER PERSONNEL (commence après le timer de groupe)
  const personalTimeLeft = Math.max(0, groupTimeLeft - (15 * 60)); // 15min de groupe

  return {
    isSilentSortingActive,
    activeSession,
    groupTimeLeft,
    personalTimeLeft,
    currentPhase: groupTimeLeft > 0 ? 'group-sorting' : personalTimeLeft > 0 ? 'personal-review' : 'discussion'
  };
}