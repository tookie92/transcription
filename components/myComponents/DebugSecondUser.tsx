"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@clerk/nextjs";
import { useEffect } from "react";
import { Id } from "@/convex/_generated/dataModel";

export function DebugSecondUser({ mapId }: { mapId: string }) {
  const { userId } = useAuth();
  console.log("🧪 userId au montage :", userId);

  const upsertPresence = useMutation(api.presence.upsert);


console.log("> useEffect exécuté — fake user va être créé");

  useEffect(() => {
    if (!userId) return;

    const fakeUser = {
      id: "fake-user-123",
      name: "Fake Collaborator",
      avatar: undefined,
    };

    let x = 100;
    let y = 100;
    let dx = 2;
    let dy = 2;

    console.log("🧪 setInterval va démarrer...");


    const interval = setInterval(() => {
      x += dx;
      y += dy;
      if (x > 800 || x < 100) dx *= -1;
      if (y > 600 || y < 100) dy *= -1;

      
  // console.log("📡 upsertPresence appelé avec :", { x, y }); // ✅ AJOUTE CECI

   (async () => {
    try {
      await upsertPresence({
        mapId: mapId as Id<"affinityMaps">,
        userId: fakeUser.id,
        cursor: { x, y },
        selection: [],
        user: fakeUser,
      });
      console.log("✅ upsertPresence réussi");
    } catch (error) {
      console.error("❌ upsertPresence échoué :", error);
    }
  })();
}, 200);

    return () => {
      clearInterval(interval);
    };
  }, [mapId, upsertPresence, userId]);

  return null;
}