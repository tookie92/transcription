"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Eye, Minimize2 } from "lucide-react";
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
  isFullscreen?: boolean;
}

export function PresentationOverlay({
  presentationState,
  groups,
  exitPresentationMode,
  nextGroup,
  prevGroup,
  toggleOverview,
  isFullscreen = false,
}: PresentationOverlayProps) {
  if (!presentationState.isActive) return null;

  const progress = groups.length > 0 
    ? ((presentationState.currentGroupIndex + 1) / groups.length) * 100 
    : 0;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* HEADER MINIMALISTE */}
      <div className="absolute top-0 left-0 right-0 bg-black/80 text-white p-4 flex flex-col gap-3">
        <div className="flex justify-between items-center">
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
          {/* INDICATEUR FULLSCREEN */}
          {isFullscreen && (
            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
              Plein écran
            </span>
          )}

          {/* INDICATEUR DE NAVIGATION */}
            <div className="flex items-center gap-2 text-sm opacity-80">
              <kbd className="px-2 py-1 bg-white/20 rounded text-xs">←→</kbd>
              <span>Naviguer</span>
              <kbd className="px-2 py-1 bg-white/20 rounded text-xs">Espace</kbd>
              <span>Suivant</span>
              <kbd className="px-2 py-1 bg-white/20 rounded text-xs">O</kbd>
              <span>Vue ensemble</span>
            </div>

            <Button
              onClick={exitPresentationMode}
              variant="outline"
              size="sm"
              className="bg-white/10 text-white border-white/20 hover:bg-white/20 pointer-events-auto"
            >
              <Minimize2 size={14} className="mr-2" />
              Quitter (ESC)
            </Button>
          </div>
        </div>

        {/* BARRE DE PROGRESSION */}
        <div className="w-full">
          <div className="h-1 bg-white/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          {/* INDICATEURS DE POSITION */}
          <div className="flex justify-between mt-1 text-xs text-white/50">
            {groups.map((group, idx) => (
              <div 
                key={group.id}
                className={`w-2 h-2 rounded-full transition-all duration-200 ${
                  idx <= presentationState.currentGroupIndex 
                    ? 'bg-blue-500' 
                    : 'bg-white/30'
                }`}
                title={group.title}
              />
            ))}
          </div>
        </div>
      </div>

      {/* CONTROLS DE NAVIGATION FLOATING AMÉLIORÉS */}
      {!presentationState.isOverview && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-4 pointer-events-auto">
          {/* GROUPE ACTUEL / TOTAL */}
          <div className="bg-black/70 text-white px-4 py-2 rounded-lg text-sm font-medium">
            {presentationState.currentGroupIndex + 1} → {groups.length}
          </div>

          {/* BOUTONS DE NAVIGATION PRINCIPAUX */}
          <div className="flex items-center gap-3 bg-black/80 rounded-full px-6 py-3 shadow-xl">
            <Button
              onClick={prevGroup}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 h-10 w-10 p-0"
              title="Précédent (Flèche gauche)"
            >
              <ChevronLeft size={24} />
            </Button>

            <div className="flex flex-col items-center px-4">
              <span className="text-white font-semibold text-lg">
                {presentationState.currentGroupIndex + 1}
              </span>
              <span className="text-white/50 text-xs">/ {groups.length}</span>
            </div>

            <Button
              onClick={nextGroup}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 h-10 w-10 p-0"
              title="Suivant (Flèche droite)"
            >
              <ChevronRight size={24} />
            </Button>

            <div className="w-px h-8 bg-white/20 mx-2" />

            <Button
              onClick={toggleOverview}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
              title="Vue d'ensemble (O)"
            >
              <Eye size={18} className="mr-2" />
              <span className="hidden sm:inline">Vue d&apos;ensemble</span>
            </Button>
          </div>

          {/* INDICATEUR DU TITRE DU GROUPE ACTUEL */}
          <div className="bg-black/60 text-white px-4 py-2 rounded-lg max-w-md">
            <span className="text-white/70">Groupe actuel: </span>
            <span className="font-medium">{groups[presentationState.currentGroupIndex]?.title}</span>
          </div>
        </div>
      )}

      {/* VUE D'ENSEMBLE - Contrôles simplifiés */}
      {presentationState.isOverview && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 pointer-events-auto">
          <div className="bg-black/70 text-white px-4 py-2 rounded-lg text-sm">
            Appuyez sur <kbd className="px-1.5 py-0.5 bg-white/20 rounded text-xs mx-1">→</kbd> ou <kbd className="px-1.5 py-0.5 bg-white/20 rounded text-xs mx-1">Espace</kbd> pour commencer la présentation
          </div>
        </div>
      )}
    </div>
  );
}
