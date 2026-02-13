"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { AffinityGroup as AffinityGroupType } from "@/types";

interface PresentationState {
  isActive: boolean;
  currentGroupIndex: number;
  isOverview: boolean;
}

interface PresentationOverlayProps {
  presentationState: PresentationState;
  groups: AffinityGroupType[];
  exitPresentationMode: () => void;
  nextGroup: () => void;
  prevGroup: () => void;
  toggleOverview: () => void;
}

export function PresentationOverlay({
  presentationState,
  groups,
  exitPresentationMode,
  nextGroup,
  prevGroup,
  toggleOverview,
}: PresentationOverlayProps) {
  if (!presentationState.isActive) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* HEADER MINIMALISTE */}
      <div className="absolute top-0 left-0 right-0 bg-black/80 text-white p-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="bg-blue-500 px-3 py-1 rounded-full text-sm font-medium">
            Mode Présentation
          </div>
          <span className="text-sm opacity-80">
            {presentationState.isOverview
              ? "Vue d'ensemble"
              : `Groupe ${presentationState.currentGroupIndex + 1}/${groups.length}`}
          </span>
          {!presentationState.isOverview && (
            <span className="text-sm font-medium">
              {groups[presentationState.currentGroupIndex]?.title}
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* INDICATEUR DE NAVIGATION */}
          <div className="flex items-center gap-2 text-sm opacity-80">
            <kbd className="px-2 py-1 bg-white/20 rounded text-xs">←→</kbd>
            <span>Naviguer</span>
            <kbd className="px-2 py-1 bg-white/20 rounded text-xs">Espace</kbd>
            <span>Suivant</span>
            <kbd className="px-2 py-1 bg-white/20 rounded text-xs">ESC</kbd>
            <span>Quitter</span>
          </div>

          <Button
            onClick={exitPresentationMode}
            variant="outline"
            size="sm"
            className="bg-white/10 text-white border-white/20 hover:bg-white/20 pointer-events-auto"
          >
            Quitter (ESC)
          </Button>
        </div>
      </div>

      {/* CONTROLS DE NAVIGATION FLOATING */}
      {!presentationState.isOverview && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center gap-4 bg-black/70 rounded-full px-6 py-3 pointer-events-auto">
          <Button
            onClick={prevGroup}
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20"
          >
            <ChevronLeft size={20} />
          </Button>

          <span className="text-white text-sm mx-4">
            {presentationState.currentGroupIndex + 1} / {groups.length}
          </span>

          <Button
            onClick={nextGroup}
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20"
          >
            <ChevronRight size={20} />
          </Button>

          <Button
            onClick={toggleOverview}
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20 ml-4"
          >
            <Eye size={16} className="mr-2" />
            Vue d{"'"}ensemble
          </Button>
        </div>
      )}
    </div>
  );
}
