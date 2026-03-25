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

  const hasValidMapId = !!mapId && mapId.length > 0;

  const throttledUpdate = useThrottle((x: number, y: number, selection: string[]) => {
    if (!hasValidMapId || !userId) return;
    const CURSOR_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6", "#3b82f6", "#8b5cf6", "#ec4899"];
    const cursorColor = CURSOR_COLORS[Math.floor(Math.random() * CURSOR_COLORS.length)];
    updatePresence({
      mapId: mapId as Id<"affinityMaps">,
      userId,
      cursor: { x, y },
      selection,
      user: {
        id: userId,
        name: user?.fullName || "Unknown",
        avatar: user?.imageUrl,
      },
      cursorColor,
    });
  }, 100);

  useEffect(() => {
    if (!hasValidMapId || !userId) return;
    return () => {
      removePresence({
        mapId: mapId as Id<"affinityMaps">,
        userId,
      });
    };
  }, [mapId, userId, hasValidMapId]);

  return throttledUpdate;
}