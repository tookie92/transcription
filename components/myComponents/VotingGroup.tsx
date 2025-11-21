// components/VotingGroup.tsx - VERSION AVEC REORDER.GROUP

"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { DraggableDot } from "./DraggableDot";
import { AffinityGroup } from "@/types";
import { useAuth } from "@clerk/nextjs";
import { Id } from "@/convex/_generated/dataModel";
import { Plus } from "lucide-react";
import { Reorder } from "framer-motion";

interface VotingGroupProps {
  sessionId: string;
  group: AffinityGroup;
  isVotingPhase: boolean;
  onAddDot?: (position: { x: number; y: number }) => void;
}

export function VotingGroup({ sessionId, group, isVotingPhase, onAddDot }: VotingGroupProps) {
  const { userId } = useAuth();
  
  const dots = useQuery(api.dotVoting.getGroupDots, {
    sessionId: sessionId as Id<"dotVotingSessions">,
    groupId: group.id,
  });

  const handleGroupClick = (event: React.MouseEvent) => {
    if (!isVotingPhase || !onAddDot || !userId) return;
    
    const rect = event.currentTarget.getBoundingClientRect();
    const position = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    
    onAddDot(position);
  };

  // 🎯 FONCTION POUR METTRE À JOUR L'ORDRE DES DOTS
  const handleReorder = (newOrder: Id<"votes">[]) => {
    // Cette fonction peut être utilisée pour mettre à jour l'ordre des dots si nécessaire
    console.log("Dots reordered:", newOrder);
  };

  return (
    <div
      data-group-id={group.id}
      className={`
        relative min-h-[120px] p-4 border-2 rounded-lg transition-all
        ${isVotingPhase 
          ? 'cursor-crosshair hover:border-blue-300 hover:bg-blue-50' 
          : 'cursor-default'
        }
      `}
      style={{ 
        borderColor: group.color,
        backgroundColor: `${group.color}08`
      }}
      onClick={handleGroupClick}
    >
      {/* EN-TÊTE DU GROUPE */}
      <div className="flex items-center justify-between mb-2">
        <h3 
          className="font-semibold text-sm truncate"
          style={{ color: group.color }}
        >
          {group.title}
        </h3>
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
          {group.insightIds.length} insights
        </span>
      </div>

      {/* 🎯 ZONE DE DOTS AVEC REORDER.GROUP */}
      <div className="relative min-h-[80px]">
        <Reorder.Group 
          values={dots?.map(dot => dot._id) || []} 
          onReorder={handleReorder}
          className="relative w-full h-full"
        >
          {dots?.map((dot) => (
            <DraggableDot
              key={dot._id}
              vote={dot}
              groupId={group.id}
              isMyDot={dot.userId === userId}
            />
          ))}
        </Reorder.Group>
        
        {/* INDICATEUR AJOUT DE DOT */}
        {isVotingPhase && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
            <div className="flex items-center gap-2 text-blue-600 text-sm bg-white/90 px-3 py-2 rounded-full border border-blue-200">
              <Plus size={16} />
              <span>Click to add dot</span>
            </div>
          </div>
        )}
      </div>

      {/* COMPTEUR DE DOTS VISIBLES */}
      {dots && dots.length > 0 && (
        <div className="absolute bottom-2 right-2">
          <div className="text-xs bg-black/70 text-white px-2 py-1 rounded-full">
            {dots.filter(dot => dot.isVisible || dot.userId === userId).length} dots
          </div>
        </div>
      )}
    </div>
  );
}