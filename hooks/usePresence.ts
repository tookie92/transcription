"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useRef } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useThrottle } from "@/hooks/useThrottle";
import { Id } from "@/convex/_generated/dataModel";

export function usePresence(mapId: string) {
  const { userId } = useAuth();
  const {user} = useUser();
  const updatePresence = useMutation(api.presence.upsert);
  const removePresence = useMutation(api.presence.remove);

  const throttledUpdate = useThrottle((x: number, y: number, selection: string[]) => {
    updatePresence({
      mapId: mapId as Id<"affinityMaps">,
      userId: userId!,
      cursor: { x, y },
      selection,
      user: {
        id: userId!,
        name: user?.fullName || "Unknown",
        avatar: user?.imageUrl,
      },
    });
  }, 100);

  useEffect(() => {
    return () => {
      removePresence({
        mapId: mapId as Id<"affinityMaps">,
        userId: userId!,
      });
    };
  }, [mapId, userId]);

  return throttledUpdate;
}