// hooks/useCanvasShortcuts.ts - VERSION CORRIGÉE
"use client";

import { on } from "events";
import { useCallback, useEffect } from "react";

interface CanvasShortcutsConfig {
  onNewGroup: () => void;
  onSelectAll: () => void;
  onDeleteSelected: () => void;
  onEscape: () => void;
  onArrowMove: (direction: 'up' | 'down' | 'left' | 'right', shiftKey: boolean) => void;
  onUndo: () => void;
  onRedo: () => void;
  onToggleVotingPanel?: () => void; // 🆕 AJOUT
  onToggleAnalyticsPanel?: () => void; // 🆕 AJOUT
  onTogglePersonaPanel?: () => void; // 🆕 AJOUT
  onToggleThemeDiscoveryPanel?: () => void; // 🆕 AJOUT
  onToggleActivityPanel?: () => void; // 🆕 AJOUT
  onToggleExportPanel?: () => void; // 🆕 AJOUT
  selectedGroups: Set<string>;
}

export function useCanvasShortcuts(config: CanvasShortcutsConfig) {
  const { 
    onNewGroup, 
    onSelectAll, 
    onDeleteSelected, 
    onEscape, 
    onArrowMove, 
    onUndo, 
    onRedo,
    onToggleVotingPanel, // 🆕 AJOUT
    onToggleAnalyticsPanel, // 🆕 AJOUT
    onTogglePersonaPanel, // 🆕 AJOUT
    onToggleThemeDiscoveryPanel, // 🆕 AJOUT
    onToggleExportPanel,
    selectedGroups 
  } = config;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ignorer si on tape dans un input
    // if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
    //   return;
    // }

       // 🆕 IGNORER COMPLÈTEMENT SI C'EST UN INPUT/ TEXTAREA
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    ) {
      return; // Laisser toutes les touches fonctionner normalement dans les inputs
    }





    // 🛑 EMPÊCHER le comportement par défaut pour les autres raccourcis
    if (
      e.key === 'n' ||
      (e.ctrlKey || e.metaKey) && e.key === 'a' ||
      e.key === 'Delete' ||
      e.key === 'Backspace' ||
      e.key === 'Escape' ||
      ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)
    ) {
      e.preventDefault();
      e.stopPropagation();
    }

    // 🎯 TOUCHE N - Créer groupe
    if (e.key === 'n' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      onNewGroup();
      return;
    }

    // 🎯 MOUVEMENT AVEC FLÈCHES
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      e.stopPropagation();
      
      if (selectedGroups.size > 0) {
        const direction = e.key.replace('Arrow', '').toLowerCase() as 'up' | 'down' | 'left' | 'right';
        onArrowMove(direction, e.shiftKey);
      }
      return;
    }

    // 🎯 SÉLECTION (Ctrl/Cmd + A)
    if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
      onSelectAll();
      return;
    }


    // 🎯 SUPPRESSION (Delete/Backspace)
    if (e.key === 'Delete' || e.key === 'Backspace') {
      onDeleteSelected();
      return;
    }

    // 🎯 ÉCHAP - ANNULER SÉLECTION
    if (e.key === 'Escape') {
      onEscape();
      return;
    }

        // 🎯 UNDO (Ctrl+Z)
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      onUndo();
      return;
    }

      // 🎯 REDO (Ctrl+Y ou Ctrl+Shift+Z)
    if (((e.ctrlKey || e.metaKey) && e.key === 'y') || 
        ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey)) {
      e.preventDefault();
      e.stopPropagation();
      onRedo();
      return;
    } 


  // 🆕 RACCOURCI POUR VOTING PANEL (V)
    if (e.key === 'v' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      e.stopPropagation();
      onToggleVotingPanel?.();
      return;
    }

 // 🆕 RACCOURCI POUR ANALYTICS PANEL (A)
    if (e.key === 'a' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      e.stopPropagation();
      onToggleAnalyticsPanel?.();
      return;
    }

 // 🆕 RACCOURCI POUR PERSONA PANEL (P)
    if (e.key === 'p' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      e.stopPropagation();
      onTogglePersonaPanel?.();
      return;
    }

 // 🆕 RACCOURCI POUR Theme Discovery PANEL (T)
    if (e.key === 't' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      e.stopPropagation();
      onToggleThemeDiscoveryPanel?.();
      return;
    }

    // 🆕 RACCOURCI POUR PRESENTATION MODE (CTRL+P)
    if((e.ctrlKey || e.metaKey) && e.key === 'e'){
      e.preventDefault();
      e.stopPropagation();
      onToggleExportPanel?.();
      return;
    }


  }, [onNewGroup, onSelectAll, onDeleteSelected, onEscape, onArrowMove, onUndo, onRedo,onToggleAnalyticsPanel, onToggleVotingPanel, selectedGroups]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}